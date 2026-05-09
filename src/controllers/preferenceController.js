const Preference = require('../models/Preference');

const getPreferences = async (req, res) => {
    try {
        const user = req.user;
        let pref = await Preference.findOne({ user_id: user.id });

        if (!pref) {
            return res.json({ user_id: user.id, no_repeat_days: 7, theme_days: {} });
        }
        res.json(pref);
    } catch (error) {
        console.error('Error getting preferences:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

const updatePreferences = async (req, res) => {
    try {
        const user = req.user;
        const { no_repeat_days, theme_days } = req.body;

        const pref = await Preference.findOneAndUpdate(
            { user_id: user.id },
            { no_repeat_days, theme_days },
            { new: true, upsert: true }
        );

        res.json(pref);
    } catch (error) {
        console.error('Error updating preferences:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

module.exports = { getPreferences, updatePreferences };
