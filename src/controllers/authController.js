const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Meal = require('../models/Meal');
const DefaultMeal = require('../models/DefaultMeal');
const config = require('../config/env');

const generateToken = (userId) => {
    return jwt.sign({ userId }, config.jwtSecret, { expiresIn: '7d' });
};

const ensureStarterMeals = async (userId) => {
    try {
        const count = await Meal.countDocuments({ user_id: userId });
        if (count === 0) {
            console.log(`User ${userId} has 0 meals. Inserting starter pack...`);
            const defaultMeals = await DefaultMeal.find({});
            if (defaultMeals.length > 0) {
                const mealsToInsert = defaultMeals.map(dm => ({
                    user_id: userId,
                    meal_name: dm.meal_name,
                    Tags: dm.Tags
                }));
                await Meal.insertMany(mealsToInsert);
                console.log('Starter meals added successfully.');
            } else {
                console.warn('No default meals found in DB. Please run the seed script.');
            }
        }
    } catch (err) {
        console.error('Error in ensureStarterMeals:', err);
    }
};

const signup = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already in use' });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const newUser = new User({ email, passwordHash });
        await newUser.save();

        const token = generateToken(newUser._id);
        
        // Setup initial meals
        await ensureStarterMeals(newUser._id);

        res.status(201).json({ 
            user: { id: newUser._id, email: newUser.email }, 
            session: { access_token: token } 
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: 'Server error during signup' });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        const token = generateToken(user._id);

        await ensureStarterMeals(user._id);

        res.json({ 
            user: { id: user._id, email: user.email }, 
            session: { access_token: token } 
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error during login' });
    }
};

const ensureDefaults = async (req, res) => {
    // req.user is set by auth middleware
    await ensureStarterMeals(req.user.id);
    res.json({ message: 'Defaults ensured' });
};

module.exports = { signup, login, ensureDefaults };
