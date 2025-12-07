const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:/main projects/meal-rescue-plan backend/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyLoginPopulate() {
    const email = `repop_${Date.now()}@example.com`;
    const password = 'password123';

    // 1. Signup (creates meals)
    console.log('1. Signing up...');
    let { data, error } = await supabase.auth.signUp({ email, password });
    if (error) console.error('Signup error', error);

    // 2. Clear meals
    console.log('2. Deleting all meals for user...');
    const userId = data.user.id;
    // Using service role to delete (simulating user deleting all their meals)
    // NOTE: Need service role key for direct deletion if RLS prevents otherwise, 
    // but here we can just use the user token if we want.
    // Let's use service key client for speed/access.
    // Actually, let's just log in as user and delete.
    const token = data.session.access_token;

    // Wait for insertion first...
    await new Promise(r => setTimeout(r, 2000));

    // Delete
    const { error: delError } = await supabase
        .from('meal')
        .delete()
        .eq('user_id', userId);

    if (delError) console.error('Delete error', delError);
    else console.log('Meals deleted.');

    // 3. Login again
    console.log('3. Logging in again...');
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({ email, password });

    // Since we fixed the backend to AWAIT the populate, this login call won't return
    // until the backend 'login' route finishes its await ensureStarterMeals.
    // WAIT! we are calling Supabase Auth directly here?
    // ERROR: Calling supabase.auth.signInWithPassword goes to Supabase Auth Server.
    // It DOES NOT go through my Express Backend's `authController.login`.
    // My Express Backend calls this `ensureStarterMeals` inside its `/api/auth/login` wrapper logic?
    // Let's check `routes/authRoutes.js`.

    // If the frontend uses Supabase Client directly for login, my backend logic NEVER RUNS.
    // If the frontend calls my backend `/api/auth/login`, then it runs.

    // Checking how frontend logs in...
    // Dashboard.jsx uses `supabase.auth.onAuthStateChange` ...
    // App.jsx: `supabase.auth.onAuthStateChange`
    // Login.jsx?

}
// I need to check Login.jsx first before writing this script.
