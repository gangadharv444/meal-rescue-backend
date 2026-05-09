const mongoose = require('mongoose');
const config = require('../src/config/env');
const DefaultMeal = require('../src/models/DefaultMeal');

const STARTER_MEALS = [
    { meal_name: 'Oatmeal with Fruits', Tags: ['breakfast', 'sweet', 'vegetarian', 'healthy'] },
    { meal_name: 'Grilled Chicken Salad', Tags: ['lunch', 'light', 'chicken', 'healthy'] },
    { meal_name: 'Spicy Curry with Rice', Tags: ['dinner', 'spicy', 'hot', 'rice', 'comfort food'] },
    { meal_name: 'Vegetable Stir Fry', Tags: ['dinner', 'vegetarian', 'quick', 'salty'] },
    { meal_name: 'Pancakes', Tags: ['breakfast', 'sweet', 'comfort food'] },
    { meal_name: 'Chicken Sandwich', Tags: ['lunch', 'chicken', 'quick'] },
    { meal_name: 'Tomato Soup', Tags: ['dinner', 'soup', 'vegetarian', 'comfort food', 'hot'] }
];

const HIDDEN_MEALS = [
    { meal_name: 'Avocado Toast', Tags: ['breakfast', 'vegetarian', 'quick', 'system_hidden', 'light'] },
    { meal_name: 'Eggs Benedict', Tags: ['breakfast', 'salty', 'comfort food', 'system_hidden'] },
    { meal_name: 'Fruit Smoothie Bowl', Tags: ['breakfast', 'sweet', 'cold', 'healthy', 'system_hidden'] },
    { meal_name: 'Breakfast Burrito', Tags: ['breakfast', 'spicy', 'savoury', 'system_hidden'] },
    { meal_name: 'Sushi Roll Platter', Tags: ['lunch', 'cold', 'rice', 'light', 'system_hidden'] },
    { meal_name: 'Caesar Salad', Tags: ['lunch', 'light', 'vegetarian', 'system_hidden'] },
    { meal_name: 'Beef Tacos', Tags: ['lunch', 'spicy', 'quick', 'system_hidden'] },
    { meal_name: 'Margherita Pizza', Tags: ['lunch', 'vegetarian', 'comfort food', 'system_hidden'] },
    { meal_name: 'Lentil Soup', Tags: ['lunch', 'soup', 'vegetarian', 'hot', 'system_hidden'] },
    { meal_name: 'Spaghetti Carbonara', Tags: ['dinner', 'pasta', 'comfort food', 'system_hidden'] },
    { meal_name: 'Grilled Salmon with Veggies', Tags: ['dinner', 'healthy', 'fish', 'system_hidden'] },
    { meal_name: 'Mushroom Risotto', Tags: ['dinner', 'vegetarian', 'rice', 'comfort food', 'system_hidden'] },
    { meal_name: 'Chicken Tikka Masala', Tags: ['dinner', 'spicy', 'chicken', 'rice', 'system_hidden'] },
    { meal_name: 'Beef Stake with Fries', Tags: ['dinner', 'salty', 'comfort food', 'system_hidden'] },
    { meal_name: 'Pad Thai', Tags: ['dinner', 'spicy', 'noodles', 'system_hidden'] },
    { meal_name: 'Ramen', Tags: ['dinner', 'soup', 'hot', 'comfort food', 'system_hidden'] },
    { meal_name: 'Fish and Chips', Tags: ['dinner', 'salty', 'fried', 'comfort food', 'system_hidden'] }
];

async function seed() {
    try {
        await mongoose.connect(config.mongoUri);
        console.log('Connected to MongoDB');

        // Clear existing default meals
        await DefaultMeal.deleteMany({});
        console.log('Cleared existing default meals');

        // Insert new ones
        await DefaultMeal.insertMany([...STARTER_MEALS, ...HIDDEN_MEALS]);
        console.log('Successfully seeded default meals');

        process.exit(0);
    } catch (err) {
        console.error('Error seeding data:', err);
        process.exit(1);
    }
}

seed();
