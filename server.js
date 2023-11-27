const express = require('express');
const soap = require('soap');
const { ConsultarNombreCliente, Validaciones, RealizarPago, ReversoPago } = require('./consultas');
// Definir funciones para las operaciones del servicio SOAP
// Función para la operación Metodo_de_Consulta
async function metodoDeConsulta(args) {
  // Implementa aquí la lógica para procesar la consulta y obtener los resultados
  const { Cod_Obligacion, Parametro_Busqueda, Tipo_Transaccion, Tipo_Producto } = args.RequestConsultaObject
  const cliente = await ConsultarNombreCliente(Cod_Obligacion)
  return Validaciones(cliente, Cod_Obligacion)
}

// Función para la operación Metodo_de_Pago
async function metodoDePago(args) {
  console.log(args)
  const { Cod_Obligacion, Parametro_Busqueda, Tipo_Transaccion, Tipo_Producto, ID_Secuencia, Monto_1, Monto_2, Items } = args.RequestPagoObject
  const { ItemsPago } = Items
  let monto = Monto_1 + Monto_2
  const pago = await RealizarPago(ItemsPago, monto, ID_Secuencia, Items, Cod_Obligacion)
  console.log(pago)
  // Implementa aquí la lógica para procesar el pago y obtener los resultados
  return { Metodo_de_PagoResult: pago };
}

// Función para la operación Metodo_de_Reverso
async function metodoDeReverso(args) {
  console.log(args)
  // Implementa aquí la lógica para procesar el reverso y obtener los resultados
  const { Cod_Obligacion, Parametro_Busqueda, Tipo_Transaccion, Tipo_Producto, ID_Secuencia, Valor_Total_Pagado, Items } = args.RequestReversoObject
  const { ItemsReverso } = Items
  console.log(ItemsReverso)
  const reverso = await ReversoPago(ItemsReverso,Valor_Total_Pagado,ID_Secuencia,Cod_Obligacion)
  return { Metodo_de_ReversoResult: reverso };
}

// Función para la operación Metodo_de_Test
function metodoDeTest(args) {
  // Implementa aquí la lógica para realizar una prueba y obtener los resultados
  const resultadoTest = {
    Tipo_Transaccion: 'Test',
    CodigoRespuesta: 'OK',
    Mensaje_Respuesta: 'Prueba exitosa',
    // Otros campos de respuesta
  };
  return { Metodo_de_TestResult: resultadoTest };
}

// Crear un servidor HTTP con Express
const app = express();

// Endpoint para el servicio SOAP
const endpoint = '/consulta';
const xmlPathConsulta = './serviceConsulta.wsdl';

// Cargar el WSDL
const xml = require('fs').readFileSync(xmlPathConsulta, 'utf8');

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

soap.listen(app, endpoint, servicio, xml);

const port = 3002;
app.listen(port, () => {
  console.log(`Servidor SOAP escuchando en http://localhost:${port}${endpoint}?wsdl`);
});
