exports.handler = async function() {
  try {
    return {
      statusCode: 200,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
      },
      body: JSON.stringify({ ok: true, ts: new Date().toISOString() })
    }
  } catch (e) {
    return { statusCode: 500, body: e?.message || 'error' }
  }
}
