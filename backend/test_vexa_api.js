
import dotenv from 'dotenv';

dotenv.config();

const VEXA_BASE = 'https://api.cloud.vexa.ai';
const VEXA_KEY = (process.env.VEXA_API_KEY || '').trim();

console.log('Testing Vexa API connection...');
console.log('VEXA_BASE:', VEXA_BASE);
console.log('VEXA_KEY set:', !!VEXA_KEY);

async function testConnection() {
    try {
        // Try to list bots (assuming there is a GET /bots or similar)
        const response = await fetch(`${VEXA_BASE}/bots`, {
            method: 'GET',
            headers: {
                'X-API-Key': VEXA_KEY,
                'Content-Type': 'application/json'
            }
        });

        console.log('Status:', response.status);
        const data = await response.json().catch(() => 'No JSON response');
        console.log('Response body:', JSON.stringify(data, null, 2));

        if (response.ok) {
            console.log('SUCCESS: Connected to Vexa API successfully.');
        } else {
            console.log('FAILED: Vexa API returned an error.');
        }
    } catch (error) {
        console.error('ERROR: Could not reach Vexa API:', error.message);
    }
}

testConnection();
