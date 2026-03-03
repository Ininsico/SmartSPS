
import dotenv from 'dotenv';
dotenv.config();

console.log('--- VEXA DIAGNOSTIC ---');
console.log('VEXA_API_KEY:', process.env.VEXA_API_KEY ? 'Present' : 'MISSING');
const VEXA_BASE = 'https://api.cloud.vexa.ai';
const VEXA_KEY = (process.env.VEXA_API_KEY || '').trim();
console.log('VEXA_BASE:', VEXA_BASE);

async function check() {
    try {
        const res = await fetch(`${VEXA_BASE}/bots`, {
            method: 'POST',
            headers: {
                'X-API-Key': VEXA_KEY,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                platform: 'google_meet',
                meeting_url: 'https://meet.google.com/abc-defg-hij',
                native_meeting_id: 'test-meeting',
                bot_name: 'Test Bot',
            })
        });
        console.log('Status:', res.status);
        const text = await res.text();
        console.log('Body:', text);
    } catch (e) {
        console.error('Error:', e.message);
    }
}

check();
