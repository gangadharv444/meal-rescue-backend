const mongoose = require('mongoose');

const defaultMealSchema = new mongoose.Schema({
  meal_name: { type: String, required: true },
  Tags: [{ type: String }]
});

module.exports = mongoose.model('DefaultMeal', defaultMealSchema);
