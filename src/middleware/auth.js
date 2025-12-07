const { createClient } = require('@supabase/supabase-js');
const config = require('../config/env');

const supabase = createClient(config.supabaseUrl, config.supabaseKey);

const requireAuth = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Authorization token not provided.' });

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return res.status(401).json({ error: 'Invalid or expired token.' });

    req.user = user;
    req.supabase = supabase; // Pass supabase instance if needed
    next();
};

const getSupabase = () => supabase;

module.exports = { requireAuth, getSupabase };
