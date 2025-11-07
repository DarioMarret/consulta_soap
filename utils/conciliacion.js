const { pool } = require("../conexion/conexcion");
const moment = require("moment");

async function guardarConciliacionPago({
  cliente_nombre,
  cliente_id,
  codigo_operacion,
  codigo_activa,
  codigo_secuencial,
  concepto_pago,
  valor,
  idToken
}) {
  console.log("Guardando conciliación de pago...");
  console.log({
    cliente_nombre,
    cliente_id,
    codigo_operacion,
    codigo_activa,
    codigo_secuencial,
    concepto_pago,
    valor,
    idToken
  });
  const ahora = new Date();
  const fecha = moment(ahora).format("YYYY-MM-DD");
  const hora = moment(ahora).format("HH:mm:ss");

  await pool.query(
    `
    INSERT INTO conciliacion_pagos (
      fecha_transaccion,
      hora_transaccion,
      fecha_contable,
      cliente_nombre,
      cliente_id,
      cuenta_cliente,
      codigo_operacion,
      agencia,
      terminal,
      operador,
      codigo_activa,
      codigo_secuencial,
      concepto_pago,
      valor,
      estado,
      canal,
      idToken
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
    [
      fecha,
      hora,
      fecha,
      cliente_nombre,
      cliente_id,
      "", // cuenta_cliente si tienes
      codigo_operacion,
      "Matriz",
      "Genérica",
      "Genérica",
      codigo_activa,
      codigo_secuencial,
      concepto_pago,
      valor,
      "Activo",
      "Propio",
      idToken
    ]
  );
}

module.exports = {
  guardarConciliacionPago,
};
