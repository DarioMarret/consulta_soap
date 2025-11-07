const { pool } = require("../conexion/conexcion");

async function guardarLogAPI(endpoint, ip, token, reqBody, resBody, code) {
  try {
    await pool.query(
      `INSERT INTO api_logs (endpoint, ip_cliente, token, request_body, response_body, code)
         VALUES (?, ?, ?, ?, ?, ?)`,
      [endpoint, ip, token, JSON.stringify(reqBody), JSON.stringify(resBody), code]
    );
  } catch (error) {
    console.error("❌ Error al guardar log:", error);
  }
}
module.exports = { guardarLogAPI };