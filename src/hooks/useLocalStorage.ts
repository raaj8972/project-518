import { useEffect, useState, useCallback, useRef } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T) {
  // Use a ref for initialValue to ensure we always have the latest default value if it changes (e.g., profile data loading)
  const initialValueRef = useRef(initialValue);
  initialValueRef.current = initialValue;

  // Function to read from localStorage
  const readValue = useCallback((): T => {
    if (typeof window === 'undefined') return initialValueRef.current;
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValueRef.current;
    } catch (error) {
      console.warn(`Error reading localStorage key “${key}”:`, error);
      return initialValueRef.current;
    }
  }, [key]);

  const [storedValue, setStoredValue] = useState<T>(readValue);

  // Re-sync with localStorage when key changes
  useEffect(() => {
    setStoredValue(readValue());
  }, [key, readValue]);

  // Updated setValue function that persists to localStorage
  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.warn(`Error setting localStorage key “${key}”:`, error);
    }
  }, [key, storedValue]);

  // Function to remove key from localStorage
  const clear = useCallback(() => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
        setStoredValue(initialValueRef.current);
      }
    } catch (error) {
      console.warn(`Error clearing localStorage key “${key}”:`, error);
    }
  }, [key]);

  return [storedValue, setValue, clear] as const;
}
