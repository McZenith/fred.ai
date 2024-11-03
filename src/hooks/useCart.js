import { useState, useEffect } from 'react';

export const useCart = () => {
  const [cart, setCart] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedCart = localStorage.getItem('matchCart');
      return savedCart ? JSON.parse(savedCart) : [];
    }
    return [];
  });
  const [showCartOnly, setShowCartOnly] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('matchCart', JSON.stringify(cart));
    }
  }, [cart]);

  const addToCart = (event, e) => {
    e.stopPropagation();
    if (!cart.some((item) => item.eventId === event.eventId)) {
      setCart([...cart, event]);
    }
  };

  const removeFromCart = (eventId, e) => {
    e.stopPropagation();
    setCart(cart.filter((item) => item.eventId !== eventId));
  };

  const clearCart = () => {
    setCart([]);
    setShowCartOnly(false);
  };

  const isInCart = (eventId) => {
    return cart.some((item) => item.eventId === eventId);
  };

  return {
    cart,
    showCartOnly,
    setShowCartOnly,
    addToCart,
    removeFromCart,
    clearCart,
    isInCart,
  };
};
