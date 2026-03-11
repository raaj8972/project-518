import { handler } from './netlify/functions/verify-council.js'; // Compiled output

async function run() {
  try {
    const res = await handler({
      httpMethod: 'POST',
      body: JSON.stringify({ passcode: "1234" })
    }, {});
    console.log('Result:', res);
  } catch (e) {
    console.log('Crash!', e);
  }
}
run();
