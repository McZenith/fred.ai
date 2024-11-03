import { FaClipboard, FaShoppingCart, FaTrash } from 'react-icons/fa';

export const HeaderControls = ({
  activeTab,
  totalMatches,
  onTabChange,
  cart,
  showCartOnly,
  setShowCartOnly,
  clearCart,
  onCopyHomeTeams,
  copyMessage,
}) => {
  return (
    <>
      <div className='mb-4 flex items-center justify-between flex-wrap gap-4'>
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
        </div>

        <div className='flex items-center gap-4'>
          <button
            className={`py-2 px-4 rounded-lg font-semibold transition-colors duration-300 flex items-center ${
              showCartOnly
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-blue-100'
            }`}
            onClick={() => setShowCartOnly(!showCartOnly)}
          >
            <FaShoppingCart className='mr-2' />
            Cart ({cart.length})
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
    </>
  );
};
