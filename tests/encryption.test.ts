import { describe, it, expect } from 'vitest';
import { encryptData, decryptData, hashPassword } from '../src/utils/encryption';

describe('Encryption Utils', () => {
  it('should encrypt and decrypt data correctly', () => {
    const original = 'sensitive-data-123';
    const encrypted = encryptData(original);
    expect(encrypted).not.toBe(original);
    expect(encrypted).not.toBe('');
    
    const decrypted = decryptData(encrypted);
    expect(decrypted).toBe(original);
  });

  it('should handle empty strings', () => {
    expect(encryptData('')).toBe('');
    expect(decryptData('')).toBe('');
  });

  it('should return original text if decryption fails (legacy data support)', () => {
    const plainText = 'not-encrypted-data';
    // decryptData should return the input if it can't decrypt it
    // Note: This depends on the implementation. Our implementation returns original if it fails.
    const decrypted = decryptData(plainText);
    expect(decrypted).toBe(plainText);
  });

  it('should hash password consistently', () => {
    const password = 'my-secret-password';
    const hash1 = hashPassword(password);
    const hash2 = hashPassword(password);
    
    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(password);
    expect(hash1.length).toBeGreaterThan(0);
  });

});
