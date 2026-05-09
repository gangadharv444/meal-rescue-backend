require('dotenv').config();

const config = {
    mongoUri: process.env.MONGODB_URI,
    jwtSecret: process.env.JWT_SECRET || 'fallback_secret_for_development',
    weatherApiKey: process.env.WEATHER_API_KEY,
    geminiApiKey: process.env.GEMINI_API_KEY,
    port: process.env.PORT || 3001,
};

if (!config.mongoUri) {
    console.error('Missing MONGODB_URI configuration. Check your .env file.');
    process.exit(1);
}

module.exports = config;
