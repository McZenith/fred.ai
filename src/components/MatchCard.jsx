import { FaAngleDown, FaAngleUp, FaInfoCircle, FaPlus, FaMinus, FaClock, FaFutbol } from 'react-icons/fa';
import { getMatchHalf, getOver1_5Market, debug } from '../utils/matchHelpers';
import { MATCH_PERIODS } from '../utils/constants';

export const MatchCard = ({
  event,
  isExpanded,
  onToggle,
  onAddToCart,
  onRemoveFromCart,
  isInCart,
  activeTab,
  highProbability,
}) => {
  const matchHalf = getMatchHalf(event);
  const over1_5Market = getOver1_5Market(event);
  const isEventInCart = isInCart(event.eventId);

  // Debug logging in development
  if (process.env.NODE_ENV === 'development') {
    debug.logMatchDetails(event);
  }

  const getMatchHalfDisplay = () => {
    switch (matchHalf) {
      case MATCH_PERIODS.FIRST_HALF:
        return '1st Half';
      case MATCH_PERIODS.SECOND_HALF:
        return '2nd Half';
      case MATCH_PERIODS.HALF_TIME:
        return 'Half Time';
      default:
        return null;
    }
  };

  const cardClass = `p-6 mb-4 rounded-lg shadow-lg ${
    highProbability
      ? 'bg-green-100 border-2 border-green-500'
      : isEventInCart
      ? 'bg-blue-50 border-2 border-blue-300'
      : 'bg-white'
  } hover:shadow-xl transition-shadow duration-300 cursor-pointer select-none`;

  return (
    <div 
      className={cardClass}
      onClick={() => onToggle(event.eventId)}
    >
      <div className='flex items-center justify-between'>
        <div className='flex-1'>
          {/* Team Names */}
          <p className='text-xl font-bold mb-2'>
            {event.homeTeamName} vs {event.awayTeamName}
          </p>
          
          {/* Tournament Info */}
          <p className='text-sm text-gray-600'>
            Tournament: {event.tournamentName}
          </p>
          
          {/* Status Badges */}
          <div className='flex flex-wrap gap-2 mt-2'>
            {matchHalf && (
              <span className='inline-flex items-center px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 text-xs font-medium'>
                <FaClock className="mr-1 w-3 h-3" />
                {getMatchHalfDisplay()}
              </span>
            )}
            {event.matchStatus && event.matchStatus !== matchHalf && (
              <span className='inline-flex items-center px-2 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-medium'>
                <FaFutbol className="mr-1 w-3 h-3" />
                {event.matchStatus}
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className='flex items-center gap-4'>
          <button
            onClick={(e) => {
              e.stopPropagation(); // Prevent card expansion when clicking cart button
              isEventInCart ? onRemoveFromCart(event.eventId, e) : onAddToCart(event, e);
            }}
            className={`p-2 rounded-full transition-colors duration-200 ${
              isEventInCart
                ? 'bg-red-100 text-red-600 hover:bg-red-200'
                : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
            }`}
            title={isEventInCart ? 'Remove from cart' : 'Add to cart'}
          >
            {isEventInCart ? <FaMinus className='w-4 h-4' /> : <FaPlus className='w-4 h-4' />}
          </button>

          <div className='text-blue-500'>
            {isExpanded ? (
              <FaAngleUp className='w-6 h-6' />
            ) : (
              <FaAngleDown className='w-6 h-6' />
            )}
          </div>
        </div>
      </div>

      {/* Match Details */}
      <div className='text-sm text-gray-700 mt-4'>
        {activeTab === 'live' && (
          <div className='space-y-2'>
            <div className='flex items-center justify-between'>
              <div>
                <p>
                  Status: <span className='font-medium'>{event.matchStatus}</span>
                  {event.period && (
                    <> | Period: <span className='font-medium'>{event.period}</span></>
                  )}
                </p>
              </div>
              <p>
                Played Time:{' '}
                <span className='text-blue-600 font-semibold'>
                  {event.playedSeconds || '0:00'}
                </span>
              </p>
            </div>
            {event.setScore && (
              <p className='text-lg font-semibold text-blue-600'>
                Score: {event.setScore}
              </p>
            )}
          </div>
        )}

        <p className='mt-2'>
          Estimated Start Time:{' '}
          <span className='text-gray-500'>
            {new Date(event.estimateStartTime).toLocaleString()}
          </span>
        </p>

        {over1_5Market && (
          <div className='mt-2 p-2 bg-blue-50 rounded'>
            <p className='text-blue-600 font-semibold'>
              Market: {over1_5Market.marketName}
              <br />
              Odds: {over1_5Market.odds} | Probability: {(over1_5Market.probability * 100).toFixed(1)}%
            </p>
          </div>
        )}
      </div>

      {/* Expanded Markets Section */}
      {isExpanded && (
        <div className='mt-4'>
          <h3 className='text-lg font-semibold mb-4 flex items-center'>
            <FaInfoCircle className='mr-2 text-blue-500' />
            Betting Markets
          </h3>
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
            {event.markets?.map((market) => (
              <div key={market.id} className='border-t pt-4'>
                <h4 className='font-semibold mb-1 text-gray-900'>
                  {market.name}
                </h4>
                <ul className='list-disc ml-5'>
                  {market.outcomes?.map((outcome) => (
                    <li
                      key={outcome.id}
                      className={`mb-2 ${
                        outcome.probability > 0.6
                          ? 'text-blue-600 font-semibold'
                          : ''
                      }`}
                    >
                      {outcome.desc}: Odds{' '}
                      <span className='font-semibold'>{outcome.odds}</span>
                      <>
                        , Probability:{' '}
                        <span className='font-semibold'>
                          {(outcome.probability * 100).toFixed(1)}%
                        </span>
                      </>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};