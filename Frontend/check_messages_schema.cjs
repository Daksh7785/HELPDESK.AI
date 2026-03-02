const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './Frontend/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
    console.log("Checking ticket_messages columns...");
    const { data, error } = await supabase
        .from('ticket_messages')
        .select('*')
        .limit(1);

    if (error) {
        console.error("Error:", error);
        if (error.code === 'PGRST116') {
            console.log("Table is empty, trying to fetch schema info via RPC or just returning error.");
        }
    } else {
        console.log("Found row, columns are:", Object.keys(data[0] || {}));
    }
}

checkColumns();
