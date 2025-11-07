CREATE TABLE conciliacion_pagos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  fecha_transaccion DATE,
  hora_transaccion TIME,
  fecha_contable DATE,
  cliente_nombre VARCHAR(255),
  cliente_id VARCHAR(50),
  cuenta_cliente VARCHAR(100),
  codigo_operacion VARCHAR(50),
  agencia VARCHAR(100) DEFAULT 'Matriz',
  terminal VARCHAR(100) DEFAULT 'Genérica',
  operador VARCHAR(100) DEFAULT 'Genérica',
  codigo_activa VARCHAR(100),
  codigo_secuencial VARCHAR(100),
  concepto_pago VARCHAR(255),
  valor DECIMAL(10,2),
  estado VARCHAR(20) DEFAULT 'Activo', -- o 'Eliminado'
  canal VARCHAR(50) DEFAULT 'Propio', -- o 'SRNP'
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
