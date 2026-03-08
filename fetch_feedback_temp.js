
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://aejuenhqciagpntcqoir.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFlanVlbmhxY2lhZ3BudGNxb2lyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzODQwNzgsImV4cCI6MjA4Nzk2MDA3OH0.-OxgEW5t4alPGlzV_JZDRZcLsQbbMap6jiWjfAVkMMY'

const supabase = createClient(supabaseUrl, supabaseKey)

async function fetchFeedback() {
    console.log("Fetching feedback items from 'user_feedback'...")
    const { data, error } = await supabase
        .from('user_feedback')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) {
        console.error("Error fetching feedback:", error.message)
        process.exit(1)
    }

    if (!data || data.length === 0) {
        console.log("No feedback found.")
    } else {
        console.log(JSON.stringify(data, null, 2))
    }
}

fetchFeedback()
