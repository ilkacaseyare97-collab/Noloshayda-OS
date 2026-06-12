const express = require('express');
const User = require('../models/User');
const UserData = require('../models/UserData');
const { signToken, protect, setTokenCookie, clearTokenCookie } = require('../middleware/protect');

const router = express.Router();

function validateUsername(username) {
  const u = String(username || '').trim().toLowerCase();
  if (u.length < 3) return { ok: false, error: 'Username waa inuu ugu yaraan 3 xaraf yahay' };
  if (!/^[a-z0-9._-]+$/.test(u)) {
    return { ok: false, error: 'Username: xarfo yaryar, tiro, . _ - kaliya' };
  }
  return { ok: true, value: u };
}

router.post('/register', async (req, res) => {
  try {
    const usernameCheck = validateUsername(req.body.username);
    if (!usernameCheck.ok) return res.status(400).json({ error: usernameCheck.error });

    const name = String(req.body.name || '').trim();
    const password = String(req.body.password || '');
    const password2 = String(req.body.password2 || '');

    if (!name) return res.status(400).json({ error: 'Geli magacaaga' });
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password waa inuu ugu yaraan 6 xaraf yahay' });
    }
    if (password !== password2) {
      return res.status(400).json({ error: 'Password-yada isma laha' });
    }

    const existing = await User.findOne({ username: usernameCheck.value });
    if (existing) {
      return res.status(409).json({ error: 'Username-kan hore ayaa loo isticmaalay' });
    }

    const passwordHash = await User.hashPassword(password);
    const user = await User.create({
      username: usernameCheck.value,
      name,
      passwordHash
    });

    await UserData.create({ userId: user._id, appData: null, edits: null });

    const token = signToken(user._id);
    setTokenCookie(res, token);
    res.status(201).json({ ok: true, token, user: user.toPublic() });
  } catch (err) {
    console.error('Register error:', err.message);
    res.status(500).json({ error: 'Khalad ayaa dhacay is diiwaangelinta' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const usernameCheck = validateUsername(req.body.username);
    if (!usernameCheck.ok) return res.status(400).json({ error: usernameCheck.error });

    const password = String(req.body.password || '');
    if (!password) return res.status(400).json({ error: 'Geli password' });

    const user = await User.findOne({ username: usernameCheck.value }).select('+passwordHash');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Username ama password waa khalad' });
    }

    const token = signToken(user._id);
    setTokenCookie(res, token);
    res.json({ ok: true, token, user: user.toPublic() });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Khalad ayaa dhacay login-ka' });
  }
});

router.get('/me', protect, (req, res) => {
  res.json(req.user.toPublic());
});

router.post('/logout', (_req, res) => {
  clearTokenCookie(res);
  res.json({ ok: true });
});

module.exports = router;
