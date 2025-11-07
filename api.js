const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const {
  ConsultarNombreCliente,
  Validaciones,
  RealizarPago,
  ReversoPago,
} = require("./consultas");
const { pool } = require("./conexion/conexcion");
const { generarArchivoConciliacion } = require("./utils/conciliacionExport");
const { guardarLogAPI } = require("./utils/logs");

const app = express();

app.use(cors());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

require("dotenv").config(); // asegúrate de tener dotenv configurado

let WHITELIST_IPS = [];

// Función para cargar IPs desde la BD
async function cargarWhitelistIPs() {
  try {
    const [rows] = await pool.query(
      "SELECT whitelist_ips FROM ip_address WHERE is_estado = 1"
    );
    console.log("Cargando IPs permitidas desde la base de datos...");
    WHITELIST_IPS = rows.map((row) => row.whitelist_ips.trim());
    //console.log("✅ Lista blanca actualizada:", WHITELIST_IPS);
  } catch (error) {
    console.error("❌ Error al cargar IPs permitidas:", error);
  }
}

// Paso 2: Middleware de validación de IP
const validarIP = (req, res, next) => {
  let ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "";
  ip = ip.replace("::ffff:", "").trim(); // Limpia prefijos IPv6 comunes

  console.log(`🔐 Verificando IP: ${ip}`);

  if (WHITELIST_IPS.includes(ip)) {
    return next();
  }

  console.warn(`❌ IP bloqueada: ${ip}`);
  return res.status(403).json({ error: "Acceso no autorizado desde esta IP" });
};

const validarToken = async (req, res, next) => {
  const token = req.headers["authorization"]?.replace("Bearer ", "").trim();

  if (!token) {
    return res.status(401).json({ error: "Token no proporcionado" });
  }

  try {
    const [rows] = await pool.query("SELECT * FROM api_token WHERE token = ? AND is_active = 1",[token]);
    if (rows.length === 0) {
      return res.status(403).json({ error: "Token inválido o inactivo" });
    }
    const [tokenSystema] = await pool.query("SELECT * FROM token_systema WHERE idToken = ?", [rows[0].id]);
    if (tokenSystema.length === 0) {
      return res.status(403).json({ error: "Token de sistema no encontrado" });
    }
    // Puedes guardar datos del token en req si es necesario
    req.body = { ...req.body, tokenData: rows[0], tokenSystema: tokenSystema[0].token, pasarela: tokenSystema[0].recaudador };
    next();
  } catch (error) {
    console.error("❌ Error al validar token:", error);
    return res.status(500).json({ error: "Error interno al validar token" });
  }
};

const validarIPyToken = [validarIP, validarToken];

app.post("/consultar", validarIPyToken, async (req, res) => {
  // ontner la ip del cliente que hace la peticion
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  const token = req.headers["authorization"]?.replace("Bearer ", "").trim();
  console.log(`Petición recibida desde la IP: ${ip}`);
  console.log(`Hora de la peticion: ${new Date().toLocaleString()}`);
  const { Cod_Obligacion, tokenSystema } = req.body;
  const cliente = await ConsultarNombreCliente(Cod_Obligacion, tokenSystema);
  const validacion = Validaciones(cliente, Cod_Obligacion);
  // Guardar log
  await guardarLogAPI("/consultar", ip, token, req.body, validacion, validacion.Metodo_de_ConsultaResult.Codigo_Respuesta);
  res.json(validacion);
});

app.post("/metodoPago", validarIPyToken, async (req, res) => {
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  const token = req.headers["authorization"]?.replace("Bearer ", "").trim();

  console.log(`Petición recibida desde la IP: ${ip}`);
  console.log(`Hora de la peticion: ${new Date().toLocaleString()}`);
  const { Cod_Obligacion, ID_Secuencia, Monto_1, Monto_2, Items, tokenData, tokenSystema, pasarela } = req.body;
  const { ItemsPago } = Items;
  let monto = ItemsPago[0].Valor_Pagado;
  const pago = await RealizarPago(
    ItemsPago,
    monto,
    ID_Secuencia,
    ItemsPago[0].Referencia,
    Cod_Obligacion,
    ItemsPago[0].IDTransaccion,
    tokenData.id,
    tokenSystema,
    pasarela
  );
  console.log("Pago: ", pago);
  // Guardar log
  await guardarLogAPI("/metodoPago", ip, token, req.body, pago, pago.Codigo_Respuesta);
  res.json({
    Metodo_de_PagoResult: pago,
  });
});

app.post("/metodoReverso", validarIPyToken, async (req, res) => {
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  const token = req.headers["authorization"]?.replace("Bearer ", "").trim();
  console.log(`Petición recibida desde la IP: ${ip}`);
  console.log(`Hora de la peticion: ${new Date().toLocaleString()}`);
  const { Cod_Obligacion, ID_Secuencia, Items, tokenData, tokenSystema} = req.body;
  const { ItemsReverso } = Items;
  console.log(ItemsReverso);
  const valorReverso = ItemsReverso[0].Valor_Pagado;
  const reverso = await ReversoPago(
    ItemsReverso,
    valorReverso,
    ID_Secuencia,
    Cod_Obligacion,
    ItemsReverso[0].IDTransaccion,
    tokenData.id,
    tokenSystema
  );
  console.log("Resverso: ",reverso);
  // Guardar log
  await guardarLogAPI("/metodoReverso", ip, token, req.body, reverso, reverso.Codigo_Respuesta);
  res.json({
    Metodo_de_ReversoResult: reverso,
  });
});

app.post("/metodoTest", validarIPyToken, async (req, res) => {
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  const token = req.headers["authorization"]?.replace("Bearer ", "").trim();
  console.log(`Petición recibida desde la IP: ${ip}`);
  console.log(`Hora de la peticion: ${new Date().toLocaleString()}`);
  const resultadoTest = {
    Tipo_Transaccion: "Test",
    CodigoRespuesta: "000",
    Mensaje_Respuesta: "Prueba exitosa",
  };
  // Guardar log
  await guardarLogAPI("/metodoTest", ip, token, req.body, resultadoTest, resultadoTest.CodigoRespuesta);
  res.json({
    Metodo_de_TestResult: resultadoTest,
  });
});


app.get("/conciliaciones/:idInstitucion/descargar", validarIPyToken, async (req, res) => {
  try {
    console.log("Generando archivo de conciliación...", req.body);
    const { idInstitucion } = req.params;
    const idToken = req.body.tokenData.id;
    if (!idInstitucion) {
      return res.status(400).json({
        ok: false,
        message: "ID de institución es requerido",
      });
    }
    const { rutaArchivo, nombreArchivo } = await generarArchivoConciliacion(idInstitucion, idToken);

    // fuerza descarga
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${nombreArchivo}"`);
    return res.download(rutaArchivo, nombreArchivo);
  } catch (e) {
    console.error("❌ Error en /conciliaciones/:idInstitucion/descargar:", e);
    return res.status(500).json({
      ok: false,
      message: "Error generando el archivo de conciliación",
      error: e?.message || e,
    });
  }
})


const PORT = process.env.PORTAPI || 5000;

app.listen(PORT, "0.0.0.0", async () => {
  await cargarWhitelistIPs(); // primera carga
  setInterval(cargarWhitelistIPs, 1 * 60 * 1000); // cada 1 minutos
  console.log(`🚀 Servidor escuchando en http://localhost:${PORT}`);
});
