import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';

export const vercelWrapper = (handler: Handler) => async (req: VercelRequest, res: VercelResponse) => {
  // Convert Vercel Request to Netlify Event
  const body = typeof req.body === 'object' ? JSON.stringify(req.body) : req.body;
  
  const event: HandlerEvent = {
    rawUrl: req.url || '',
    rawQuery: '', // Not critical for most functions
    path: req.url || '',
    httpMethod: req.method || 'GET',
    headers: req.headers as any,
    multiValueHeaders: {},
    queryStringParameters: req.query as any,
    multiValueQueryStringParameters: {},
    body: body || null,
    isBase64Encoded: false,
  };

  const context: HandlerContext = {
    callbackWaitsForEmptyEventLoop: false,
    functionName: 'vercel-func',
    functionVersion: '1',
    invokedFunctionArn: '',
    memoryLimitInMB: '1024',
    awsRequestId: '',
    logGroupName: '',
    logStreamName: '',
    identity: undefined,
    clientContext: undefined,
    getRemainingTimeInMillis: () => 10000,
    done: () => {},
    fail: () => {},
    succeed: () => {},
  };

  try {
    const response = await handler(event, context);
    
    if (!response) {
      return res.status(500).send('No response from function');
    }

    // Set headers
    if (response.headers) {
      Object.entries(response.headers).forEach(([key, value]) => {
        if (value !== undefined) res.setHeader(key, value.toString());
      });
    }

    res.status(response.statusCode || 200).send(response.body);
  } catch (error: any) {
    console.error('Function execution error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
};
