require('dotenv').config();
const express = require('express');
const session = require('express-session');
const fs = require('fs-extra');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// ================= VIEW =================
app.set('view engine','ejs');
app.set('views', path.join(__dirname,'views'));

// ================= MIDDLEWARE =================
app.use(express.urlencoded({extended:true}));
app.use(express.json());

// ================= UPLOAD DIR =================
const uploadDir = path.join(__dirname, 'uploads');
fs.ensureDirSync(uploadDir);

// static file upload
app.use('/uploads', express.static(uploadDir));

// ================= MULTER =================
const storage = multer.diskStorage({
destination: (req, file, cb) => {
cb(null, uploadDir);
},
filename: (req, file, cb) => {
const safeName = file.originalname.replace(/[^a-zA-Z0-9.]/g,'_');
cb(null, Date.now() + '-' + safeName);
}
});

const upload = multer({ storage });

// ================= SESSION =================
app.use(session({
secret:'secret',
resave:false,
saveUninitialized:false
}));

// ================= DATA =================
const FILE = path.join(__dirname,'data.json');

function load(){
if(!fs.existsSync(FILE)) return {campaigns:[]};
return fs.readJsonSync(FILE);
}

function save(d){
fs.writeJsonSync(FILE,d,{spaces:2});
}

// ================= AUTH =================
function auth(req,res,next){
if(req.session.login) return next();
res.redirect('/login');
}

// ================= ROUTES =================
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

// ================= ADD CAMPAIGN =================
app.post('/add', auth, upload.single('photo'), (req,res)=>{
try{
const data = load();

```
// ===== BUTTON =====
const buttons = [];

if(req.body.btn_text && req.body.btn_url){
  const t = req.body.btn_text.split(',');
  const u = req.body.btn_url.split(',');

  t.forEach((x,i)=>{
    if(u[i]){
      buttons.push({
        text: x.trim(),
        url: u[i].trim()
      });
    }
  });
}

// ===== INTERVAL =====
const interval = parseInt(req.body.interval);
const intervalFix = isNaN(interval) ? 1800 : interval * 60;

// ===== PHOTO =====
let photo = null;

if(req.file){
  const base = process.env.BASE_URL || '';
  photo = base + '/uploads/' + req.file.filename;
}

// ===== SAVE =====
data.campaigns.push({
  id: uuidv4(),
  caption: req.body.caption || '',
  photo: photo,
  buttons: buttons,
  interval: intervalFix,
  last_send: 0,
  active: true
});

save(data);
res.redirect('/');
```

}catch(err){
console.log(err);
res.send('ERROR ADD CAMPAIGN');
}
});

// ================= TOGGLE =================
app.get('/toggle/:id',auth,(req,res)=>{
const data = load();
const c = data.campaigns.find(x=>x.id===req.params.id);

if(c) c.active = !c.active;

save(data);
res.redirect('/');
});

// ================= DELETE =================
app.get('/delete/:id',auth,(req,res)=>{
const data = load();
data.campaigns = data.campaigns.filter(x=>x.id!==req.params.id);
save(data);
res.redirect('/');
});

// ================= START =================
app.listen(PORT,()=>console.log("Panel ON"));
