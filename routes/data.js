const express = require('express');
const UserData = require('../models/UserData');
const { protect } = require('../middleware/protect');

const router = express.Router();

router.use(protect);

router.get('/', async (req, res) => {
  try {
    let doc = await UserData.findOne({ userId: req.user._id });
    if (!doc) {
      doc = await UserData.create({ userId: req.user._id, appData: null, edits: null });
    }
    res.json({ appData: doc.appData, edits: doc.edits, updatedAt: doc.updatedAt });
  } catch (err) {
    console.error('GET /api/data error:', err.message);
    res.status(500).json({ error: 'Khalad ayaa dhacay akhrinta xogta' });
  }
});

router.put('/', async (req, res) => {
  try {
    const update = {};
    if (req.body.appData !== undefined) update.appData = req.body.appData;
    if (req.body.edits !== undefined) update.edits = req.body.edits;

    const doc = await UserData.findOneAndUpdate(
      { userId: req.user._id },
      { $set: update },
      { upsert: true, new: true }
    );

    res.json({ ok: true, updatedAt: doc.updatedAt });
  } catch (err) {
    console.error('PUT /api/data error:', err.message);
    res.status(500).json({ error: 'Khalad ayaa dhacay kaydinta xogta' });
  }
});

module.exports = router;
