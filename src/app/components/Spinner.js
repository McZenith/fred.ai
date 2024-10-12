import React from 'react';

export const Spinner = ({ className }) => {
  return (
    <div className={`spinner ${className}`}>
      <div className='double-bounce1'></div>
      <div className='double-bounce2'></div>
    </div>
  );
};
