
import React from 'react';

interface MagicWandIconProps {
  className?: string;
}

const MagicWandIcon: React.FC<MagicWandIconProps> = ({ className = 'w-5 h-5' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path
      fillRule="evenodd"
      d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.981A10.501 10.501 0 0118 16.5a10.5 10.5 0 01-10.5-10.5c0-1.77.43-3.438 1.186-4.942a.75.75 0 01.842-.34z"
      clipRule="evenodd"
    />
    <path
      fillRule="evenodd"
      d="M13.26 18.06a.75.75 0 01.53.22l2.25 2.25a.75.75 0 01-1.06 1.06l-2.25-2.25a.75.75 0 01.53-1.28zM15.75 18a.75.75 0 00.75-.75v-1.5a.75.75 0 00-1.5 0v1.5a.75.75 0 00.75.75zM18 15.75a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5a.75.75 0 01.75-.75zM19.06 13.26a.75.75 0 011.28.53l-2.25 2.25a.75.75 0 01-1.06-1.06l2.25-2.25zM18.75 9.75a.75.75 0 00.75-.75v-1.5a.75.75 0 00-1.5 0v1.5a.75.75 0 00.75.75zM20.25 12a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5a.75.75 0 01.75-.75zM21.94 9.53a.75.75 0 011.06 1.06l-2.25 2.25a.75.75 0 01-1.06-1.06l2.25-2.25z"
      clipRule="evenodd"
    />
    <path d="M4.5 6.375a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5h-1.5a.75.75 0 01-.75-.75zM6 4.5a.75.75 0 00-.75.75v1.5a.75.75 0 001.5 0v-1.5A.75.75 0 006 4.5z" />
  </svg>
);

export default MagicWandIcon;
