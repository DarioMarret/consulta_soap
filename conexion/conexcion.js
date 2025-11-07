const mysql = require('mysql2/promise');
const dotenv = require('dotenv');


// console de variables
console.log("Cargando variables de entorno...");
// Cargar las variables de entorno desde el archivo .env
dotenv.config();
// Verifica si las variables de entorno están definidas
console.log(process.env.DB_HOST);
console.log(process.env.DB_USER);
console.log(process.env.DB_PASS);
console.log(process.env.DB_NAME);

if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASS || !process.env.DB_NAME) {
  console.error("Error: Las variables de entorno de la base de datos no están definidas.");
  process.exit(1);
}


// Crea una conexión a tu base de datos
const pool = mysql.createPool({
  port:25061,
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME
});



module.exports = { pool };
