import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../backend/.env') });

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;

if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(url, key);

async function checkSchema() {
  console.log("Checking 'tickets' table columns...");
  // Trick: select 1 row to see keys
  const { data, error } = await supabase.from('tickets').select('*').limit(1);
  
  if (error) {
    console.error("Error fetching tickets:", error);
    return;
  }
  
  if (data && data.length > 0) {
    console.log("Columns found:", Object.keys(data[0]));
  } else {
    console.log("No data found in 'tickets' table. Checking rpc if available...");
  }
}

checkSchema();
