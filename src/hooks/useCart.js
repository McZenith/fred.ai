import { useState } from 'react';

export const useCart = () => {
  const [cart, setCart] = useState([]);
  const [showCartOnly, setShowCartOnly] = useState(false);

  const addToCart = (event) => {
    if (!cart.some((item) => item.eventId === event.eventId)) {
      setCart([...cart, event]);
    }
  };

  const removeFromCart = (eventId) => {
    setCart(cart.filter((item) => item.eventId !== eventId));
  };

  const clearCart = () => {
    setCart([]);
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
