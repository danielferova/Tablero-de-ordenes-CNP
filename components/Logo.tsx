import React from 'react';

export const Logo: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    viewBox="0 0 260 60"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <g fillRule="evenodd">
      {/* C */}
      <path
        d="M29.9 0C13.4 0 0 13.4 0 29.9v.2C0 46.6 13.4 60 29.9 60h.2C13.6 60 0 46.6 0 30.1V29.9C0 13.4 13.4 0 29.9 0h.2C13.6 0 0 13.4 0 29.9v.2"
        fill="#D9232D"
      />
      <path
        d="M30.1 60C46.6 60 60 46.6 60 30.1V29.9C60 13.4 46.6 0 30.1 0h-.2C46.4 0 60 13.4 60 29.9v.2C60 46.6 46.6 60 30.1 60h-.2"
        fill="#343A40"
      />
      {/* M */}
      <path
        d="M90 60c16.6 0 30-13.4 30-30S106.6 0 90 0s-30 13.4-30 30 13.4 30 30 30z"
        fillOpacity=".8"
        fill="#D9232D"
      />
      <path
        d="M90 60c16.6 0 30-13.4 30-30S106.6 0 90 0s-30 13.4-30 30 13.4 30 30 30z"
        transform="translate(-22)"
        fill="#343A40"
      />
      {/* P */}
      <path
        d="M120 30c0 16.6 13.4 30 30 30s30-13.4 30-30S166.6 0 150 0v30z"
        fill="#343A40"
      />
      <path
        d="M150 0c-16.6 0-30 13.4-30 30s13.4 30 30 30V0z"
        fillOpacity=".8"
        fill="#D9232D"
      />
    </g>
    <text
      x="185"
      y="42"
      fontFamily="sans-serif"
      fontSize="30"
      fill="currentColor"
    >
      network
    </text>
  </svg>
);
