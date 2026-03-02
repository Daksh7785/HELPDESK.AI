const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = fs.readFileSync('./Frontend/.env', 'utf-8');
const url = dotenv.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = dotenv.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(url, key);

async function checkTypes() {
    console.log("Checking schema types...");
    const { data: tickets, error: ticketError } = await supabase.from('tickets').select('*').limit(1);
    if (ticketError) console.error("Ticket Error:", ticketError);
    else console.log("Tickets sample structure:", Object.keys(tickets[0] || {}));

    const { data: messages, error: msgError } = await supabase.from('ticket_messages').select('*').limit(1);
    if (msgError) console.error("Message Error:", msgError);
    else console.log("Messages sample structure:", Object.keys(messages[0] || {}));

    if (tickets && tickets[0]) {
        console.log("Ticket ID type:", typeof tickets[0].id, "Value:", tickets[0].id);
    }
}

checkTypes();
