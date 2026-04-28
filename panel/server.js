
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const fs = require('fs-extra');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine','ejs');
app.set('views', path.join(__dirname,'views'));

app.use(express.urlencoded({extended:true}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname,'uploads')));

const storage = multer.diskStorage({
  destination: (req,file,cb)=> cb(null,'panel/uploads'),
  filename: (req,file,cb)=> cb(null, Date.now()+'-'+file.originalname)
});
const upload = multer({storage});

app.use(session({secret:'secret',resave:false,saveUninitialized:false}));

const FILE = path.join(__dirname,'data.json');

function load(){
  if(!fs.existsSync(FILE)) return {campaigns:[]};
  return fs.readJsonSync(FILE);
}
function save(d){fs.writeJsonSync(FILE,d,{spaces:2});}

function auth(req,res,next){
  if(req.session.login) return next();
  res.redirect('/login');
}

app.get('/login',(req,res)=>res.render('login'));

app.post('/login',(req,res)=>{
  if(req.body.id==='admin' && req.body.pass==='123456'){
    req.session.login=true;
    return res.redirect('/');
  }
  res.send('Login salah');
});

app.get('/',auth,(req,res)=>{
  res.render('dashboard',{data:load()});
});

app.post('/add',auth,upload.single('photo'),(req,res)=>{
  const data = load();

  const buttons=[];
  if(req.body.btn_text && req.body.btn_url){
    const t=req.body.btn_text.split(',');
    const u=req.body.btn_url.split(',');
    t.forEach((x,i)=>{ if(u[i]) buttons.push({text:x.trim(),url:u[i].trim()}); });
  }

  const photo = req.file ? process.env.BASE_URL+'/uploads/'+req.file.filename : null;

  data.campaigns.push({
    id:uuidv4(),
    caption:req.body.caption,
    photo:photo,
    buttons:buttons,
    interval:parseInt(req.body.interval)*60,
    last_send:0,
    active:true
  });

  save(data);
  res.redirect('/');
});

app.get('/delete/:id',auth,(req,res)=>{
  const data=load();
  data.campaigns=data.campaigns.filter(x=>x.id!==req.params.id);
  save(data);
  res.redirect('/');
});

app.listen(PORT,()=>console.log("Panel ON"));
