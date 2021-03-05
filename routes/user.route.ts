import { Router, Request, Response, NextFunction } from 'express';
import MongoDBHelper from '../helpers/mongodb.helper';
import mongoClient from 'mongodb';
import fileUpload, { UploadedFile } from 'express-fileupload';
import path from 'path';
import fs from 'fs';

const api = Router();
const mongo = MongoDBHelper.getInstance();

api.put('/edit', async(req: Request, res: Response, next: NextFunction) => {
    let {direccion,cp,telefono,id} = req.body;
    id= new mongoClient.ObjectID(id);
    mongo.setDataBase('neko_no_kokoro');
    const result: any = await mongo.db.collection('usuarios').findOneAndUpdate({
        _id:id
    },
    { $set:{direccion,cp,telefono} })
    .then((result:any) => {
        return {
            ok:true,
            producto:'Usuario actualizado con exito'
        }
    })
    .catch((err: any) => {
        return {
            ok:false,
            producto:err
        }
    });


    res.status(200).json({
        ok:result.ok,
        message:result.producto
    })

});

api.post('/upload/:tipo/:id', (req: Request, res: Response, next: NextFunction) => {

    let tipo = req.params.tipo;
    let idstring = req.params.id;
    let id = new mongoClient.ObjectID(idstring);

    if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).json({
            ok:true,
            msg: `Es necesario adjuntar por lo menos 1 archivos`
        });
    }

    let tipposValidos = ['productos', 'usuarios'];

    if (tipposValidos.indexOf(tipo) < 0) {
        return res.status(400).json({
            ok: false,
            err: {
                message: "Los tipos permitidos son " + tipposValidos.join(',')
            }
        })
    }

    let file:any = req.files.archivo as UploadedFile;
        let nombreCortado = file.name.split('.');
        let extension = nombreCortado[nombreCortado.length - 1];
        let extensionesValidas = ['png', 'jpg', 'gif', 'jpeg'];

        if (extensionesValidas.indexOf(extension) < 0) {
            return res.status(400).json({
                ok: false,
                err: {
                    message: "Las extensiones permitidas son " + extensionesValidas.join(','),
                    ex: extension
                }
            })
        }
        let nombreArchivo = `${idstring}-${ new Date().getMilliseconds() }.${extension}`
        file.mv(`./uploads/${tipo}/${nombreArchivo}`, (err: any) => {
            if (err) {
                return res.status(500).json({
                    ok:false,
                    msg: `Ocurrio un error al intentar guardar el archivo en el servidor`
                });
            }
            if (tipo == 'usuarios') {
                //imagenUsuario(id, res, nombreArchivo);
            } else {
                imagenProducto(id, res, nombreArchivo);
            }
        });    

    
    // Multiples Archivos en un Arreglo

    


    
    // Un solo archivo
    // let fileError = req.files.error;

    // // Use the mv() method to place the file somewhere on your server
    // fileError.mv(`./uploads/${fileError.name}`, (err: any) => {
    //     if (err) {
    //         return res.status(500).json({
    //             status: 'Internal Server Error',
    //             code: 500,
    //             environment: settings.api.environment,
    //             msg: `Ocurrio un error al intentar guardar el archivo en el servidor`
    //         });
    //     }
    // });   

});

function imagenProducto(id:any, res:Response, nombreArchivo:string) {
    mongo.db.collection('productos').findOne({_id:id}).then((result:any)=>{

        borraArchivo(result.img, 'productos');
        mongo.db.collection('productos').findOneAndUpdate({
            _id:result._id
        },
        { $set:{img:nombreArchivo} }).then((result:any)=>{
            return res.status(200).json({
                ok: true,
                message:"Imagen cargada correctamente"
            })
        })

    }).catch((err:any)=>{
        borraArchivo(nombreArchivo, 'productos');
            return res.status(500).json({
                ok: false,
                message:"Hubo un error con el servidor"
            })
    });
    
}



function borraArchivo(nombreImagen:string, tipo:string) {
    let pathImagen = path.resolve(__dirname, `../../uploads/${ tipo }/${nombreImagen}`);

    if (fs.existsSync(pathImagen)) {
        fs.unlinkSync(pathImagen);
    }
}

export default api;
