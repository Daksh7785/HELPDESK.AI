
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://aejuenhqciagpntcqoir.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFlanVlbmhxY2lhZ3BudGNxb2lyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzODQwNzgsImV4cCI6MjA4Nzk2MDA3OH0.-OxgEW5t4alPGlzV_JZDRZcLsQbbMap6jiWjfAVkMMY'

const supabase = createClient(supabaseUrl, supabaseKey)

async function diagnose() {
    // 1. Check ALL Profiles
    console.log("\n1. All Profiles:")
    const { data: profiles, error: pErr } = await supabase.from('profiles').select('id, email, full_name, role, status, company, company_id')
    if (pErr) console.error("Error fetching profiles:", pErr.message)
    else console.table(profiles)

    // 2. Check ALL Companies
    console.log("\n2. All Companies:")
    const { data: companies, error: cErr } = await supabase.from('companies').select('*')
    if (cErr) console.error("Error fetching companies:", cErr.message)
    else console.table(companies)
}

diagnose()
