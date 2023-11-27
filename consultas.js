const axios = require("axios");
const moment = require("moment");
require('dotenv').config()

const ConsultarNombreCliente = async (cedula) => {
    try {
        console.log("HOST_CONSULTA, ",process.env.HOST_CONSULTA);
        console.log("TOKEN, ",process.env.TOKEN);
        var info = {}
        const { data, status } = await axios.post(`${process.env.HOST_CONSULTA}GetClientsDetails`, { 
            cedula: cedula,
            token: `${process.env.TOKEN}`
        })
        if(data.estado === 'exito'){
            info = {
                idCliente: data.datos[0].id,
                nombre: data.datos[0].nombre,
                correo: data.datos[0].correo,
                facturacion: data.datos[0].facturacion,
            }
            const facturas = await FacturaNOPagadas(data.datos[0].id)
            if(facturas !== null){
                info.facturaNopagadas = facturas
                const detalles = await DetallesFactura(facturas.idfactura)
                if(detalles !== null){
                    info.detalles = detalles
                }else{
                    info.detalles = null
                }
            }else{
                info.facturaNopagadas = null
            }

            return info
        }else{
            return null
        }
    } catch (error) {
        if(error.response){
            console.log(error.response.data);
            console.log(error.response.status);
            console.log(error.response.headers);
            return null
        }else{
            console.log(error)
            return null
        }
    }
}

const FacturaNOPagadas = async (idcliente) => {
    try {
        var info = {}
        const { data, status } = await axios.post(`${process.env.HOST_CONSULTA}GetInvoices`, { 
            token: `${process.env.TOKEN}`,
            idcliente: idcliente,
            estado: '1'
        })
        if(data.estado === 'exito'){
            info = {
                idfactura: data.facturas[0].id,
                emitido: data.facturas[0].emitido,
                vencimiento: data.facturas[0].vencimiento,
            }
            return info
        }else{
            return null
        }
    } catch (error) {
        if(error.response){
            console.log(error.response.data);
            console.log(error.response.status);
            console.log(error.response.headers);
            return null
        }else{
            console.log(error)
            return null
        }
    }
}

const DetallesFactura = async (idfactura) => {
    try {
        var info = []
        const { data, status } = await axios.post(`${process.env.HOST_CONSULTA}GetInvoice`, { 
            token: `${process.env.TOKEN}`,
            idfactura: idfactura,
        })
        if(data.estado === 'exito'){
            for (let index = 0; index < data.items.length; index++) {
                const element = data.items[index];
                let items = {
                        ItemsConsulta: {
                        Valor_Cobro: element.total2.replace('$ ', ''),
                        Valor_Minimo_Cobro: 0,
                        Valor_Retener: 0,
                        Base_Imponible: element.precio,
                        Fecha_Maxima_Cobro: moment(data.factura.vencimiento).format('YYYYMMDD'),
                        Referencia: data.factura.id,
                        Periodo: moment(data.factura.emitido).format('YYYYMM'),
                        Auxiliar: data.factura.id,
                    }
                }
                info.push(items)
                /*
                info.push({
                    Valor_Cobro: element.total2.replace('$ ', ''),
                    Valor_Minimo_Cobro: 0,
                    Valor_Retener: 0,
                    Base_Imponible: element.precio,
                    Fecha_Maxima_Cobro: moment(data.factura.vencimiento).format('YYYYMMDD'),
                    Referencia: data.factura.id,
                    Periodo: moment(data.factura.emitido).format('YYYYMM'),
                    // descrp: element.descrp,
                    // imp: element.imp,
                    // precio: element.precio,
                    // iva: parseFloat(element.precio) * 0.12,
                })
                */
            }
            return info
        }else{
            return null
        }
    } catch (error) {
        if(error.response){
            console.log(error.response.data);
            console.log(error.response.status);
            console.log(error.response.headers);
            return null
        }else{
            console.log(error)
            return null
        }
    }
}

const RealizarPago = async (idfactura, monto, numeroDocumento, nota, cedula) => {
    try {
        var pagos = []
        const { data, status } = await axios.post(`${process.env.HOST_CONSULTA}GetClientsDetails`, { 
            cedula: cedula,
            token: `${process.env.TOKEN}`
        })
        if(data.estado === 'exito'){
            let nombre = data.datos[0].nombre
            for (let index = 0; index < idfactura.length; index++) {
                const items = idfactura[index];
                const { data, status } = await axios.post(`${process.env.HOST_CONSULTA}PaidInvoice`, { 
                    token: `${process.env.TOKEN}`,
                    idfactura: items.Referencia,
                    pasarela: "Banco Guayaquil",
                    cantidad: items.Valor_Pagado,
                    idtransaccion: items.IDTransaccion,
                    nota: `${moment().format("YYYYMMDDHHMMSS")} / ${items.IDTransaccion}`
                })
                if(data.estado === 'exito'){
                    info = {
                        Codigo_Respuesta: '000',
                        Mensaje_Respuesta:  data.salida,
                        Parametro_Busqueda: 2,
                        Cod_Obligacion: cedula,
                        Nombre_Cliente: nombre,
                        Fecha_Transacción: moment().format('YYYYMMDD'),
                        ID_Transaccion_Empresa: data.id,
                        ID_Secuencia: data.id,
                        Nro_Pagos: 1,
                        Valor_Total_Pagado: monto,
                        Tipo_Producto: 'SERVICIO',
                    }
                    pagos.push(info)
                }
                
            }
    
            if(pagos.length > 0){
                let pago = pagos[0]
                pago.Nro_Pagos = pagos.length
                pago.Valor_Total_Pagado = pagos.reduce((a, b) => a + parseFloat(b.Valor_Total_Pagado), 0)
                return pago
            }else{
                info = {
                    Codigo_Respuesta: '002',
                    Mensaje_Respuesta:  'Error al realizar el pago',
                    Parametro_Busqueda: 2,
                    Cod_Obligacion: cedula,
                    Nombre_Cliente: '',
                    Fecha_Transacción: '',
                    ID_Transaccion_Empresa: '',
                    ID_Secuencia: '',
                    Nro_Pagos: '0',
                    Valor_Total_Pagado: '0.0',
                    Tipo_Producto: 'SERVICIO',
                }
                return info
            }
        }else{
            info = {
                Codigo_Respuesta: '001',
                Mensaje_Respuesta:  'Cliente no encontrado',
                Parametro_Busqueda: 2,
                Cod_Obligacion: cedula,
                Nombre_Cliente: '',
                Fecha_Transacción: '',
                ID_Transaccion_Empresa: '',
                ID_Secuencia: '',
                Nro_Pagos: '0',
                Valor_Total_Pagado: '0.0',
                Tipo_Producto: 'SERVICIO',
            }
            return info
        }
    } catch (error) {
        if(error.response){
            console.log(error.response.data);
            console.log(error.response.status);
            console.log(error.response.headers);
            return null
        }else{
            console.log(error)
            return null
        }
    }
}

const ReversoPago = async (idfactura, monto, ID_Secuencia, cedula) => {
    try {
        var pagos = []
        for (let index = 0; index < idfactura.length; index++) {
            const items = idfactura[index];
            console.log(items)
            const { data, status } = await axios.post(`${process.env.HOST_CONSULTA}DeleteTransaccion`, { 
                token: `${process.env.TOKEN}`,
                factura: items.Referencia,
            })
            console.log(data)
            if(data.estado === 'exito'){
                info = {
                    Codigo_Respuesta: '000',
                    Mensaje_Respuesta:  data.mensaje,
                    Parametro_Busqueda: 2,
                    Cod_Obligacion: cedula,
                    Fecha_Transacción: moment().format('YYYYMMDD'),
                    ID_Transaccion_Empresa: items.Referencia,
                    ID_Secuencia: ID_Secuencia,
                    Nro_Pagos: 1,
                    Valor_Total_Reversado: monto,
                    Tipo_Producto: 'SERVICIO',
                }
                pagos.push(info)
            }
        }

        if(pagos.length > 0){
            let pago = pagos[0]
            pago.Nro_Pagos = pagos.length
            pago.Valor_Total_Reversado = pagos.reduce((a, b) => a + parseFloat(b.Valor_Total_Reversado), 0)
            return pago
        }else{
            info = {
                Codigo_Respuesta: '011',
                Mensaje_Respuesta:  'Error al realizar el reverso',
                Parametro_Busqueda: 2,
                Cod_Obligacion: cedula,
                Fecha_Transacción: '',
                ID_Transaccion_Empresa: '',
                ID_Secuencia: '',
                Nro_Pagos: '0',
                Valor_Total_Reversado: '0.0',
                Tipo_Producto: 'SERVICIO',
            }
            return info
        }
    }catch (error) {
        if(error.response){
            console.log(error.response.data);
            console.log(error.response.status);
            console.log(error.response.headers);
            return null
        }else{
            console.log(error)
            return null
        }
    }
    
}

const Validaciones = (cliente, cedula)=>{
    if(cliente === null){
        const requestConsulta = {
            Tipo_Producto: '02',
            Parametro_Busqueda: 2,
            Codigo_Respuesta: '001',
            Mensaje_Respuesta: 'Cliente no encontrado',
            Cod_Obligacion: cedula,
            Nombre_Cliente: '',
            Valor_Total_a_Pagar: '0',
            Nro_Cobros: '0',
            Items: '',
        };
        return { Metodo_de_ConsultaResult: requestConsulta };
    }else if (cliente.facturaNopagadas === null){
        const requestConsulta = {
            Tipo_Producto: '02',
            Parametro_Busqueda: 2,
            Codigo_Respuesta: '005',
            Mensaje_Respuesta: 'Cliente no tiene facturas pendientes',
            Cod_Obligacion: cedula,
            Nombre_Cliente: cliente.nombre,
            Valor_Total_a_Pagar: '0',
            Nro_Cobros: '0',
            Items: '',
        };
        return { Metodo_de_ConsultaResult: requestConsulta };

    }else if(cliente.detalles === null){
        const requestConsulta = {
            Tipo_Producto: '02',
            Parametro_Busqueda: 2,
            Codigo_Respuesta: '003',
            Mensaje_Respuesta: 'Factura no tiene detalles',
            Cod_Obligacion: cedula,
            Nombre_Cliente: cliente.nombre,
            Valor_Total_a_Pagar: '0',
            Nro_Cobros: '0',
            Items: '',
        };
        return { Metodo_de_ConsultaResult: requestConsulta };
    }else{
        const requestConsulta = {
            Tipo_Producto: 'SERVICIO',
            Parametro_Busqueda: 2,
            Codigo_Respuesta: '000',
            Mensaje_Respuesta: 'Consulta exitosa',
            Cod_Obligacion: cedula,
            Nombre_Cliente: cliente.nombre,
            Valor_Total_a_Pagar: cliente.detalles[0].total2,
            Nro_Cobros: cliente.facturacion.facturas_nopagadas,
            Items: cliente.detalles,
        };
        return { Metodo_de_ConsultaResult: requestConsulta };
    
    }

}


module.exports = {
    ConsultarNombreCliente,
    FacturaNOPagadas,
    DetallesFactura,
    Validaciones,
    RealizarPago,
    ReversoPago
}