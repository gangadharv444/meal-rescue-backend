const express = require('express');
const router = express.Router();
const mealController = require('../controllers/mealController');
const { requireAuth } = require('../middleware/auth');

// Protected routes
router.post('/meals', requireAuth, mealController.createMeal);
router.get('/meals', requireAuth, mealController.getMeals);
router.put('/meals/:id', requireAuth, mealController.updateMeal);
router.delete('/meals/:id', requireAuth, mealController.deleteMeal);

router.get('/suggestion/weather', requireAuth, mealController.getWeatherSuggestion);
router.get('/plan/generate', requireAuth, mealController.generatePlan);

// Public routes (as per original logic)
router.get('/default-meals', mealController.getDefaultMeals);

module.exports = router;
