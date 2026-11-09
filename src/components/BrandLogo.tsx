import React from 'react';

interface BrandLogoProps {
  className?: string;
  size?: number;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ className = 'w-8 h-8', size = 32 }) => {
  return (
    <div className={`relative flex items-center justify-center shrink-0 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="rounded-xl shadow-xs"
      >
        <rect width="32" height="32" rx="9" fill="url(#brandGrad)" />
        <rect
          x="0.5"
          y="0.5"
          width="31"
          height="31"
          rx="8.5"
          stroke="url(#brandBorderGrad)"
          strokeOpacity="0.4"
        />
        {/* Círculo guia e esferas interconectadas */}
        <circle cx="16" cy="16" r="9.5" stroke="#10B981" strokeOpacity="0.25" strokeWidth="1" strokeDasharray="2 2" />
        <circle cx="16" cy="10.5" r="2.5" fill="#F59E0B" />
        <circle cx="11.2" cy="18.5" r="2.5" fill="#10B981" />
        <circle cx="20.8" cy="18.5" r="2.5" fill="#10B981" />
        <circle cx="16" cy="15.8" r="1.6" fill="#FFFFFF" />
        <path
          d="M16 12.5V14.5M13 17.5L14.7 16.5M19 17.5L17.3 16.5"
          stroke="#FFFFFF"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <defs>
          <linearGradient id="brandGrad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
            <stop stopColor="#064E3B" />
            <stop offset="1" stopColor="#022C22" />
          </linearGradient>
          <linearGradient id="brandBorderGrad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
            <stop stopColor="#34D399" />
            <stop offset="1" stopColor="#059669" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
};
