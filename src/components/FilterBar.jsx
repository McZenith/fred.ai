import { FaSearch, FaTimes } from 'react-icons/fa';
import { filterOptions } from '../utils/constants';

export const FilterBar = ({
  searchTerm,
  setSearchTerm,
  activeFilters,
  toggleFilter,
  removeFilter,
  clearFilters,
}) => {
  return (
    <div className='bg-white rounded-xl shadow-xl p-8 mb-8'>
      <div className='flex flex-col space-y-4'>
        <div className='relative flex-1'>
          <input
            type='text'
            placeholder='Search teams...'
            className='pl-12 pr-4 py-3 border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500 transition'
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <FaSearch className='w-6 h-6 absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400' />
        </div>

        <div className='flex flex-wrap gap-2'>
          {filterOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => toggleFilter(option.value)}
              className={`px-4 py-2 rounded-lg transition-colors duration-200 ${
                activeFilters.includes(option.value)
                  ? 'bg-blue-600 text-white'
                  : option.isDefault
                  ? 'bg-blue-50 border-2 border-blue-300 text-blue-700 hover:bg-blue-100'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              } ${
                option.isDefault && !activeFilters.includes(option.value)
                  ? 'ring-2 ring-blue-200'
                  : ''
              }`}
            >
              {option.isDefault && !activeFilters.includes(option.value) && (
                <span className='text-xs font-semibold text-blue-500 mr-1'>
                  (Default){' '}
                </span>
              )}
              {option.label}
            </button>
          ))}
        </div>

        {activeFilters.length > 0 && (
          <div className='flex flex-wrap gap-2 mt-4'>
            <span className='text-sm text-gray-500'>Active Filters:</span>
            {activeFilters.map((filter) => (
              <span
                key={filter}
                className='inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm'
              >
                {filterOptions.find((opt) => opt.value === filter)?.label}
                <button
                  onClick={() => removeFilter(filter)}
                  className='ml-2 hover:text-blue-900'
                >
                  <FaTimes className='w-3 h-3' />
                </button>
              </span>
            ))}
            <button
              onClick={clearFilters}
              className='text-sm text-red-600 hover:text-red-800'
            >
              Clear All
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
