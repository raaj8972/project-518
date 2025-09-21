import type { Handler } from '@netlify/functions'

export const handler: Handler = async () => {
  try {
    return {
      statusCode: 200,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
      },
      body: JSON.stringify({ ok: true, ts: new Date().toISOString() })
    }
  } catch (e: any) {
    return { statusCode: 500, body: e?.message || 'error' }
  }
}
