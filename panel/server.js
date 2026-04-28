
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine','ejs');
app.set('views', path.join(__dirname,'views'));

app.use(express.urlencoded({extended:true}));
app.use(express.json());

app.use(session({
  secret: 'secret',
  resave:false,
  saveUninitialized:false
}));

const USER = process.env.ADMIN_ID || 'admin';
const PASS = process.env.ADMIN_PASS || '123456';

function auth(req,res,next){
  if(req.session.login) return next();
  res.redirect('/login');
}

const FILE = path.join(__dirname,'../data/data.json');

function load(){
  if(!fs.existsSync(FILE)) return {is_active:false, interval:1800, campaigns:[]};
  return fs.readJsonSync(FILE);
}

function save(d){
  fs.writeJsonSync(FILE,d,{spaces:2});
}

app.get('/login',(req,res)=>res.render('login'));

app.post('/login',(req,res)=>{
  if(req.body.id===USER && req.body.pass===PASS){
    req.session.login=true;
    return res.redirect('/');
  }
  res.send('Login salah');
});

app.get('/',auth,(req,res)=>{
  const data = load();
  res.render('dashboard',{data});
});

app.post('/add',auth,(req,res)=>{
  const data = load();
  data.campaigns.push({
    id: uuidv4(),
    caption: req.body.caption,
    photo: req.body.photo,
    buttons: [],
    active: true
  });
  save(data);
  res.redirect('/');
});

app.get('/delete/:id',auth,(req,res)=>{
  const data = load();
  data.campaigns = data.campaigns.filter(c=>c.id!==req.params.id);
  save(data);
  res.redirect('/');
});

app.get('/toggle',auth,(req,res)=>{
  const data = load();
  data.is_active = !data.is_active;
  save(data);
  res.redirect('/');
});

app.listen(PORT,()=>console.log("Panel running"));
