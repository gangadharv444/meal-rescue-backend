const mongoose = require('mongoose');

const preferenceSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  no_repeat_days: { type: Number, default: 7 },
  theme_days: { type: Object, default: {} },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Preference', preferenceSchema);
