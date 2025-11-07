// conciliacion.ts
const fs = require("fs");
const path = require("path");
const moment = require("moment");
const { pool } = require("../conexion/conexcion");

const DIR_CONCILIACIONES = path.join(__dirname, "../conciliaciones");

/** Asegura carpeta destino */
function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

/** Limpia texto para archivo pipe-delimited */
function sanitize(v) {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return s.replace(/\|/g, "/").replace(/[\r\n]+/g, " ").trim();
}

/** Convierte a número con 2 decimales (punto) */
function money(v) {
  const n = Number(v || 0);
  return n.toFixed(2);
}

const generarArchivoConciliacion = async (idInstitucion, idToken) => {
  try {
    ensureDir(DIR_CONCILIACIONES);

    const now = moment();
    const nombreArchivo = `${idInstitucion}_${now.format("YYYYMMDD_HHmmss")}.txt`;
    const rutaArchivo = path.join(DIR_CONCILIACIONES, nombreArchivo);

    const [registros] = await pool.query(`
      SELECT *
      FROM conciliacion_pagos
      WHERE idToken = ?
      ORDER BY creado_en ASC
    `, [idToken]);

    // @ts-ignore – registros es RowDataPacket[]
    const lineas = registros.map((reg) => {
      const cols = [
        moment(reg.fecha_transaccion).isValid()
          ? moment(reg.fecha_transaccion).format("DD/MM/YYYY")
          : "",
        moment(reg.fecha_contable).isValid()
          ? moment(reg.fecha_contable).format("DD/MM/YYYY")
          : "",
        sanitize(reg.hora_transaccion),
        sanitize(reg.cliente_nombre),
        sanitize(reg.cliente_id),
        sanitize(reg.cuenta_cliente),
        sanitize(reg.codigo_operacion),
        sanitize(reg.agencia),
        sanitize(reg.terminal),
        sanitize(reg.operador),
        sanitize(reg.codigo_activa),
        sanitize(reg.codigo_secuencial),
        sanitize(reg.concepto_pago),
        money(reg.valor),
        sanitize(reg.estado),
        sanitize(reg.canal),
      ];
      return cols.join("|");
    });

    // Windows-friendly endings
    const contenido = lineas.join("\r\n");
    fs.writeFileSync(rutaArchivo, contenido, { encoding: "utf8" });

    console.log(`✅ Archivo generado: ${rutaArchivo}`);
    return { rutaArchivo, nombreArchivo };
  } catch (error) {
    console.error("❌ Error generando archivo de conciliación:", error);
    throw error;
  }
};

module.exports = { generarArchivoConciliacion };
