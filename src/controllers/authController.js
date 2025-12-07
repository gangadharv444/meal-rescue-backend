const { createClient } = require('@supabase/supabase-js');
const config = require('../config/env');
const { getSupabase } = require('../middleware/auth');
const supabase = getSupabase();

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
    // Breakfast
    { meal_name: 'Avocado Toast', Tags: ['breakfast', 'vegetarian', 'quick', 'system_hidden', 'light'] },
    { meal_name: 'Eggs Benedict', Tags: ['breakfast', 'salty', 'comfort food', 'system_hidden'] },
    { meal_name: 'Fruit Smoothie Bowl', Tags: ['breakfast', 'sweet', 'cold', 'healthy', 'system_hidden'] },
    { meal_name: 'Breakfast Burrito', Tags: ['breakfast', 'spicy', 'savoury', 'system_hidden'] },
    // Lunch
    { meal_name: 'Sushi Roll Platter', Tags: ['lunch', 'cold', 'rice', 'light', 'system_hidden'] },
    { meal_name: 'Caesar Salad', Tags: ['lunch', 'light', 'vegetarian', 'system_hidden'] },
    { meal_name: 'Beef Tacos', Tags: ['lunch', 'spicy', 'quick', 'system_hidden'] },
    { meal_name: 'Margherita Pizza', Tags: ['lunch', 'vegetarian', 'comfort food', 'system_hidden'] },
    { meal_name: 'Lentil Soup', Tags: ['lunch', 'soup', 'vegetarian', 'hot', 'system_hidden'] },
    // Dinner
    { meal_name: 'Spaghetti Carbonara', Tags: ['dinner', 'pasta', 'comfort food', 'system_hidden'] },
    { meal_name: 'Grilled Salmon with Veggies', Tags: ['dinner', 'healthy', 'fish', 'system_hidden'] },
    { meal_name: 'Mushroom Risotto', Tags: ['dinner', 'vegetarian', 'rice', 'comfort food', 'system_hidden'] },
    { meal_name: 'Chicken Tikka Masala', Tags: ['dinner', 'spicy', 'chicken', 'rice', 'system_hidden'] },
    { meal_name: 'Beef Stake with Fries', Tags: ['dinner', 'salty', 'comfort food', 'system_hidden'] },
    { meal_name: 'Pad Thai', Tags: ['dinner', 'spicy', 'noodles', 'system_hidden'] },
    { meal_name: 'Ramen', Tags: ['dinner', 'soup', 'hot', 'comfort food', 'system_hidden'] },
    { meal_name: 'Fish and Chips', Tags: ['dinner', 'salty', 'fried', 'comfort food', 'system_hidden'] }
];

const ensureStarterMeals = async (user, session) => {
    try {
        // Check if user already has meals
        const { count, error: countError } = await supabase
            .from('meal')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);

        if (countError) {
            console.error('Error checking meal count:', countError);
            return;
        }

        // Only insert if count is 0
        if (count === 0) {
            console.log(`User ${user.id} has 0 meals. Inserting starter pack...`);
            const userClient = createClient(config.supabaseUrl, config.supabaseKey, {
                global: { headers: { Authorization: `Bearer ${session.access_token}` } }
            });

            const mealsToInsert = [...STARTER_MEALS, ...HIDDEN_MEALS].map(meal => ({
                ...meal,
                user_id: user.id
            }));

            const { error: insertError } = await userClient
                .from('meal')
                .insert(mealsToInsert);

            if (insertError) {
                console.error('Failed to add starter meals:', insertError);
            } else {
                console.log('Starter meals added successfully.');
            }
        }
    } catch (err) {
        console.error('Error in ensureStarterMeals:', err);
    }
};

const signup = async (req, res) => {
    const { email, password } = req.body;
    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) return res.status(400).json({ error: error.message });

    if (data.session && data.user) {
        await ensureStarterMeals(data.user, data.session);
    }

    res.json({ user: data.user, session: data.session });
};

const login = async (req, res) => {
    const { email, password } = req.body;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return res.status(400).json({ error: error.message });

    if (data.session && data.user) {
        // Run as side effect
        await ensureStarterMeals(data.user, data.session);
    }

    res.json({ user: data.user, session: data.session });
};

const ensureDefaults = async (req, res) => {
    // req.user is set by authentication middleware
    // We need a session object with access_token to create the userClient in ensureStarterMeals
    // We can reconstruct a minimal session object from the header token
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token' });

    const session = { access_token: token }; // Minimal session needed for ensureStarterMeals

    await ensureStarterMeals(req.user, session);
    res.json({ message: 'Defaults ensured' });
};

module.exports = { signup, login, ensureDefaults };
