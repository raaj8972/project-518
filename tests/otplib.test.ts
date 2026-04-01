import { test, expect } from 'vitest';
import { authenticator } from 'otplib';

test('otplib generator and checker', () => {
  console.log('Testing otplib...');

  const secret = authenticator.generateSecret();
  console.log('Generated secret:', secret);

  const token = authenticator.generate(secret);
  console.log('Generated token:', token);

  const isValid = authenticator.check(token, secret);
  console.log('Is valid:', isValid);

  expect(isValid).toBe(true);
});
