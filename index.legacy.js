const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const cors = require('cors');

// --- Define All Keys and Clients *ONCE* at the Top ---
const supabaseUrl = 'https://uzayyhkfvdpeiwxifzza.supabase.co'; 
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6YXl5aGtmdmRwZWl3eGlmenphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxMjAyMTUsImV4cCI6MjA3MzY5NjIxNX0.OdJfp_1qpN4qHX-gWHZX7uRM_h34iKig20XNYh2DkKo';
const WEATHER_API_KEY = '4dfce3b04efb70f5a4cda05dff25f324'; // <-- PASTE YOUR KEY HERE
const supabase = createClient(supabaseUrl, supabaseKey);
// ---------------------------------------------------

const app = express();
const PORT = 3001;

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- API Routes ---
app.get('/api', (req, res) => {
  res.send('Meal Plan Rescue API is running!');
});

app.post('/api/signup', async (req, res) => {
  const { email, password } = req.body;
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return res.status(400).json({ error: error.message });
  res.json({ user: data.user, session: data.session });
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return res.status(400).json({ error: error.message });
  res.json({ user: data.user, session: data.session });
});

// POST /api/meals
app.post('/api/meals', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Authorization token not provided.' });

  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user) return res.status(401).json({ error: 'Invalid or expired token.' });

  const { mealName, Tags } = req.body;
  if (!mealName) return res.status(400).json({ error: 'Meal name is required.' });

  const { data: newMeal, error: insertError } = await supabase
    .from('meal') 
    .insert({ meal_name: mealName, user_id: user.id, Tags: Tags })
    .select()
    .single();

  if (insertError) return res.status(500).json({ error: insertError.message });
  res.json(newMeal);
});

// GET /api/meals
app.get('/api/meals', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Authorization token not provided.' });

  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user) return res.status(401).json({ error: 'Invalid or expired token.' });

  const { data: meals, error: selectError } = await supabase
    .from('meal')
    .select('*')
    .eq('user_id', user.id); 

  if (selectError) return res.status(500).json({ error: selectError.message });
  res.json(meals);
});

// PUT /api/meals/:id
app.put('/api/meals/:id', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Authorization token not provided.' });

  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user) return res.status(401).json({ error: 'Invalid or expired token.' });

  const mealId = req.params.id;
  const { mealName, Tags } = req.body; 

  const updateData = {};
  if (mealName) updateData.meal_name = mealName;
  if (Tags) updateData.Tags = Tags;

  const { data: updatedMeal, error: updateError } = await supabase
    .from('meal')
    .update(updateData)
    .eq('user_id', user.id)
    .eq('id', mealId)
    .select()
    .single();

  if (updateError) return res.status(500).json({ error: updateError.message });
  if (!updatedMeal) return res.status(404).json({ error: 'Meal not found or you do not have permission to edit it.' });

  res.json(updatedMeal);
});

// DELETE /api/meals/:id
app.delete('/api/meals/:id', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Authorization token not provided.' });

  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user) return res.status(401).json({ error: 'Invalid or expired token.' });

  const mealId = req.params.id;

  const { error, count } = await supabase
    .from('meal')
    .delete()
    .eq('user_id', user.id)
    .eq('id', mealId);

  if (error) return res.status(500).json({ error: error.message });
  if (count === 0) return res.status(404).json({ error: 'Meal not found or you do not have permission to delete it.' });

  res.status(200).json({ message: 'Meal successfully deleted.' });
});

// GET /api/default-meals
app.get('/api/default-meals', async (req, res) => {
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
});

// GET /api/suggestion/weather
app.get('/api/suggestion/weather', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Authorization token not provided.' });

  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user) return res.status(401).json({ error: 'Invalid or expired token.' });

  try {
    const { lat, lon } = req.query;
    if (!lat || !lon) return res.status(400).json({ error: 'Latitude and longitude (lat, lon) are required.' });

    const weatherResponse = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}&units=metric`
    );
    const weatherMain = weatherResponse.data.weather[0].main;
    const temp = weatherResponse.data.main.temp;

    let weatherSearchTags = [];
    if (weatherMain === 'Rain' || weatherMain === 'Drizzle' || temp < 20) {
      weatherSearchTags = ['soup', 'spicy', 'rice', 'hot', 'comfort food'];
    } else if (weatherMain === 'Clear' && temp > 28) {
      weatherSearchTags = ['salad', 'yogurt', 'cold', 'light'];
    } else {
      weatherSearchTags = ['quick', 'vegetarian', 'chicken', 'salty'];
    }

    const currentHour = new Date().getHours(); 
    let timeSearchTag = '';
    if (currentHour >= 5 && currentHour < 11) timeSearchTag = 'breakfast';
    else if (currentHour >= 11 && currentHour < 16) timeSearchTag = 'lunch';
    else timeSearchTag = 'dinner';
    
    const { data: meals, error: mealError } = await supabase
      .from('meal')
      .select('*')
      .eq('user_id', user.id)
      .overlaps('Tags', weatherSearchTags)
      .contains('Tags', [timeSearchTag]);

    if (mealError) throw mealError;
    if (!meals || meals.length === 0) {
      return res.status(404).json({ message: `No meals found for ${timeSearchTag} and the current weather. Try adding more meals!` });
    }

    const randomMeal = meals[Math.floor(Math.random() * meals.length)];
    res.json(randomMeal);

  } catch (error) {
    if (error.response && error.response.status === 401) {
      return res.status(500).json({ error: 'Failed to get suggestion.', details: 'Invalid OpenWeatherMap API key.' });
    }
    console.error('*** WEATHER SUGGESTION FAILED ***:', error);
    res.status(500).json({ error: 'Failed to get weather suggestion.', details: error.message });
  }
});

// GET /api/preferences
app.get('/api/preferences', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token required.' });

  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user) return res.status(401).json({ error: 'Invalid token.' });

  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error && error.code === 'PGRST1T6') { // Fixed typo PGRST116
    return res.json({ user_id: user.id, no_repeat_days: 7, theme_days: null });
  }
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// PUT /api/preferences
app.put('/api/preferences', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token required.' });

  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user) return res.status(401).json({ error: 'Invalid token.' });

  const { no_repeat_days, theme_days } = req.body;

  const { data, error } = await supabase
    .from('user_preferences')
    .upsert({ user_id: user.id, no_repeat_days: no_repeat_days, theme_days: theme_days })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /api/plan/generate
app.get('/api/plan/generate', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token required.' });
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user) return res.status(401).json({ error: 'Invalid token.' });
  
  try {
    const { data: preferences, error: prefError } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (prefError && prefError.code !== 'PGRST116') throw prefError;
    
    const noRepeatDays = preferences?.no_repeat_days || 7;
    const themeDays = preferences?.theme_days || {};

    const { data: allMeals, error: mealError } = await supabase
      .from('meal')
      .select('*')
      .eq('user_id', user.id);
    
    if (mealError) throw mealError;
    if (!allMeals || allMeals.length === 0) {
      return res.status(404).json({ error: "You don't have any meals in your vault to generate a plan." });
    }

    const fullPlan = [];
    let usedMealIds = [];
    const mealTimes = ['breakfast', 'lunch', 'dinner'];
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(Date.now() + i * 24*60*60*1000);
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
    console.error('*** PLAN GENERATOR FAILED ***:', error);
    res.status(500).json({ error: 'Failed to generate plan.', details: error.message });
  }
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`);
});