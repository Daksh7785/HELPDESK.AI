import fs from 'fs';

function parseEnv(filePath) {
    if (!fs.existsSync(filePath)) return {};
    const content = fs.readFileSync(filePath, 'utf8');
    const result = {};
    for (const line of content.split('\n')) {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
            let val = match[2] || '';
            if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
            else if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
            result[match[1]] = val;
        }
    }
    return result;
}

const envConfig = parseEnv('.env.prod.local');
const envConfig2 = parseEnv('.env.vercel.local');
const env = { ...envConfig2, ...envConfig };


async function testGemini(key) {
    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: "hi" }] }] })
        });
        if (!res.ok) {
            const err = await res.text();
            return `FAILED (${res.status}: ${err.substring(0, 50)})`;
        }
        return 'WORKING \u2705';
    } catch(e) { return `FAILED (${e.message})`; }
}

async function testOpenRouter(key) {
    try {
        const res = await fetch(`https://openrouter.ai/api/v1/chat/completions`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: 'google/gemma-2-9b-it:free', messages: [{role: "user", content: "hi"}] })
        });
        if (!res.ok) {
            const err = await res.text();
            return `FAILED (${res.status}: ${err.substring(0, 50)})`;
        }
        return 'WORKING \u2705';
    } catch(e) { return `FAILED (${e.message})`; }
}

async function testGroq(key) {
    try {
        const res = await fetch(`https://api.groq.com/openai/v1/chat/completions`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: 'llama-3.1-8b-instant', messages: [{role: "user", content: "hi"}] })
        });
        if (!res.ok) {
            const err = await res.text();
            return `FAILED (${res.status}: ${err.substring(0, 50)})`;
        }
        return 'WORKING \u2705';
    } catch(e) { return `FAILED (${e.message})`; }
}

async function run() {
    console.log("=== API KEY DIAGNOSTICS ===");
    const keys = Object.keys(env);
    
    for (const k of keys) {
        if (!env[k]) continue;
        if (k.startsWith('VITE_GEMINI_API_KEY')) {
            const status = await testGemini(env[k]);
            console.log(`[Gemini] ${k}: ${status}`);
        }
        if (k.startsWith('VITE_OPENROUTER_API_KEY')) {
            const status = await testOpenRouter(env[k]);
            console.log(`[OpenRouter] ${k}: ${status}`);
        }
        if (k.startsWith('VITE_GROQ_API_KEY')) {
            const status = await testGroq(env[k]);
            console.log(`[Groq] ${k}: ${status}`);
        }
    }
}

run();
