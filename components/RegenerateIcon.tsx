
import React from 'react';

interface RegenerateIconProps {
  className?: string;
}

const RegenerateIcon: React.FC<RegenerateIconProps> = ({ className = 'w-5 h-5' }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className={className}>
    <path d="M12 4.5a7.5 7.5 0 1 0 5.213 13.532l-3.23-3.231A3.5 3.5 0 1 1 12 8.5a1 1 0 0 0-1 1V12a1 1 0 0 0 1 1h2.5a1 1 0 0 0 .813-1.581l-1.74-2.61A5.5 5.5 0 1 1 6.5 12H4.922A7.5 7.5 0 0 0 12 4.5Z" />
    <path d="M15 2.5a1 1 0 0 0-1 1v2.923a1 1 0 1 0 2 0V3.5a1 1 0 0 0-1-1Z" />
    <path d="M12.93 4.303a1 1 0 0 0-1.06-.328l-2.5 1.071a1 1 0 1 0 .658 1.884l2.5-1.071a1 1 0 0 0 .402-1.556Z" />
    <path d="M17.697 6.07a1 1 0 0 0-1.32-.733l-2.165 1.25a1 1 0 1 0 1 1.732l2.165-1.25a1 1 0 0 0 .32-1.499Z" />
  </svg>
);

export default RegenerateIcon;
