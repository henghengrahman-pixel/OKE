require('dotenv').config();

const express = require('express');
const session = require('express-session');
const fs = require('fs-extra');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const ADMIN_ID = process.env.ADMIN_ID || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || '123456';
const SESSION_SECRET = process.env.SESSION_SECRET || 'change-this-secret';
const BASE_URL = (process.env.BASE_URL || '').replace(/\/+$/, '');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const DATA_FILE = path.join(DATA_DIR, 'data.json');

fs.ensureDirSync(DATA_DIR);
fs.ensureDirSync(UPLOAD_DIR);

if (!fs.existsSync(DATA_FILE)) {
  fs.writeJsonSync(DATA_FILE, { campaigns: [] }, { spaces: 2 });
}

app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use(express.json({ limit: '20mb' }));
app.use('/uploads', express.static(UPLOAD_DIR));

app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax'
  }
}));

const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function(req, file, cb) {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const safeExt = ext || '.jpg';
    cb(null, Date.now() + '-' + uuidv4() + safeExt);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: function(req, file, cb) {
    if (!file.mimetype || !file.mimetype.startsWith('image/')) {
      return cb(new Error('File harus gambar'));
    }
    cb(null, true);
  }
});

function loadData() {
  try {
    if (!fs.existsSync(DATA_FILE)) return { campaigns: [] };
    const data = fs.readJsonSync(DATA_FILE);
    if (!Array.isArray(data.campaigns)) data.campaigns = [];
    return data;
  } catch (err) {
    console.error('LOAD DATA ERROR:', err);
    return { campaigns: [] };
  }
}

function saveData(data) {
  fs.writeJsonSync(DATA_FILE, data, { spaces: 2 });
}

function parseButtons(textsRaw, urlsRaw) {
  const buttons = [];
  if (!textsRaw || !urlsRaw) return buttons;

  const texts = String(textsRaw).split('\n').join(',').split(',');
  const urls = String(urlsRaw).split('\n').join(',').split(',');

  for (let i = 0; i < texts.length; i++) {
    const text = (texts[i] || '').trim();
    const url = (urls[i] || '').trim();
    if (text && /^https?:\/\//i.test(url)) {
      buttons.push({ text, url });
    }
  }
  return buttons;
}

function photoUrlFromFile(req) {
  if (!req.file) return '';
  const relative = '/uploads/' + req.file.filename;

  if (BASE_URL) return BASE_URL + relative;

  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return protocol + '://' + host + relative;
}

function auth(req, res, next) {
  if (req.session && req.session.login) return next();
  return res.redirect('/login');
}

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.get('/login', (req, res) => {
  res.render('login', { error: '' });
});

app.post('/login', (req, res) => {
  if (req.body.id === ADMIN_ID && req.body.pass === ADMIN_PASS) {
    req.session.login = true;
    return res.redirect('/');
  }
  return res.render('login', { error: 'ID atau password salah' });
});

app.get('/logout', auth, (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

app.get('/', auth, (req, res) => {
  const data = loadData();
  res.render('dashboard', { data });
});

app.post('/add', auth, upload.single('photo'), (req, res) => {
  try {
    const data = loadData();
    const minutes = parseInt(req.body.interval, 10);
    const interval = Number.isFinite(minutes) && minutes > 0 ? minutes * 60 : 1800;

    const campaign = {
      id: uuidv4(),
      caption: req.body.caption || '',
      photo: photoUrlFromFile(req),
      buttons: parseButtons(req.body.btn_text, req.body.btn_url),
      interval,
      last_send: 0,
      active: true,
      created_at: Date.now(),
      updated_at: Date.now()
    };

    data.campaigns.unshift(campaign);
    saveData(data);
    res.redirect('/');
  } catch (err) {
    console.error('ADD ERROR:', err);
    res.status(500).send('ERROR ADD CAMPAIGN: ' + err.message);
  }
});

app.post('/edit/:id', auth, upload.single('photo'), (req, res) => {
  try {
    const data = loadData();
    const campaign = data.campaigns.find(c => c.id === req.params.id);
    if (!campaign) return res.redirect('/');

    const minutes = parseInt(req.body.interval, 10);
    campaign.caption = req.body.caption || '';
    campaign.buttons = parseButtons(req.body.btn_text, req.body.btn_url);
    campaign.interval = Number.isFinite(minutes) && minutes > 0 ? minutes * 60 : campaign.interval;
    campaign.updated_at = Date.now();

    if (req.file) campaign.photo = photoUrlFromFile(req);
    if (req.body.remove_photo === '1') campaign.photo = '';

    saveData(data);
    res.redirect('/');
  } catch (err) {
    console.error('EDIT ERROR:', err);
    res.status(500).send('ERROR EDIT CAMPAIGN: ' + err.message);
  }
});

app.get('/toggle/:id', auth, (req, res) => {
  const data = loadData();
  const campaign = data.campaigns.find(c => c.id === req.params.id);
  if (campaign) {
    campaign.active = !campaign.active;
    campaign.updated_at = Date.now();
  }
  saveData(data);
  res.redirect('/');
});

app.get('/reset/:id', auth, (req, res) => {
  const data = loadData();
  const campaign = data.campaigns.find(c => c.id === req.params.id);
  if (campaign) campaign.last_send = 0;
  saveData(data);
  res.redirect('/');
});

app.get('/delete/:id', auth, (req, res) => {
  const data = loadData();
  data.campaigns = data.campaigns.filter(c => c.id !== req.params.id);
  saveData(data);
  res.redirect('/');
});

app.use((err, req, res, next) => {
  console.error('APP ERROR:', err);
  res.status(500).send('ERROR: ' + err.message);
});

app.listen(PORT, () => {
  console.log('Panel ON on port ' + PORT);
});
