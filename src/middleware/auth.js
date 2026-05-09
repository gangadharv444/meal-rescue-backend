const jwt = require('jsonwebtoken');
const config = require('../config/env');
const User = require('../models/User');

const requireAuth = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Authorization token not provided.' });

    try {
        const decoded = jwt.verify(token, config.jwtSecret);
        const user = await User.findById(decoded.userId);
        if (!user) {
            return res.status(401).json({ error: 'User not found.' });
        }
        
        req.user = { id: user._id.toString(), email: user.email };
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid or expired token.' });
    }
};

module.exports = { requireAuth };
