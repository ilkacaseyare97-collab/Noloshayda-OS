require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const path = require('path');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const dataRoutes = require('./routes/data');
const { protect, clearTokenCookie } = require('./middleware/protect');
const UserData = require('./models/UserData');

const app = express();
const PORT = process.env.PORT || 3000;

const PUBLIC_DIR = path.join(__dirname, 'public');
const APP_FILE = path.join(__dirname, 'private', 'app.html');

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── Public pages ──
app.get('/', (_req, res) => res.redirect('/login'));

app.get('/login', (_req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'login.html'));
});

app.get('/register', (_req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'register.html'));
});

// ── Auth API (JWT + httpOnly cookie) ──
// Mounted twice: /api/auth/* (new) and /api/* (legacy compatibility)
app.use('/api/auth', authRoutes);
app.use('/api', authRoutes);

// Logout clears cookie (legacy path)
app.post('/api/logout', (_req, res) => {
  clearTokenCookie(res);
  res.json({ ok: true });
});

// ── User data API (requires JWT in Header or cookie) ──
app.use('/api/data', dataRoutes);

// ── Protected app – served from private/ (NOT in public/) ──
app.get('/app', protect, async (req, res) => {
  try {
    let html = fs.readFileSync(APP_FILE, 'utf8');
    let doc = await UserData.findOne({ userId: req.user._id });
    const cloud = {
      appData: doc?.appData || null,
      edits: doc?.edits || null
    };
    const boot = `<script>
window.__NOLO_USER=${JSON.stringify(req.user.toPublic())};
window.__CLOUD_DATA=${JSON.stringify(cloud)};
</script>`;
    html = html.replace('</head>', `${boot}\n</head>`);
    res.type('html').send(html);
  } catch (err) {
    console.error('GET /app error:', err.message);
    res.status(500).send('Khalad ayaa dhacay furitaanka app-ka');
  }
});

app.get('/app.html', (_req, res) => res.redirect('/app'));

// ── Static public files only (login, register, auth.js) ──
app.use(express.static(PUBLIC_DIR, { index: false }));

app.use((_req, res) => {
  res.status(404).send('Bogga lama helin');
});

async function start() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.includes('CHANGE_THIS')) {
    console.error('\n❌ JWT_SECRET ma jiro .env faylka.');
    console.error('   1. Nuqul ka samee .env.example → .env');
    console.error('   2. Ku dar JWT_SECRET random ah\n');
    process.exit(1);
  }

  try {
    await connectDB();
  } catch (err) {
    console.error('\n❌ MongoDB:', err.message);
    console.error('   1. Abuur cluster MongoDB Atlas (free): https://mongodb.com/atlas');
    console.error('   2. Ku dar MONGODB_URI .env faylka\n');
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`\n✅ Noloshayda server socda`);
    console.log(`   Login:  http://localhost:${PORT}/login`);
    console.log(`   App:    http://localhost:${PORT}/app\n`);
  });
}

start();
