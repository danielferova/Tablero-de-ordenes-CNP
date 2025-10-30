import React from 'react';

interface LogoProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Logo: React.FC<LogoProps> = ({ className, ...props }) => (
  <div
    // Added a white background, padding, and rounded corners to frame the logo.
    // Using inline-flex to center the image properly within the container.
    className={`bg-white p-2 rounded-md inline-flex items-center justify-center shadow-sm ${className || ''}`}
    {...props}
  >
    <img
      src="https://cnpnetwork.com/wp-content/uploads/2023/08/cnp-network-1-1.png.webp"
      alt="CNP Network Logo"
      // The image now scales to the height of its container, respecting the padding.
      className="h-full w-auto"
    />
  </div>
);
