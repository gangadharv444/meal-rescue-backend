const mongoose = require('mongoose');

const mealSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  meal_name: { type: String, required: true },
  Tags: [{ type: String }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Meal', mealSchema);
