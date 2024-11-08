import {
  FaClipboard,
  FaShoppingCart,
  FaTrash,
  FaPause,
  FaPlay,
  FaArrowUp,
} from 'react-icons/fa';
import { useCart } from '@/hooks/useCart';
import { useState, useEffect } from 'react';

export const HeaderControls = ({
  activeTab,
  totalMatches,
  onTabChange,
  onCopyHomeTeams,
  copyMessage,
  isPaused,
  onTogglePause,
}) => {
  const { cart, showCartOnly, setShowCartOnly, clearCart } = useCart();
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Handle scroll visibility
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <>
      <div className='sticky top-0 z-50 bg-white/80 backdrop-blur-sm shadow-sm mb-4 p-4 rounded-lg'>
        <div className='flex items-center justify-between flex-wrap gap-4'>
          <div className='flex items-center gap-4 flex-wrap'>
            <button
              className={`py-2 px-4 rounded-lg font-semibold transition-colors duration-300 relative ${
                activeTab === 'live'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-blue-100'
              }`}
              onClick={() => onTabChange('live')}
            >
              Live Matches
              {activeTab === 'live' && totalMatches > 0 && (
                <span className='absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold py-1 px-2 rounded-full'>
                  {totalMatches}
                </span>
              )}
            </button>
            <button
              className={`py-2 px-4 rounded-lg font-semibold transition-colors duration-300 relative ${
                activeTab === 'upcoming'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-blue-100'
              }`}
              onClick={() => onTabChange('upcoming')}
            >
              Upcoming Matches
              {activeTab === 'upcoming' && totalMatches > 0 && (
                <span className='absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold py-1 px-2 rounded-full'>
                  {totalMatches}
                </span>
              )}
            </button>
            <button
              onClick={onCopyHomeTeams}
              className='py-2 px-4 rounded-lg font-semibold transition-colors duration-300 bg-blue-600 text-white hover:bg-blue-700 flex items-center'
            >
              <FaClipboard className='mr-2' />
              Copy Home Teams
            </button>
            <button
              onClick={onTogglePause}
              className={`py-2 px-4 rounded-lg font-semibold transition-colors duration-300 flex items-center ${
                isPaused
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-yellow-600 text-white hover:bg-yellow-700'
              }`}
            >
              {isPaused ? (
                <FaPlay className='mr-2' />
              ) : (
                <FaPause className='mr-2' />
              )}
              {isPaused ? 'Resume Updates' : 'Pause Updates'}
            </button>
          </div>

          <div className='flex items-center gap-4'>
            <button
              className={`py-2 px-4 rounded-lg font-semibold transition-colors duration-300 flex items-center relative ${
                showCartOnly
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-blue-100'
              }`}
              onClick={() => setShowCartOnly(!showCartOnly)}
            >
              <FaShoppingCart className='mr-2' />
              Cart
              {cart.length > 0 && (
                <span className='absolute -top-2 -right-2 bg-green-500 text-white text-xs font-bold py-1 px-2 rounded-full'>
                  {cart.length}
                </span>
              )}
            </button>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className='py-2 px-4 rounded-lg font-semibold transition-colors duration-300 bg-red-600 text-white hover:bg-red-700 flex items-center'
              >
                <FaTrash className='mr-2' />
                Clear Cart
              </button>
            )}
          </div>
        </div>
        {copyMessage && (
          <p className='mt-2 text-sm text-green-500'>{copyMessage}</p>
        )}
      </div>

      {/* Scroll to top button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className='fixed bottom-6 right-6 p-4 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all duration-300 z-50 flex items-center justify-center'
          aria-label='Scroll to top'
        >
          <FaArrowUp className='w-5 h-5' />
        </button>
      )}
    </>
  );
};
