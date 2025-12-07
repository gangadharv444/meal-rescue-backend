const { getSupabase } = require('../middleware/auth');
const supabase = getSupabase();

const getPreferences = async (req, res) => {
    const user = req.user; // Set by requireAuth middleware

    const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

    if (error && error.code === 'PGRST116') {
        return res.json({ user_id: user.id, no_repeat_days: 7, theme_days: null });
    }
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
};

const updatePreferences = async (req, res) => {
    const user = req.user;
    const { no_repeat_days, theme_days } = req.body;

    const { data, error } = await supabase
        .from('user_preferences')
        .upsert({ user_id: user.id, no_repeat_days, theme_days })
        .select()
        .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
};

module.exports = { getPreferences, updatePreferences };
