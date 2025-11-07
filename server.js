const express = require("express");
const soap = require("soap");
const {
  ConsultarNombreCliente,
  Validaciones,
  RealizarPago,
  ReversoPago,
} = require("./consultas");
const { pool } = require("./conexion/conexcion");
// Definir funciones para las operaciones del servicio SOAP
// Función para la operación Metodo_de_Consulta
async function metodoDeConsulta(args) {
  // Implementa aquí la lógica para procesar la consulta y obtener los resultados
  const {
    Cod_Obligacion,
    Parametro_Busqueda,
    Tipo_Transaccion,
    Tipo_Producto,
  } = args.RequestConsultaObject;
  const cliente = await ConsultarNombreCliente(Cod_Obligacion);
  return Validaciones(cliente, Cod_Obligacion);
}

// Función para la operación Metodo_de_Pago
async function metodoDePago(args) {
  console.log(args);
  const {
    Cod_Obligacion,
    Parametro_Busqueda,
    Tipo_Transaccion,
    Tipo_Producto,
    ID_Secuencia,
    Monto_1,
    Monto_2,
    Items,
  } = args.RequestPagoObject;
  const { ItemsPago } = Items;
  let monto = Monto_1 + Monto_2;
  const pago = await RealizarPago(
    ItemsPago,
    monto,
    ID_Secuencia,
    Items,
    Cod_Obligacion
  );
  console.log(pago);
  // Implementa aquí la lógica para procesar el pago y obtener los resultados
  return { Metodo_de_PagoResult: pago };
}

// Función para la operación Metodo_de_Reverso
async function metodoDeReverso(args) {
  console.log(args);
  // Implementa aquí la lógica para procesar el reverso y obtener los resultados
  const {
    Cod_Obligacion,
    Parametro_Busqueda,
    Tipo_Transaccion,
    Tipo_Producto,
    ID_Secuencia,
    Valor_Total_Pagado,
    Items,
  } = args.RequestReversoObject;
  const { ItemsReverso } = Items;
  console.log(ItemsReverso);
  const reverso = await ReversoPago(
    ItemsReverso,
    Valor_Total_Pagado,
    ID_Secuencia,
    Cod_Obligacion
  );
  return { Metodo_de_ReversoResult: reverso };
}

// Función para la operación Metodo_de_Test
function metodoDeTest(args) {
  // Implementa aquí la lógica para realizar una prueba y obtener los resultados
  const resultadoTest = {
    Tipo_Transaccion: "Test",
    CodigoRespuesta: "OK",
    Mensaje_Respuesta: "Prueba exitosa",
    // Otros campos de respuesta
  };
  return { Metodo_de_TestResult: resultadoTest };
}

// Crear un servidor HTTP con Express
const app = express();

// Endpoint para el servicio SOAP
const endpoint = "/consulta";
const xmlPathConsulta = "./serviceConsulta.wsdl";

let WHITELIST_IPS = [];

// Cargar desde la base de datos (usa tu pool existente)
async function cargarWhitelistIPs() {
  try {
    const [rows] = await pool.query("SELECT whitelist_ips FROM ip_address WHERE is_estado = 1");
    console.log("Cargando IPs permitidas desde la base de datos...");
    WHITELIST_IPS = rows.map((row) => row.whitelist_ips.trim());
    //console.log("✅ Lista blanca actualizada:", WHITELIST_IPS);
  } catch (error) {
    console.error("❌ Error al cargar IPs permitidas:", error);
  }
}

function validarIPMiddleware(req, res, next) {
  let ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "";
  ip = ip.replace("::ffff:", "").trim();
  console.log(`🔐 Validando IP SOAP: ${ip}`);
  if (!WHITELIST_IPS.includes(ip)) {
    return res.status(403).send("IP no autorizada");
  }
  next();
}

// Middleware de IP + SOAP
app.use(validarIPMiddleware); // aplicar a todo
// Cargar el WSDL
const xml = require("fs").readFileSync(xmlPathConsulta, "utf8");

// Asociar las funciones del servicio SOAP al servidor
const servicio = {
  Service: {
    ServiceSoap: {
      Metodo_de_Consulta: metodoDeConsulta,
      Metodo_de_Pago: metodoDePago,
      Metodo_de_Reverso: metodoDeReverso,
      Metodo_de_Test: metodoDeTest,
    },
  },
};



soap.listen(app, '/consulta', servicio, xml);


const port = 5000;
app.listen(port, "0.0.0.0", async () => {
  await cargarWhitelistIPs(); // primera carga
  setInterval(cargarWhitelistIPs, 1 * 60 * 1000); // cada 1 minutos
  console.log(
    `🚀 Servidor SOAP escuchando en http://localhost:${port}/consulta?wsdl`
  );
});
