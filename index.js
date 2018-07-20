// Used packages and libraries

import express from "express";
import path from "path";
// import alert from 'alert-node'
const sharp = require('sharp');
var WordPOS = require('wordpos'),
    wordpos = new WordPOS();
    var chrono = require('chrono-node');
var gm= require('gm');
var fs = require('fs');
const pica = require('pica')();
const pdfjsLib = require('pdfjs-dist');
var fileDownload = require('js-file-download');
import Tesseract from 'tesseract.js'
import bodyParser from "body-parser";
import dotenv from "dotenv";
import Promise from "bluebird";
import caught  from "caught" ;
import auth from "./src/routes/auth";
import users from "./src/routes/users";
const mongoose = require('mongoose');
const cors = require('cors');
const crypto = require('crypto');
const GridFsStorage = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const methodOverride = require('method-override');
import pdf from 'pdf-poppler'
const router = express.Router();
const getPageCount = require('docx-pdf-pagecount');


const app = express();

app.use(cors());

dotenv.config();
app.use(bodyParser.json());

// Dealing with Promises
mongoose.Promise = Promise;
const p = caught(Promise.reject(0));
 // Setting Time for Promises
setTimeout(() => p.catch(e => console.error('caught')), 0);
mongoose.connect(process.env.MONGODB_URL);
app.use(methodOverride('_method'));
app.set('view engine', 'ejs');
// Setting the engine of MongoDB
 const mongoURI = process.env.MONGODB_URL;
 const conn = mongoose.createConnection(mongoURI);

 // Init gfs
 let gfs;

 // Creating three repositories 
 // : uploads for uploaded PDF files
 var mkdirp = require('mkdirp');
    
 mkdirp('./uploads', function (err) {
     if (err) console.error(err)
     else console.log('repository uploads created!')
 });
 // : texts  for the result OCR 
 mkdirp('./texts', function (err) {
    if (err) console.error(err)
    else console.log('repository texts created!')
});
// : images for the results of the conversion of PDF to images 
 mkdirp('./images', function (err) {
    if (err) console.error(err)
    else console.log('repository images created!')
});

// Setting the  Storage engine
 conn.once('open', () => {
   // Init stream
   gfs = Grid(conn.db, mongoose.mongo);
   gfs.collection('uploads');
 });
 const multer = require('multer');
 const storage = multer.diskStorage({ // notice you are calling the multer.diskStorage() method here, not multer()
     destination: function(req, file, cb) {
         cb(null, './uploads')
     },
     filename: function(req, file, cb) {
         cb(null, file.originalname)
     }
 });
 // Declaration of function of storage 
 const upload = multer({storage});

 
// using apis from the back end side 
app.use("/api/auth", auth);
app.use("/api/users", users);
app.post("/test", (req, res, next) => {
    console.log("got something", req.body);
    res.send({var1: "tata"});
});

app.get("/*", (req, res, next) => {
  res.sendFile(path.join(__dirname, "index.html"));
  next();
});
app.all('/*', function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    next();
  });
  // /upload : api that contains the  engine of uploading PDF file (only PDF ) then converting 
  // it to images then improving the quality of images then Applying OCR method on these images 
 app.post('/upload', upload.single('file'), (req, res,next) => {
   
   
   console.log('Successfully uploaded');
   if(req.file){
       
    let file = req.file.path;
  let opts = {
      format: 'jpeg',
      out_dir: "./images",
      out_prefix: path.basename(file,path.extname(file)),
      page: null
  }
  // Create Text file 
  fs.writeFile('./texts/' + path.basename(file,path.extname(file))+'.txt', '', function (err) {
      console.log('file created')
  })
  // Converting PDF to images 
  pdf.convert(file, opts)
      .then(res => {
          console.log('Successfully converted');
      })
      .catch(error => {
          console.error(error);
      
      }).then(function(){
    pdfjsLib.getDocument(file)
    .then(function (doc) {
        // Counting the number of PDF Pages 
        let numPages = doc.numPages;
    console.log(numPages)

           // If number of pages is less then ten we find the converted images start with 1 , 2, 3 
           // But when  the number of pages is equal or greater then ten converted images start with 01 , 02 
           // That's why we should have two conditions of treatment 
        if(numPages<10){
    // Path of converted images 
        let newfile='./images/' + path.basename(file,path.extname(file))+'-1' +'.jpg'
        // Path of the converted image after applying improvment engine on the image 
        let newfile1='./images/' + path.basename(file,path.extname(file))+'-improved-1'+'.jpg'
        // To improve quality we will use sharp as a suitable library for Node Js and Windows  but it's better 
        // to use Linux and OpenCV  or imageImagick with Linux shells 
        sharp(newfile)
        .resize(1580, 2200).gamma(3)
        .greyscale()
        .sharpen(2.0,1.0,1.0).threshold(120)
        .toFile(newfile1, function(err) {
            // Setting the environement of tesseract 
            const Tesseract = require('tesseract.js').create({
                workerPath: path.join(__dirname, './src/tesseract/node/worker.js'),
                langPath: path.join(__dirname, './src/tesseract/langs'),
                corePath: path.join(__dirname, './src/tesseract/node/index.js')
            });
            // Applying Tesseract 
            Tesseract.recognize(newfile1).then(result => {
               // Storing the result of OCR in texetFile 
             fs.writeFile('./texts/' + path.basename(file,path.extname(file))+'-1'+'.txt', result.text, function (err) {
              
        fs.appendFile('./texts/' + path.basename(file,path.extname(file))+'.txt',result.text, function (err) {
            if (err) throw err;
            console.log('The "data to append" was appended to file!');
               // Here we should set the engine of parsing with machine learning  
               
               // example of information to be extracted 
            
                        

           // The name of PDF file 
           let var1= path.basename(file,path.extname(file));
           var results=chrono.parseDate(result.text); 
           // The date of the contract 
           let  var2= results;
           // Number of pages of the PDF file 
           let var3=numPages;
           // Setting these information into a list 
            let rs={
                
                          first:var1,
                      
                        second:var2 ,
                        
                        third:var3

                      }
             
               // Sending information to the Front-end side
            return res.json(rs);
            next();
          });
         
                 

     
            
        })  
                })
            })
        
    
    }
   
   

    
    
    
  })
  })

  }
  // If there is no file uploaded 
  else {
    console.log('there is no file to convert please upload your file')
  }

  next()
 });

// l'adresse de ce serveur est : http://localhost:8080/  mais il n y a pas d'interfaces puisque c'est une API 
 
app.listen(8080, () => console.log("Running on localhost:8080"));