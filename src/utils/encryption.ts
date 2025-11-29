import CryptoJS from 'crypto-js';

// Use a fallback key if env var is missing (for dev/demo only)
// In production, VITE_ENCRYPTION_KEY should be set in .env
const SECRET_KEY = import.meta.env.VITE_ENCRYPTION_KEY || 'ricorrenza-2026-secure-key-fallback';

/**
 * Encrypts a string using AES encryption.
 * @param text The plain text to encrypt
 * @returns The ciphertext string
 */
export const encryptData = (text: string): string => {
  if (!text) return '';
  try {
    return CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
  } catch (error) {
    console.error('Encryption failed:', error);
    return text;
  }
};

/**
 * Decrypts a string using AES encryption.
 * Returns the original text if decryption fails or if the input doesn't look like ciphertext.
 * @param ciphertext The encrypted text
 * @returns The decrypted plain text
 */
export const decryptData = (ciphertext: string): string => {
  if (!ciphertext) return '';
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
    const originalText = bytes.toString(CryptoJS.enc.Utf8);
    
    // If decryption results in empty string but input wasn't empty, 
    // it might mean the key was wrong or it wasn't encrypted.
    // However, CryptoJS usually returns empty string for wrong key if it can't parse.
    // We'll assume if we get a valid UTF8 string back, it's good.
    // If originalText is empty, it might be that the input wasn't encrypted with this key.
    // In a mixed-data scenario (legacy plain + new encrypted), this is tricky.
    // A simple heuristic: if result is empty, return original.
    if (!originalText && ciphertext.length > 0) {
      return ciphertext;
    }
    return originalText;
  } catch (error) {
    // Fallback for legacy unencrypted data
    return ciphertext;
  }
};

/**
 * Hashes a password using SHA-256.
 * @param password The plain password
 * @returns The hash string
 */
export const hashPassword = (password: string): string => {
  if (!password) return '';
  return CryptoJS.SHA256(password).toString();
};
