const axios = require("axios");
const moment = require("moment");
const { guardarConciliacionPago } = require("./utils/conciliacion");
require("dotenv").config();

// const Dely = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const ConsultarNombreCliente = async (cedula, tokenSystema) => {
  try {
    var info = {};
    const { data, status } = await axios.post(
      `${process.env.HOST_CONSULTA}GetClientsDetails`,
      {
        cedula: cedula,
        token: tokenSystema ||`${process.env.TOKEN}`,
      }
    );
    if (data.estado !== "exito") return null;
    //156325487S2
    info = {
      idCliente: data.datos[0].id,
      nombre: data.datos[0].nombre,
      correo: data.datos[0].correo,
      facturacion: data.datos[0].facturacion,
      totalFacturas: 0,
      totalCobros: 0,
    };
    const detallesAcumulados = [];
    let totalCobros = 0;
    let totalFacturas = 0;

    for (let i = 0; i < data.datos.length; i++) {
      const cliente = data.datos[i];

      const facturas = await FacturaNOPagadas(cliente.id, tokenSystema);
      if (!facturas) continue;

      // tambien se recorre el array de facturas
      for (let j = 0; j < facturas.length; j++) {
        const factura = facturas[j];
        if (!factura) continue;

        const detalles = await DetallesFactura(
          factura.idfactura,
          cliente.direccion_principal,
          tokenSystema
        );
        if (!detalles) continue;

        detalles.forEach((item) => {
          const valor = parseFloat(item.ItemsConsulta?.Valor_Cobro || 0);
          totalCobros += valor;
          detallesAcumulados.push(item);
        });
      }

      totalFacturas += cliente.facturacion?.facturas_nopagadas || 0;
    }

    if (detallesAcumulados.length > 0) {
      const totalCobro = detallesAcumulados.reduce(
        (sum, item) => sum + parseFloat(item.ItemsConsulta?.Valor_Cobro || 0),
        0
      );
    
      // Usamos el más reciente periodo y vencimiento para el resumen
      const ultimaFactura = detallesAcumulados[detallesAcumulados.length - 1];
    
      const detalleUnificado = {
        ItemsConsulta: {
          Valor_Cobro: totalCobro.toFixed(2),
          Valor_Minimo_Cobro: 0,
          Valor_Retener: 0,
          Base_Imponible: "", // podrías sumar también si lo necesitas
          Fecha_Maxima_Cobro: ultimaFactura.ItemsConsulta.Fecha_Maxima_Cobro,
          Referencia: detallesAcumulados.map(d => d.ItemsConsulta.Referencia).join(","),
          Periodo: ultimaFactura.ItemsConsulta.Periodo,
          Auxiliar: ultimaFactura.ItemsConsulta.Auxiliar,
          Direccion_Servicio: ultimaFactura.ItemsConsulta.Direccion_Servicio,
        },
      };
    
      // info.detalles = [detalleUnificado];
      info.detalles = [detallesAcumulados];
      info.totalCobros = totalCobro.toFixed(2);
    } else {
      info.detalles = [];
      info.totalCobros = "0.00";
    }
    info.totalFacturas = totalFacturas;
    

    // await Dely(1000)

    return info;
  } catch (error) {
    if (error.response) {
      console.log(error.response.data);
      console.log(error.response.status);
      console.log(error.response.headers);
      return null;
    } else {
      console.log(error);
      return null;
    }
  }
};

const FacturaNOPagadas = async (idcliente, tokenSystema) => {
  try {
    var info = [];
    const { data, status } = await axios.post(
      `${process.env.HOST_CONSULTA}GetInvoices`,
      {
        token: tokenSystema || `${process.env.TOKEN}`,
        idcliente: idcliente,
        estado: "1",
      }
    );
    if (data.estado === "exito") {
      for (let index = 0; index < data.facturas.length; index++) {
        const element = data.facturas[index];
        info.push({
          idfactura: element.id,
          emitido: element.emitido,
          vencimiento: element.vencimiento,
          total: element.total.replace("$ ", ""),
          saldo: element.saldo.replace("$ ", ""),
        });
      }
      // info = {
      //     idfactura: data.facturas[0].id,
      //     emitido: data.facturas[0].emitido,
      //     vencimiento: data.facturas[0].vencimiento,
      // }
      return info;
    } else {
      return null;
    }
  } catch (error) {
    if (error.response) {
      console.log(error.response.data);
      console.log(error.response.status);
      console.log(error.response.headers);
      return null;
    } else {
      console.log(error);
      return null;
    }
  }
};

const DetallesFactura = async (idfactura, direccion_principal, tokenSystema) => {
  try {
    var info = [];
    const { data, status } = await axios.post(
      `${process.env.HOST_CONSULTA}GetInvoice`,
      {
        token: tokenSystema || `${process.env.TOKEN}`,
        idfactura: idfactura,
      }
    );
    if (data.estado === "exito") {
      console.log("data detalles factura: ", JSON.stringify(data));
      for (let index = 0; index < data.items.length; index++) {
        const element = data.items[index];
        //si tiene el mismo idfactura lo agrupo sumando los valores
        const existing = info.find(item => item.ItemsConsulta.Referencia === data.factura.id);
        if (existing) {
          existing.ItemsConsulta.Valor_Cobro = (parseFloat(existing.ItemsConsulta.Valor_Cobro) + parseFloat(element.total)).toFixed(2);
          existing.ItemsConsulta.Base_Imponible = (parseFloat(existing.ItemsConsulta.Base_Imponible) + parseFloat(element.precio)).toFixed(2);
        } else {
          info.push({
              ItemsConsulta: {
              Valor_Cobro: element.total,
              Valor_Minimo_Cobro: 0,
              Valor_Retener: 0,
              // Valor_Iva_Servicios: (element.total - parseFloat(element.precio)).toFixed(2),
              // Valor_Iva_Bienes: 0,
              Base_Imponible: element.precio,
              //Base_Imponible_Bienes: 0,
              Fecha_Maxima_Cobro: moment(data.factura.vencimiento).format("YYYYMMDD"),
              Referencia: data.factura.id,
              Periodo: moment(data.factura.emitido).format("YYYYMM"),
              Auxiliar: data.factura.id,
              Direccion_Servicio: direccion_principal,
            },
          });
        }
      }
      return info;
    } else {
      return null;
    }
  } catch (error) {
    if (error.response) {
      console.log(error.response.data);
      console.log(error.response.status);
      console.log(error.response.headers);
      return null;
    } else {
      console.log(error);
      return null;
    }
  }
};

const NumeroAleatorio = () => {
  return moment().format("YYYYMMDDHHmmss");
};

/*
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
*/
const RealizarPago = async (
  idfactura,
  monto,
  numeroDocumento,
  Referencia,
  cedula,
  IDTransaccion,
  idToken,
  tokenSystema,
  pasarela
) => {
  try {
    let idtransaccion = NumeroAleatorio();
    if (IDTransaccion && IDTransaccion !== "") {
      idtransaccion = IDTransaccion;
    }
    console.log("RealizarPago");
    console.log("idfactura: ", idfactura);
    console.log("facturas: ", Referencia);

    var pagos = [];
    const { data, status } = await axios.post(`${process.env.HOST_CONSULTA}GetClientsDetails`,{
        cedula: cedula,
        token: tokenSystema || `${process.env.TOKEN}`,
      });
    if (data.estado === "exito") {
      let nombre = data.datos[0].nombre;
      for (let index = 0; index < idfactura.length; index++) {
        const items = idfactura[index];
        console.log("items: ", items);
        const { data, status } = await axios.post(
          `${process.env.HOST_CONSULTA}PaidInvoice`,
          {
            token: tokenSystema || `${process.env.TOKEN}`,
            idfactura: items.Referencia,
            pasarela: pasarela,
            cantidad: items.Valor_Pagado,
            idtransaccion: idtransaccion,
            nota: `${moment().format("YYYYMMDDHHMMSS")} / ${idtransaccion}`,
          }
        );
        console.log("data: ", data);
        if (data.estado === "exito") {
          info = {
            Codigo_Respuesta: "000", // Pago realizado con éxito
            Mensaje_Respuesta: data.salida,
            Parametro_Busqueda: 2,
            Cod_Obligacion: cedula,
            Nombre_Cliente: nombre,
            Fecha_Transaccion: moment().format("YYYYMMDD"),
            ID_Transaccion_Empresa: data.id,
            ID_Secuencia: idtransaccion, //data.id,
            Nro_Pagos: 1,
            Valor_Total_Pagado: monto,
            Tipo_Producto: "SERVICIO",
          };
          pagos.push(info);
          await guardarConciliacionPago({
            cliente_nombre: nombre,
            cliente_id: cedula,
            codigo_operacion: numeroDocumento,
            codigo_activa: data.id.toString(), // ID de transacción empresa
            codigo_secuencial: idtransaccion,
            concepto_pago: `Pago de factura ${items.Referencia}`,
            valor: items.Valor_Pagado,
            idToken: idToken
          });
        }
      }
      if (pagos.length > 0) {
        let pago = pagos[0];
        pago.Nro_Pagos = pagos.length;
        pago.Valor_Total_Pagado = pagos.reduce(
          (a, b) => a + parseFloat(b.Valor_Total_Pagado),
          0
        );
        return pago;
      } else {
        info = {
          Codigo_Respuesta: "002", // Error al realizar el pago
          Mensaje_Respuesta: "Error al realizar el pago",
          Parametro_Busqueda: 2,
          Cod_Obligacion: cedula,
          Nombre_Cliente: "",
          Fecha_Transaccion: "",
          ID_Transaccion_Empresa: "",
          ID_Secuencia: "",
          Nro_Pagos: "0",
          Valor_Total_Pagado: "0.0",
          Tipo_Producto: "SERVICIO",
        };
        return info;
      }
    } else {
      info = {
        Codigo_Respuesta: "001", // Cliente no encontrado
        Mensaje_Respuesta: "Cliente no encontrado",
        Parametro_Busqueda: 2,
        Cod_Obligacion: cedula,
        Nombre_Cliente: "",
        Fecha_Transaccion: "",
        ID_Transaccion_Empresa: "",
        ID_Secuencia: "",
        Nro_Pagos: "0",
        Valor_Total_Pagado: "0.0",
        Tipo_Producto: "SERVICIO",
      };
      return info;
    }
  } catch (error) {
    console.log("Error: ", error);
    if (error.response) {
      console.log(error.response.data);
      console.log(error.response.status);
      console.log(error.response.headers);
      return {
        Codigo_Respuesta: "012", // Error desconocido
        Mensaje_Respuesta: error.message || "Error desconocido",
        Parametro_Busqueda: 2,
        Cod_Obligacion: cedula,
        Fecha_Transaccion: "",
        ID_Transaccion_Empresa: "",
        ID_Secuencia: "",
        Nro_Pagos: "0",
        Valor_Total_Pagado: "0.0",
        Tipo_Producto: "SERVICIO",
      };
    } else {
      console.log(error);
      return {
        Codigo_Respuesta: "012", // Error desconocido
        Mensaje_Respuesta: error.message || "Error desconocido",
        Parametro_Busqueda: 2,
        Cod_Obligacion: cedula,
        Fecha_Transaccion: "",
        ID_Transaccion_Empresa: "",
        ID_Secuencia: "",
        Nro_Pagos: "0",
        Valor_Total_Pagado: "0.0",
        Tipo_Producto: "SERVICIO",
      };
    }
  }
};

const ReversoPago = async (idfactura, monto, ID_Secuencia, cedula, IDTransaccion, idToken, tokenSystema) => {
  try {
    var pagos = [];
    for (let index = 0; index < idfactura.length; index++) {
      const items = idfactura[index];
      console.log(items);
      const { data, status } = await axios.post(`${process.env.HOST_CONSULTA}DeleteTransaccion`,
        {
          token: tokenSystema || `${process.env.TOKEN}`,
          factura: items.Referencia,
        }
      );
      console.log(data);
      if (data.estado === "exito") {
        info = {
          Codigo_Respuesta: "000",
          Mensaje_Respuesta: data.mensaje,
          Parametro_Busqueda: 2,
          Cod_Obligacion: cedula,
          Fecha_Transaccion: moment().format("YYYYMMDD"),
          ID_Transaccion_Empresa: items.Referencia,
          ID_Secuencia: ID_Secuencia,
          Nro_Pagos: 1,
          Valor_Total_Reversado: monto,
          Tipo_Producto: "SERVICIO",
        };
        pagos.push(info);
        await guardarConciliacionPago({
          cliente_nombre: cedula,
          cliente_id: cedula,
          codigo_operacion: ID_Secuencia,
          codigo_activa: items.Referencia, // ID de transacción externa
          codigo_secuencial: items.IDTransaccion,
          concepto_pago: "Reverso de pago de factura " + items.Referencia + " (ID Transacción: " + IDTransaccion + ")",
          valor: monto,
          idToken: idToken
        });
      }
    }

    if (pagos.length > 0) {
      let pago = pagos[0];
      pago.Nro_Pagos = pagos.length;
      pago.Valor_Total_Reversado = pagos.reduce(
        (a, b) => a + parseFloat(b.Valor_Total_Reversado),
        0
      );
      return pago;
    } else {
      info = {
        Codigo_Respuesta: "011",
        Mensaje_Respuesta: "Error al realizar el reverso",
        Parametro_Busqueda: 2,
        Cod_Obligacion: cedula,
        Fecha_Transaccion: "",
        ID_Transaccion_Empresa: "",
        ID_Secuencia: "",
        Nro_Pagos: "0",
        Valor_Total_Reversado: "0.0",
        Tipo_Producto: "SERVICIO",
      };
      return info;
    }
  } catch (error) {
    if (error.response) {
      console.log(error.response.data);
      console.log(error.response.status);
      console.log(error.response.headers);
      return {
        Codigo_Respuesta: "012", // Error desconocido
        Mensaje_Respuesta: error.message || "Error desconocido",
        Parametro_Busqueda: 2,
        Cod_Obligacion: cedula,
        Fecha_Transaccion: "",
        ID_Transaccion_Empresa: "",
        ID_Secuencia: "",
        Nro_Pagos: "0",
        Valor_Total_Reversado: "0.0",
        Tipo_Producto: "SERVICIO",
      }
    } else {
      console.log(error);
      return {
        Codigo_Respuesta: "012",
        Mensaje_Respuesta: error.message || "Error desconocido",
        Parametro_Busqueda: 2,
        Cod_Obligacion: cedula,
        Fecha_Transaccion: "",
        ID_Transaccion_Empresa: "",
        ID_Secuencia: "",
        Nro_Pagos: "0",
        Valor_Total_Reversado: "0.0",
        Tipo_Producto: "SERVICIO",
      };
    }
  }
};

const Validaciones = (cliente, cedula) => {
  if (cliente === null) {
    const requestConsulta = {
      Tipo_Producto: "02",
      Parametro_Busqueda: 2,
      Codigo_Respuesta: "001",
      Mensaje_Respuesta: "Cliente no encontrado",
      Cod_Obligacion: cedula,
      Nombre_Cliente: "",
      Valor_Total_a_Pagar: "0",
      Nro_Cobros: "0",
      Items: "",
    };
    return { Metodo_de_ConsultaResult: requestConsulta };
  } else if (cliente.facturaNopagadas === null) {
    const requestConsulta = {
      Tipo_Producto: "02",
      Parametro_Busqueda: 2,
      Codigo_Respuesta: "005", // Factura no tiene pagos pendientes
      Mensaje_Respuesta: "Cliente no tiene facturas pendientes",
      Cod_Obligacion: cedula,
      Nombre_Cliente: cliente.nombre,
      Valor_Total_a_Pagar: "0",
      Nro_Cobros: "0",
      Items: "",
    };
    return { Metodo_de_ConsultaResult: requestConsulta };
  } else if (cliente.detalles === null) {
    const requestConsulta = {
      Tipo_Producto: "02",
      Parametro_Busqueda: 2,
      Codigo_Respuesta: "003", // Factura no tiene detalles
      Mensaje_Respuesta: "Factura no tiene detalles",
      Cod_Obligacion: cedula,
      Nombre_Cliente: cliente.nombre,
      Valor_Total_a_Pagar: "0",
      Nro_Cobros: "0",
      Items: "",
    };
    return { Metodo_de_ConsultaResult: requestConsulta };
  } else {
    const requestConsulta = {
      Tipo_Producto: "SERVICIO",
      Parametro_Busqueda: 2,
      Codigo_Respuesta: "000", // Consulta exitosa
      Mensaje_Respuesta: "Consulta exitosa",
      Cod_Obligacion: cedula,
      Nombre_Cliente: cliente.nombre,
      Valor_Total_a_Pagar: cliente.totalCobros,
      Nro_Cobros: cliente.facturacion.facturas_nopagadas,
      Items: cliente.detalles,
    };
    return { Metodo_de_ConsultaResult: requestConsulta };
  }
};

module.exports = {
  ConsultarNombreCliente,
  FacturaNOPagadas,
  DetallesFactura,
  Validaciones,
  RealizarPago,
  ReversoPago,
};
