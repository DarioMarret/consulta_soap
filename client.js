const util = require('util');
const soap = require('soap');

const url = 'http://localhost:5000/consulta?wsdl';
const options = {
  forceSoap12Headers: true, // Asegúrate de que esta opción esté configurada correctamente
};

function tesInfo() {
  return new Promise((resolve, reject) => {
    soap.createClient(url, options, (err, client) => {
      if (err) {
        console.error('Error al crear el cliente SOAP:', err);
        reject(err); // Lanza un error para manejarlo en el catch
        return;
      }

      const requestConsulta = {
        RequestConsultaObject: {
          Clave_Empresa: '12542154',
          Codigo_Institucion_Financiera: 'tickets',
          Codigo_Canal: 'web',
          Terminal: '123456',
          Fecha_Transaccion: '02',
          Hora_Transaccion: '012',
          Cod_Obligacion: '0950578989',
          Parametro_Busqueda: 2,
          Tipo_Transaccion: '01',
          Tipo_Producto: '01',
        },
      };

      // Invoca el método Metodo_de_Consulta
      client.Service.ServiceSoap.Metodo_de_Consulta(requestConsulta, (err, result) => {
        // ver el soap que se envia
        console.log('Request:', client.lastRequest);
        if (err) {
          console.error('Error al invocar el método Metodo_de_Consulta:', err);
          reject(err); // Lanza un error para manejarlo en el catch
          return;
        }

        console.log('Resultado de Metodo_de_Consulta:', result);
        resolve(result); // Resuelve la promesa con el resultado
      });
    });
  });
}

tesInfo()
  .then((result) => {
    console.log('Resultado:', result);
  })
  .catch((err) => {
    console.error('Error:', err);
  });
