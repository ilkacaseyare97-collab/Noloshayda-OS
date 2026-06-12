const jwt = require('jsonwebtoken');
const User = require('../models/User');

const COOKIE_NAME = 'noloshayda_token';
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days

function getTokenFromRequest(req) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    return header.slice(7).trim();
  }
  if (req.cookies && req.cookies[COOKIE_NAME]) {
    return req.cookies[COOKIE_NAME];
  }
  return null;
}

function signToken(userId) {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.includes('CHANGE_THIS')) {
    throw new Error('JWT_SECRET ma saxna .env faylka');
  }
  return jwt.sign({ id: userId.toString() }, secret, {
    expiresIn: process.env.JWT_EXPIRES_IN || '30d'
  });
}

function setTokenCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE
  });
}

function clearTokenCookie(res) {
  res.clearCookie(COOKIE_NAME);
}

async function protect(req, res, next) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      if (req.path.startsWith('/api/')) {
        return res.status(401).json({ error: 'Token lama helin. Fadlan gal akoonkaaga.' });
      }
      return res.redirect('/login');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      if (req.path.startsWith('/api/')) {
        return res.status(401).json({ error: 'User lama helin. Gal mar kale.' });
      }
      return res.redirect('/login');
    }

    req.user = user;
    next();
  } catch (err) {
    clearTokenCookie(res);
    if (err.name === 'TokenExpiredError') {
      if (req.path.startsWith('/api/')) {
        return res.status(401).json({ error: 'Token-ku wuu dhacay. Gal mar kale.' });
      }
      return res.redirect('/login');
    }
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({ error: 'Authentication waa fashilantay.' });
    }
    return res.redirect('/login');
  }
}

module.exports = { protect, signToken, setTokenCookie, clearTokenCookie, getTokenFromRequest, COOKIE_NAME };
