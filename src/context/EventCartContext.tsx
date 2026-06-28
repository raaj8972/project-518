import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface CartEvent {
  id: string;
  title: string;
  category?: string;
  date?: string;
  min_team?: number;
  max_team?: number;
  isTeam?: boolean;
}

interface EventCartContextType {
  cartItems: CartEvent[];
  addToCart: (event: CartEvent) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  isInCart: (id: string) => boolean;
  cartCount: number;
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
}

const EventCartContext = createContext<EventCartContextType | null>(null);

const CART_KEY = 'rico_event_cart';

export const EventCartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cartItems, setCartItems] = useState<CartEvent[]>(() => {
    try {
      const stored = localStorage.getItem(CART_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    try { localStorage.setItem(CART_KEY, JSON.stringify(cartItems)); } catch {}
  }, [cartItems]);

  const addToCart = useCallback((event: CartEvent) => {
    setCartItems(prev => {
      if (prev.find(e => e.id === event.id)) return prev;
      return [...prev, event];
    });
  }, []);

  const removeFromCart = useCallback((id: string) => {
    setCartItems(prev => prev.filter(e => e.id !== id));
  }, []);

  const clearCart = useCallback(() => setCartItems([]), []);

  const isInCart = useCallback((id: string) => cartItems.some(e => e.id === id), [cartItems]);

  return (
    <EventCartContext.Provider value={{
      cartItems,
      addToCart,
      removeFromCart,
      clearCart,
      isInCart,
      cartCount: cartItems.length,
      isDrawerOpen,
      openDrawer: () => setIsDrawerOpen(true),
      closeDrawer: () => setIsDrawerOpen(false),
    }}>
      {children}
    </EventCartContext.Provider>
  );
};

export const useEventCart = () => {
  const ctx = useContext(EventCartContext);
  if (!ctx) throw new Error('useEventCart must be used within EventCartProvider');
  return ctx;
};
