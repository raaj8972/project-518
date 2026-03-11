const { handler } = require('./netlify/functions/verify-council.cjs');
async function run() {
  try {
    const res = await handler({
      httpMethod: 'POST',
      body: JSON.stringify({ passcode: "1234" })
    }, {});
    console.log(res);
  } catch(e) {
    console.error('FATAL', e);
  }
}
run();
