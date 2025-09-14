
import React from 'react';

interface FolderIconProps {
    className?: string;
}

const FolderIcon: React.FC<FolderIconProps> = ({ className = "w-8 h-8 text-gray-400" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12.75a2.25 2.25 0 012.25-2.25h15A2.25 2.25 0 0121.75 12.75v5.25a2.25 2.25 0 01-2.25 2.25H4.5a2.25 2.25 0 01-2.25-2.25V12.75z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.5v-2.25A2.25 2.25 0 015.25 9h2.25a2.25 2.25 0 012.25 2.25v2.25m-6.75 0l6.75 0" />
  </svg>
);

export default FolderIcon;
