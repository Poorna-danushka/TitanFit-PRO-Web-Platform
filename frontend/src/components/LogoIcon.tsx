import React from 'react';

interface LogoIconProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'green' | 'amber' | 'purple' | 'titanium';
  className?: string;
}

export const LogoIcon: React.FC<LogoIconProps> = ({
  size = 'md',
  variant = 'titanium',
  className = '',
}) => {
  const dimensions = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-11 h-11',
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
    titanium: {
      bg: 'from-[#F2F5F7] via-[#C7CED6] to-[#4B5563]',
      glow: 'shadow-[0_0_24px_rgba(0,168,255,0.35)]',
      border: 'border-[#00A8FF]/40',
      iconColor: '#0B0F14',
    },
  }[variant];

  return (
    <div
      role="img"
      aria-label="TitanFit logo"
      className={`relative overflow-hidden rounded-xl border ${variantStyles.border} ${variantStyles.glow} ${dimensions} transition-all duration-300 ${className}`}
    >
      <img src="/logo.png" alt="TitanFit PRO" className="w-full h-full object-cover" />
    </div>
  );
};

export default LogoIcon;
