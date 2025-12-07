# Meal Rescue Backend

A modular Express.js backend for the Meal Rescue application.

## Project Structure

```
meal-rescue-plan backend/
├── src/
│   ├── server.js              # Server entry point
│   ├── app.js                 # Express app configuration
│   ├── config/
│   │   └── env.js            # Environment configuration
│   ├── controllers/
│   │   ├── authController.js  # Authentication logic
│   │   ├── mealController.js  # Meal management logic
│   │   └── preferenceController.js # User preferences logic
│   ├── middleware/
│   │   └── auth.js           # Authentication middleware
│   └── routes/
│       ├── authRoutes.js     # Auth endpoints
│       ├── mealRoutes.js     # Meal endpoints
│       └── preferenceRoutes.js # Preference endpoints
├── .env                       # Environment variables (not in git)
├── index.legacy.js           # Legacy monolithic server (backup)
└── package.json
```

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory with:
```
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
WEATHER_API_KEY=your_weather_api_key
GEMINI_API_KEY=your_gemini_api_key
PORT=3001
```

### 3. Start the Server
```bash
npm start
```

The server will run on `http://0.0.0.0:3001`

## API Endpoints

### Authentication
- `POST /api/signup` - User registration
- `POST /api/login` - User login
- `POST /api/ensure-defaults` - Ensure default meals for user

### Meals
- `POST /api/meals` - Create a meal
- `GET /api/meals` - Get user's meals
- `PUT /api/meals/:id` - Update a meal
- `DELETE /api/meals/:id` - Delete a meal
- `GET /api/default-meals?tag=<tag>` - Get default meals by tag
- `GET /api/suggestion/weather?lat=<lat>&lon=<lon>` - Get weather-based suggestion

### Preferences
- `GET /api/preferences` - Get user preferences
- `PUT /api/preferences` - Update user preferences

### Meal Plan
- `GET /api/plan/generate` - Generate 7-day meal plan

## Architecture Benefits

✅ **Modular Structure** - Organized by feature (routes, controllers, middleware)
✅ **Separation of Concerns** - Each file has a single responsibility
✅ **Easy to Test** - Controllers can be tested independently
✅ **Scalable** - Easy to add new features without cluttering code
✅ **Maintainable** - Clear file organization makes debugging easier

## Migration Notes

This project was refactored from a monolithic `index.js` file to a modular structure. The original code is preserved in `index.legacy.js` as a backup.
