const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const mealRoutes = require('./routes/mealRoutes');
const preferenceRoutes = require('./routes/preferenceRoutes');

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api', authRoutes);
app.use('/api', mealRoutes);
app.use('/api/preferences', preferenceRoutes); // Note: preference routes were at /api/preferences in index.js, and my router handles / and put /

app.get('/api', (req, res) => {
    res.send('Meal Rescue API is running (Refactored)!');
});

module.exports = app;
