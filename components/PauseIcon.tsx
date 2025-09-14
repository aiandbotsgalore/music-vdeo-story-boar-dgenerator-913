import React from 'react';

interface PauseIconProps {
  className?: string;
}

const PauseIcon: React.FC<PauseIconProps> = ({ className = 'w-6 h-6' }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 00-1.5 0v13.5a.75.75 0 001.5 0V5.25zm12 0a.75.75 0 00-1.5 0v13.5a.75.75 0 001.5 0V5.25z" clipRule="evenodd" />
  </svg>
);

export default PauseIcon;
