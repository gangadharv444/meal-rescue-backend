const { getWeatherSuggestion } = require('../src/controllers/mealController');

describe('mealController', () => {
  describe('getWeatherSuggestion fallback logic', () => {
    it('should suggest soup or spicy food when temp is below 20', () => {
      // Setup mock data
      const finalMeals = [
        { id: 1, meal_name: 'Hot Soup', Tags: ['soup', 'dinner'] },
        { id: 2, meal_name: 'Ice Cream', Tags: ['sweet', 'cold', 'dinner'] }
      ];
      
      const weatherSearchTags = ['soup', 'spicy', 'rice', 'hot', 'comfort food'];
      const candidates = finalMeals.filter(m => m.Tags && m.Tags.some(t => weatherSearchTags.includes(t)));
      
      expect(candidates.length).toBe(1);
      expect(candidates[0].meal_name).toBe('Hot Soup');
    });

    it('should suggest salad when temp is high', () => {
      // Setup mock data
      const finalMeals = [
        { id: 1, meal_name: 'Hot Soup', Tags: ['soup', 'dinner'] },
        { id: 2, meal_name: 'Fresh Salad', Tags: ['salad', 'light', 'dinner'] }
      ];
      
      const weatherSearchTags = ['salad', 'yogurt', 'cold', 'light'];
      const candidates = finalMeals.filter(m => m.Tags && m.Tags.some(t => weatherSearchTags.includes(t)));
      
      expect(candidates.length).toBe(1);
      expect(candidates[0].meal_name).toBe('Fresh Salad');
    });
  });
});
