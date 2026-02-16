import { handler } from './netlify/functions/sync-google-drive.ts';

// Mock event
const event: any = {
    queryStringParameters: {
        folderId: '1L7Vv6Fz6vY9-v-G9X4PzHlGvH9Z9z9z9', // dummy
        year: '2026',
        category: 'Cultural Fest'
    },
    httpMethod: 'POST',
    headers: {},
    rawUrl: 'https://example.com/.netlify/functions/sync-google-drive',
    rawQuery: 'folderId=1L7Vv6Fz6vY9-v-G9X4PzHlGvH9Z9z9z9&year=2026&category=Cultural%20Fest',
    path: '/.netlify/functions/sync-google-drive'
};

async function run() {
    console.log('Running sync-google-drive handler...');
    const result = await handler(event, {});
    console.log('Result:', result);
}

run();
