import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
  fallbackPath?: string;
  className?: string;
  label?: string;
  variant?: 'default' | 'subtle' | 'pill';
}

export const BackButton: React.FC<BackButtonProps> = ({
  fallbackPath = '/',
  className = '',
  label = 'Back',
  variant = 'default',
}) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate(fallbackPath, { replace: true });
    }
  };

  const variantStyles = {
    default:
      'px-3.5 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white text-xs font-semibold shadow-sm',
    subtle:
      'px-3 py-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 text-xs font-medium',
    pill:
      'px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-bold shadow-md',
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      className={`inline-flex items-center gap-2 transition-all active:scale-95 cursor-pointer ${variantStyles[variant]} ${className}`}
      aria-label={label}
    >
      <ArrowLeft className="w-4 h-4 shrink-0" />
      <span>{label}</span>
    </button>
  );
};

export default BackButton;
