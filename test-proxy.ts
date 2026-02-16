import { handler } from './netlify/functions/drive-proxy';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '.env.local') });

async function test(id: string, width?: number) {
    console.log(`Testing Proxy for ID: ${id}, Width: ${width || 'default(1600)'}`);
    const event: any = {
        queryStringParameters: { id },
        httpMethod: 'GET'
    };
    if (width) event.queryStringParameters.width = width.toString();

    const result = await handler(event, {} as any);
    console.log('Result Status:', result?.statusCode);
    console.log('Result Headers:', JSON.stringify(result?.headers, null, 2));
    if (result?.statusCode === 502 || result?.statusCode === 400) {
        console.log('Body:', result.body);
    }
}

async function run() {
    const fileId = '1shOSB2cKzAvSbKlGGE_NpZLxS52Ypi8K';
    
    console.log('--- TEST 1: Default Width (1600) ---');
    await test(fileId);
    
    console.log('\n--- TEST 2: Thumb Width (400) ---');
    await test(fileId, 400);
}

run().catch(console.error);
