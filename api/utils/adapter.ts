import { Handler } from '@netlify/functions';

export const vercelAdapter = (netlifyHandler: Handler) => async (req: any, res: any) => {
  // Normalize body to string (as Netlify expects string body for JSON requests)
  let body = req.body;
  if (typeof body === 'object' && body !== null) {
    body = JSON.stringify(body);
  }

  const query = req.query || {};

  const event: any = {
    body,
    headers: req.headers,
    httpMethod: req.method || 'GET',
    isBase64Encoded: false,
    path: req.url || '',
    queryStringParameters: query,
    multiValueQueryStringParameters: null,
    rawQuery: '',
    rawUrl: req.url || '',
  };

  const context: any = {
    callbackWaitsForEmptyEventLoop: true,
    functionName: 'vercel-func',
    functionVersion: '1',
    invokedFunctionArn: '',
    memoryLimitInMB: '1024',
    awsRequestId: '',
    logGroupName: '',
    logStreamName: '',
    clientContext: {},
    identity: undefined,
    getRemainingTimeInMillis: () => 10000
  };

  try {
    const result = await netlifyHandler(event, context);

    if (!result) {
      if (!res.headersSent) res.status(500).send('No response from handler');
      return;
    }

    if (result.headers) {
      Object.entries(result.headers).forEach(([key, value]) => {
        if (value) res.setHeader(key, value as string);
      });
    }

    if (!res.headersSent) res.status(result.statusCode || 200).send(result.body);
  } catch (error) {
    console.error('Function Adapter Error:', error);
    if (!res.headersSent) res.status(500).send(String(error));
  }
};
