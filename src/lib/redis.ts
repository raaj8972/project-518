import { Redis } from '@upstash/redis';

/**
 * Upstash Redis Client
 * 
 * IMPORTANT SECURITY NOTE: 
 * This file should ONLY be imported and used in server-side environments 
 * (like your Netlify functions inside /netlify/functions/). 
 * 
 * Do NOT import this file into React frontend components, as it will expose 
 * your database's REST token to the public!
 */

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || 'https://closing-quail-86836.upstash.io',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || 'gQAAAAAAAVM0AAIncDIzMjhiZWU1Njk5Y2Y0ZTVkYWU4Nzk2MTBlZTQ1MzdhM3AyODY4MzY',
});

export default redis;
