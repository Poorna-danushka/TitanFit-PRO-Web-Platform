import React from 'react';

interface LogoIconProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'green' | 'amber' | 'purple';
  className?: string;
}

export const LogoIcon: React.FC<LogoIconProps> = ({
  size = 'md',
  variant = 'green',
  className = '',
}) => {
  const dimensions = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-11 h-11',
  }[size];

  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 24,
  }[size];

  const variantStyles = {
    green: {
      bg: 'from-emerald-400 via-green-500 to-emerald-700',
      glow: 'shadow-[0_0_20px_rgba(34,197,94,0.4)]',
      border: 'border-green-400/30',
      iconColor: '#000000',
    },
    amber: {
      bg: 'from-amber-300 via-amber-500 to-amber-700',
      glow: 'shadow-[0_0_20px_rgba(245,158,11,0.45)]',
      border: 'border-amber-400/30',
      iconColor: '#000000',
    },
    purple: {
      bg: 'from-purple-400 via-purple-600 to-purple-800',
      glow: 'shadow-[0_0_20px_rgba(168,85,247,0.4)]',
      border: 'border-purple-400/30',
      iconColor: '#ffffff',
    },
  }[variant];

  return (
    <div
      className={`relative flex items-center justify-center rounded-xl bg-gradient-to-br ${variantStyles.bg} ${variantStyles.glow} border ${variantStyles.border} ${dimensions} transition-all duration-300 ${className}`}
    >
      <svg
        width={iconSizes}
        height={iconSizes}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="transform -rotate-6 hover:rotate-0 transition-transform duration-300"
      >
        {/* Heavy Dumbbell / Barbell Gym Emblem */}
        <path
          d="M6.5 4V20M17.5 4V20"
          stroke={variantStyles.iconColor}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M4 6.5V17.5M20 6.5V17.5"
          stroke={variantStyles.iconColor}
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M2 9V15M22 9V15"
          stroke={variantStyles.iconColor}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M6.5 12H17.5"
          stroke={variantStyles.iconColor}
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        {/* Center Weight Collar */}
        <circle cx="12" cy="12" r="1.75" fill={variantStyles.iconColor} />
      </svg>
    </div>
  );
};

export default LogoIcon;
