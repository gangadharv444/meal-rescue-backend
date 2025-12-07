require('dotenv').config();

const config = {
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseKey: process.env.SUPABASE_KEY,
    weatherApiKey: process.env.WEATHER_API_KEY,
    geminiApiKey: process.env.GEMINI_API_KEY,
    port: process.env.PORT || 3001,
};

if (!config.supabaseUrl || !config.supabaseKey) {
    console.error('Missing Supabase configuration. Check your .env file.');
    process.exit(1);
}

module.exports = config;
