import { Handler } from '@netlify/functions';

export const vercelAdapter = (netlifyHandler: Handler) => async (req: any, res: any) => {
  // Normalize body to string (as Netlify expects string body for JSON requests)
  // Normalize body to string (as Netlify expects string body for JSON requests)
  let body = req.body;
  if (Buffer.isBuffer(body)) {
    body = body.toString('utf-8');
  } else if (typeof body === 'object' && body !== null) {
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

export const webAdapter = (webHandler: (req: Request) => Promise<Response>) => async (req: any, res: any) => {
  try {
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const fullUrl = `${protocol}://${host}${req.url}`;
    
    let body = req.body;
    if (Buffer.isBuffer(body)) {
      body = body.toString('utf-8');
    } else if (typeof body === 'object' && body !== null) {
      body = JSON.stringify(body);
    }

    const request = new Request(fullUrl, {
        method: req.method,
        headers: req.headers,
        body: (req.method !== 'GET' && req.method !== 'HEAD') ? body : undefined
    });

    const response = await webHandler(request);
    
    if (!res.headersSent) {
      res.status(response.status);
      response.headers.forEach((v, k) => res.setHeader(k, v));
      const text = await response.text();
      res.send(text);
    }
  } catch (error) {
    console.error('Web Adapter Error:', error);
    if (!res.headersSent) res.status(500).send(String(error));
  }
};
