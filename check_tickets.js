
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://aejuenhqciagpntcqoir.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFlanVlbmhxY2lhZ3BudGNxb2lyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzODQwNzgsImV4cCI6MjA4Nzk2MDA3OH0.-OxgEW5t4alPGlzV_JZDRZcLsQbbMap6jiWjfAVkMMY'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkTickets() {
    console.log("Fetching all tickets...")
    const { data: tickets, error } = await supabase.from('tickets').select('*').limit(5)

    if (error) {
        console.error("Error fetching tickets:", error.message)
    } else {
        console.log(`Found ${tickets.length} tickets (showing up to 5).`)
        console.log(JSON.stringify(tickets, null, 2))
    }
}

checkTickets()
