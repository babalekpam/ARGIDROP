const express = require('express');
const multer = require('multer');
const { authenticate } = require('../middleware/auth');
const { uploadFile } = require('../services/storage');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.post('/', authenticate, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file provided' });
    const { folder = 'general' } = req.body;
    const url = await uploadFile(req.file, `${folder}/${req.user.id}`);
    res.json({ success: true, url });
  } catch (err) { next(err); }
});

module.exports = router;
