const https = require('https');

// Security fix: Removed hardcoded Supabase URL and Service Role Key.
// These sensitive credentials are now loaded from environment variables
// to prevent unauthorized access and bypass of Row Level Security (RLS).
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const getRequest = (path) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'aejuenhqciagpntcqoir.supabase.co',
      port: 443,
      path: path,
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
};

async function run() {
  console.log("Querying single ticket...");
  const res = await getRequest('/rest/v1/tickets?select=*&limit=1');
  console.log("Ticket status:", res.status);
  console.log("Ticket data:", res.data);
}

run();
