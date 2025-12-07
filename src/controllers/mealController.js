const axios = require('axios');
const config = require('../config/env');
const { getSupabase } = require('../middleware/auth');
const supabase = getSupabase();

const createMeal = async (req, res) => {
    const user = req.user;
    const { mealName, Tags } = req.body;
    if (!mealName) return res.status(400).json({ error: 'Meal name is required.' });

    const { data: newMeal, error } = await supabase
        .from('meal')
        .insert({ meal_name: mealName, user_id: user.id, Tags: Tags })
        .select()
        .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json(newMeal);
};

const getMeals = async (req, res) => {
    const user = req.user;
    const { data: meals, error } = await supabase
        .from('meal')
        .select('*')
        .eq('user_id', user.id)
        .not('Tags', 'cs', '{"system_hidden"}'); // Filter out system hidden meals

    if (error) return res.status(500).json({ error: error.message });
    res.json(meals);
};

const updateMeal = async (req, res) => {
    const user = req.user;
    const mealId = req.params.id;
    const { mealName, Tags } = req.body;

    const updateData = {};
    if (mealName) updateData.meal_name = mealName;
    if (Tags) updateData.Tags = Tags;

    const { data: updatedMeal, error } = await supabase
        .from('meal')
        .update(updateData)
        .eq('user_id', user.id)
        .eq('id', mealId)
        .select()
        .single();

    if (error) return res.status(500).json({ error: error.message });
    if (!updatedMeal) return res.status(404).json({ error: 'Meal not found or permission denied.' });
    res.json(updatedMeal);
};

const deleteMeal = async (req, res) => {
    const user = req.user;
    const mealId = req.params.id;

    const { error, count } = await supabase
        .from('meal')
        .delete()
        .eq('user_id', user.id)
        .eq('id', mealId);

    if (error) return res.status(500).json({ error: error.message });
    if (count === 0) return res.status(404).json({ error: 'Meal not found or permission denied.' });
    res.status(200).json({ message: 'Meal successfully deleted.' });
};

const getDefaultMeals = async (req, res) => {
    const { tag } = req.query;
    if (!tag) return res.status(400).json({ error: 'A tag (spicy, sweet, or salty) is required.' });

    try {
        const { data: meals, error } = await supabase
            .from('default_meals')
            .select('meal_name, Tags')
            .contains('Tags', [tag]);

        if (error) throw error;
        res.json(meals);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get default meals.', details: error.message });
    }
};

const getWeatherSuggestion = async (req, res) => {
    const user = req.user;
    try {
        const { lat, lon } = req.query;
        let timePeriod = req.query.timePeriod;
        let excludeMealId = req.query.excludeId;
        let dietType = req.query.dietType || 'anything';

        if (!lat || !lon) return res.status(400).json({ error: 'Latitude and longitude required.' });

        // Get Weather
        const weatherResponse = await axios.get(
            `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${config.weatherApiKey}&units=metric`
        );
        const weather = weatherResponse.data;
        const weatherDesc = weather.weather[0].description;
        const temp = weather.main.temp;

        // Determine Time if not provided
        if (!timePeriod) {
            const currentHour = new Date().getHours();
            if (currentHour >= 5 && currentHour < 11) timePeriod = 'breakfast';
            else if (currentHour >= 11 && currentHour < 16) timePeriod = 'lunch';
            else timePeriod = 'dinner';
        }

        // Base Query
        let query = supabase
            .from('meal')
            .select('*')
            .eq('user_id', user.id)
            .contains('Tags', [timePeriod]);

        // Apply Diet Filter directly in DB if possible (for Vegetarian)
        if (dietType === 'vegetarian') {
            query = query.contains('Tags', ['vegetarian']);
        }

        const { data: meals, error: mealError } = await query;

        if (mealError) throw mealError;

        // Apply Negative Filters in JS (Supabase negation on array contents is tricky)
        let filteredMeals = meals;
        if (dietType === 'non-vegetarian') {
            filteredMeals = meals.filter(m => !m.Tags.includes('vegetarian'));
        }

        // If no meals for this time/diet, we can't suggest anything useful
        if (!filteredMeals || filteredMeals.length === 0) {
            return res.status(404).json({ message: `No ${dietType} meals found for ${timePeriod}. Add some first!` });
        }

        // Update variable reference for subsequent logic
        const finalMeals = filteredMeals;

        // --- AI LOGIC START ---
        if (config.geminiApiKey && config.geminiApiKey !== 'YOUR_GEMINI_API_KEY_HERE') {
            try {
                const { GoogleGenerativeAI } = require('@google/generative-ai');
                const genAI = new GoogleGenerativeAI(config.geminiApiKey);
                const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

                const prompt = `
                Context:
                - Weather: ${temp}°C, ${weatherDesc}
                - Time: ${timePeriod}
                - User Meals: ${JSON.stringify(finalMeals.map(m => ({ id: m.id, name: m.meal_name, tags: m.Tags })))}

                Task:
                Select the single best meal from the list that fits the current weather and mood.
                Provide a short 1-sentence friendly reasoning used for the UI.
                
                Output JSON ONLY:
                { "selected_meal_id": "ID", "reasoning": "Reason..." }
                `;

                const result = await model.generateContent(prompt);
                const responseText = result.response.text();
                const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
                const aiDecision = JSON.parse(cleanJson);

                const selectedMeal = finalMeals.find(m => m.id === aiDecision.selected_meal_id);
                if (selectedMeal) {
                    return res.json({ ...selectedMeal, reasoning: aiDecision.reasoning, ai_powered: true });
                }
            } catch (aiError) {
                console.error('AI Generation Failed, falling back to rule-based:', aiError.message);
            }
        }
        // --- AI LOGIC END ---

        // Fallback Logic (Original Rule-Based)
        console.log('Using rule-based fallback');

        let weatherSearchTags = [];
        let weatherMain = '';
        if (weather.weather && weather.weather.length > 0) {
            weatherMain = weather.weather[0].main;
        }

        if (weatherMain === 'Rain' || weatherMain === 'Drizzle' || temp < 20) {
            weatherSearchTags = ['soup', 'spicy', 'rice', 'hot', 'comfort food'];
        } else if (weatherMain === 'Clear' && temp > 28) {
            weatherSearchTags = ['salad', 'yogurt', 'cold', 'light'];
        } else {
            weatherSearchTags = ['quick', 'vegetarian', 'chicken', 'salty'];
        }

        // Filter valid candidates from the already fetched time-based meals
        let candidates = finalMeals.filter(m => m.Tags && m.Tags.some(t => weatherSearchTags.includes(t)));

        // Exclude the meal if ID matches
        if (excludeMealId) {
            candidates = candidates.filter(m => m.id.toString() !== excludeMealId);
        }

        // If no weather match, fallback to any meal from that time
        if (candidates.length === 0) {
            candidates = finalMeals;
            if (excludeMealId) candidates = candidates.filter(m => m.id.toString() !== excludeMealId);
        }

        // If still empty, reset
        if (candidates.length === 0) candidates = finalMeals;

        const randomMeal = candidates[Math.floor(Math.random() * candidates.length)];
        res.json({ ...randomMeal, reasoning: `It's ${temp}°C and ${weatherDesc}, so we picked this for you!`, ai_powered: false });

    } catch (error) {
        if (error.response && error.response.status === 401) {
            return res.status(500).json({ error: 'Weather API Error', details: 'Invalid OpenWeatherMap API key.' });
        }
        console.error('Weather Suggestion Failed:', error);
        res.status(500).json({ error: 'Failed to get suggestion.', details: error.message });
    }
};

const generatePlan = async (req, res) => {
    const user = req.user;
    try {
        const { data: preferences, error: prefError } = await supabase
            .from('user_preferences')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (prefError && prefError.code !== 'PGRST116') throw prefError;

        const noRepeatDays = preferences?.no_repeat_days || 7;
        const themeDays = preferences?.theme_days || {};

        const dietType = req.query.dietType || 'anything';

        let query = supabase
            .from('meal')
            .select('*')
            .eq('user_id', user.id);

        if (dietType === 'vegetarian') {
            query = query.contains('Tags', ['vegetarian']);
        }

        const { data: rawMeals, error: mealError } = await query;

        if (mealError) throw mealError;

        let allMeals = rawMeals;
        if (dietType === 'non-vegetarian') {
            allMeals = rawMeals.filter(m => !m.Tags.includes('vegetarian'));
        }

        if (!allMeals || allMeals.length === 0) {
            return res.status(404).json({ error: `No ${dietType} meals found to generate a plan.` });
        }



        const fullPlan = [];
        let usedMealIds = [];
        const mealTimes = ['breakfast', 'lunch', 'dinner'];
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

        for (let i = 0; i < 7; i++) {
            const date = new Date(Date.now() + i * 24 * 60 * 60 * 1000);
            const dayName = dayNames[date.getDay()];

            const dayPlan = {
                date: date.toLocaleDateString(),
                day: dayName,
                breakfast: null,
                lunch: null,
                dinner: null
            };

            for (const timeTag of mealTimes) {
                const themeTag = themeDays[dayName] || null;

                let candidates = allMeals.filter(meal => {
                    if (!meal.Tags) return false;
                    const timeMatch = meal.Tags.includes(timeTag);
                    const notRepeated = !usedMealIds.slice(-noRepeatDays).includes(meal.id);
                    const themeMatch = !themeTag || meal.Tags.includes(themeTag);
                    return timeMatch && notRepeated && themeMatch;
                });

                if (candidates.length === 0) {
                    candidates = allMeals.filter(meal => {
                        if (!meal.Tags) return false;
                        const timeMatch = meal.Tags.includes(timeTag);
                        const notRepeated = !usedMealIds.slice(-noRepeatDays).includes(meal.id);
                        return timeMatch && notRepeated;
                    });
                }

                if (candidates.length > 0) {
                    const randomMeal = candidates[Math.floor(Math.random() * candidates.length)];
                    dayPlan[timeTag] = randomMeal;
                    usedMealIds.push(randomMeal.id);
                }
            }
            fullPlan.push(dayPlan);
        }

        res.json(fullPlan);

    } catch (error) {
        console.error('Plan Generation Failed:', error);
        res.status(500).json({ error: 'Failed to generate plan.', details: error.message });
    }
};

module.exports = {
    createMeal,
    getMeals,
    updateMeal,
    deleteMeal,
    getDefaultMeals,
    getWeatherSuggestion,
    generatePlan
};
