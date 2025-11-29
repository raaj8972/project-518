import { authenticator } from 'otplib';

console.log('Testing otplib...');

const secret = authenticator.generateSecret();
console.log('Generated secret:', secret);

const token = authenticator.generate(secret);
console.log('Generated token:', token);

const isValid = authenticator.check(token, secret);
console.log('Is valid:', isValid);

if (isValid) {
  console.log('otplib is working correctly.');
} else {
  console.error('otplib verification failed.');
  process.exit(1);
}
