require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey || serviceRoleKey === 'YOUR_SERVICE_ROLE_KEY_HERE') {
    console.error('❌ ERROR: SUPABASE_SERVICE_ROLE_KEY is missing in .env');
    console.error('You need the Service Role Key to delete users. Find it in your Supabase Dashboard > Project Settings > API.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function wipeAll() {
    console.log('⚠️  STARTING FULL DATA WIPE ⚠️');

    // 1. Delete all rows from public tables
    try {
        console.log('Cleaning `meal` table...');
        const { error: mealError } = await supabase.from('meal').delete().neq('id', 0); // Delete all where id != 0 (hack for "all")
        if (mealError) console.error('Meal delete error:', mealError);
        else console.log('✅ Meals deleted.');

        console.log('Cleaning `user_preferences` table...');
        const { error: prefError } = await supabase.from('user_preferences').delete().neq('user_id', '00000000-0000-0000-0000-000000000000');
        if (prefError) console.error('Preferences delete error:', prefError);
        else console.log('✅ Preferences deleted.');

    } catch (err) {
        console.error('Table cleanup failed:', err);
    }

    // 2. Delete all Auth Users
    try {
        console.log('Fetching all users...');
        const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

        if (listError) throw listError;

        console.log(`Found ${users.length} users. Deleting...`);
        for (const user of users) {
            const { error: delError } = await supabase.auth.admin.deleteUser(user.id);
            if (delError) console.error(`Failed to delete ${user.email}:`, delError.message);
            else console.log(`Deleted user: ${user.email}`);
        }
        console.log('✅ All users deleted.');

    } catch (err) {
        console.error('User cleanup failed:', err);
    }
}

wipeAll();
