
import dotenv from 'dotenv';
dotenv.config();

const VEXA_BASE = 'https://api.cloud.vexa.ai';
const VEXA_KEY = (process.env.VEXA_API_KEY || '').trim();
const GROQ_KEY = (process.env.GROQ_API_KEY || '').trim();

async function checkVexa() {
    console.log('--- Checking VEXA ---');
    if (!VEXA_KEY) {
        console.log('❌ VEXA_API_KEY is missing in .env');
        return;
    }
    try {
        const res = await fetch(`${VEXA_BASE}/bots`, {
            method: 'POST',
            headers: { 'X-API-Key': VEXA_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                platform: 'google_meet',
                meeting_url: 'https://meet.google.com/test',
                native_meeting_id: 'test',
                bot_name: 'Connectivity Test'
            })
        });
        console.log('Vexa Status:', res.status);
        const data = await res.json().catch(() => ({}));
        if (res.ok || res.status === 422) {
            // 422 often means "invalid meeting URL" which is fine for a connectivity test
            console.log('✅ Vexa API is reachable and key is valid.');
        } else {
            console.log('❌ Vexa API error:', data);
        }
    } catch (e) {
        console.log('❌ Vexa Connection Failed:', e.message);
    }
}

async function checkGroq() {
    console.log('\n--- Checking Groq ---');
    if (!GROQ_KEY) {
        console.log('❌ GROQ_API_KEY is missing in .env');
        return;
    }
    try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GROQ_KEY}`,
            },
            body: JSON.stringify({
                model: 'llama-3.1-8b-instant',
                messages: [{ role: 'user', content: 'Ping' }],
                max_tokens: 5,
            }),
        });
        console.log('Groq Status:', res.status);
        if (res.ok) {
            console.log('✅ Groq API is working.');
        } else {
            const data = await res.json().catch(() => ({}));
            console.log('❌ Groq API error:', data);
        }
    } catch (e) {
        console.log('❌ Groq Connection Failed:', e.message);
    }
}

async function main() {
    await checkVexa();
    await checkGroq();
}

main();
