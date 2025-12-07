const express = require('express');
const router = express.Router();
const preferenceController = require('../controllers/preferenceController');
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, preferenceController.getPreferences);
router.put('/', requireAuth, preferenceController.updatePreferences);

module.exports = router;
