
import React from 'react';

interface UploadIconProps {
  className?: string;
}

const UploadIcon: React.FC<UploadIconProps> = ({ className = "w-12 h-12 text-gray-500" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l-3.75 3.75M12 9.75l3.75 3.75M3 17.25a4.5 4.5 0 004.5 4.5h9a4.5 4.5 0 004.5-4.5v-4.5a4.5 4.5 0 00-4.5-4.5h-9a4.5 4.5 0 00-4.5 4.5v4.5z" />
  </svg>
);

export default UploadIcon;
