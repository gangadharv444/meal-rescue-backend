const axios = require('axios');
const config = require('../config/env');
const Meal = require('../models/Meal');
const DefaultMeal = require('../models/DefaultMeal');
const Preference = require('../models/Preference');

const createMeal = async (req, res) => {
    try {
        const user = req.user;
        const { mealName, Tags } = req.body;
        if (!mealName) return res.status(400).json({ error: 'Meal name is required.' });

        const newMeal = new Meal({
            meal_name: mealName,
            user_id: user.id,
            Tags: Tags || []
        });

        await newMeal.save();

        // Standardize output to match expected frontend structure id -> _id
        const mealObj = newMeal.toObject();
        mealObj.id = mealObj._id.toString();
        
        res.status(201).json(mealObj);
    } catch (error) {
        console.error('Error creating meal:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

const getMeals = async (req, res) => {
    try {
        const user = req.user;
        const meals = await Meal.find({
            user_id: user.id,
            Tags: { $nin: ['cs', 'system_hidden'] }
        });

        // Map _id to id for frontend compatibility
        const mappedMeals = meals.map(m => {
            const obj = m.toObject();
            obj.id = obj._id.toString();
            return obj;
        });

        res.json(mappedMeals);
    } catch (error) {
        console.error('Error getting meals:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

const updateMeal = async (req, res) => {
    try {
        const user = req.user;
        const mealId = req.params.id;
        const { mealName, Tags } = req.body;

        const updateData = {};
        if (mealName) updateData.meal_name = mealName;
        if (Tags) updateData.Tags = Tags;

        const updatedMeal = await Meal.findOneAndUpdate(
            { _id: mealId, user_id: user.id },
            updateData,
            { new: true }
        );

        if (!updatedMeal) return res.status(404).json({ error: 'Meal not found or permission denied.' });
        
        const mealObj = updatedMeal.toObject();
        mealObj.id = mealObj._id.toString();

        res.json(mealObj);
    } catch (error) {
        console.error('Error updating meal:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

const deleteMeal = async (req, res) => {
    try {
        const user = req.user;
        const mealId = req.params.id;

        const deleted = await Meal.findOneAndDelete({ _id: mealId, user_id: user.id });

        if (!deleted) return res.status(404).json({ error: 'Meal not found or permission denied.' });
        res.status(200).json({ message: 'Meal successfully deleted.' });
    } catch (error) {
        console.error('Error deleting meal:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

const getDefaultMeals = async (req, res) => {
    try {
        const { tag } = req.query;
        if (!tag) return res.status(400).json({ error: 'A tag (spicy, sweet, or salty) is required.' });

        const meals = await DefaultMeal.find({ Tags: { $in: [tag] } }, 'meal_name Tags');
        res.json(meals);
    } catch (error) {
        console.error('Error getting default meals:', error);
        res.status(500).json({ error: 'Server error' });
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
        const query = { user_id: user.id, Tags: { $in: [timePeriod] } };
        
        if (dietType === 'vegetarian') {
            query.Tags.$all = [timePeriod, 'vegetarian']; // Need both timePeriod and vegetarian
        }

        let rawMeals = await Meal.find(query);
        let meals = rawMeals.map(m => {
            const obj = m.toObject();
            obj.id = obj._id.toString();
            return obj;
        });

        // Apply Negative Filters
        if (dietType === 'non-vegetarian') {
            meals = meals.filter(m => !m.Tags.includes('vegetarian'));
        }

        if (!meals || meals.length === 0) {
            return res.status(404).json({ message: `No ${dietType} meals found for ${timePeriod}. Add some first!` });
        }

        const finalMeals = meals;

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

        // Fallback Logic
        console.log('Using rule-based fallback');
        let weatherSearchTags = [];
        let weatherMain = weather.weather && weather.weather.length > 0 ? weather.weather[0].main : '';

        if (weatherMain === 'Rain' || weatherMain === 'Drizzle' || temp < 20) {
            weatherSearchTags = ['soup', 'spicy', 'rice', 'hot', 'comfort food'];
        } else if (weatherMain === 'Clear' && temp > 28) {
            weatherSearchTags = ['salad', 'yogurt', 'cold', 'light'];
        } else {
            weatherSearchTags = ['quick', 'vegetarian', 'chicken', 'salty'];
        }

        let candidates = finalMeals.filter(m => m.Tags && m.Tags.some(t => weatherSearchTags.includes(t)));

        if (excludeMealId) {
            candidates = candidates.filter(m => m.id !== excludeMealId);
        }

        if (candidates.length === 0) {
            candidates = finalMeals;
            if (excludeMealId) candidates = candidates.filter(m => m.id !== excludeMealId);
        }

        if (candidates.length === 0) candidates = finalMeals;

        const randomMeal = candidates[Math.floor(Math.random() * candidates.length)];
        res.json({ ...randomMeal, reasoning: `It's ${temp}°C and ${weatherDesc}, so we picked this for you!`, ai_powered: false });

    } catch (error) {
        console.error('Weather Suggestion Failed:', error);
        res.status(500).json({ error: 'Failed to get suggestion.', details: error.message });
    }
};

const generatePlan = async (req, res) => {
    const user = req.user;
    try {
        const pref = await Preference.findOne({ user_id: user.id });
        const noRepeatDays = pref?.no_repeat_days || 7;
        const themeDays = pref?.theme_days || {};

        const dietType = req.query.dietType || 'anything';

        let query = { user_id: user.id };
        if (dietType === 'vegetarian') {
            query.Tags = { $in: ['vegetarian'] };
        }

        const rawMeals = await Meal.find(query);
        let allMeals = rawMeals.map(m => {
            const obj = m.toObject();
            obj.id = obj._id.toString();
            return obj;
        });

        if (dietType === 'non-vegetarian') {
            allMeals = allMeals.filter(m => !m.Tags.includes('vegetarian'));
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
