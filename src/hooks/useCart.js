import { createContext, useContext, useState } from 'react';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  const [showCartOnly, setShowCartOnly] = useState(false);

  const addToCart = (event) => {
    setCart((prev) => [
      ...prev,
      {
        eventId: event.eventId,
        homeTeamName: event.homeTeamName,
        awayTeamName: event.awayTeamName,
        matchTime: event.estimateStartTime,
        tournament: event.sport?.category?.tournament?.name,
      },
    ]);
  };

  const removeFromCart = (eventId) => {
    setCart((prev) => prev.filter((item) => item.eventId !== eventId));
  };

  const clearCart = () => {
    setCart([]);
    setShowCartOnly(false);
  };

  const isInCart = (eventId) => cart.some((item) => item.eventId === eventId);

  return (
    <CartContext.Provider
      value={{
        cart,
        showCartOnly,
        setShowCartOnly,
        addToCart,
        removeFromCart,
        clearCart,
        isInCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

