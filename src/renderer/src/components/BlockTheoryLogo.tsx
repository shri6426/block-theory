import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  className?: string;
}

export const BlockTheoryLogo: React.FC<LogoProps> = ({ 
  size = 'md', 
  showSubtitle = true,
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'text-base tracking-[0.2em]',
    md: 'text-xl tracking-[0.25em]',
    lg: 'text-2xl tracking-[0.3em]',
    xl: 'text-4xl tracking-[0.35em]',
  };

  const blockBoxSizes = {
    sm: 'w-2.5 h-2.5',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
    xl: 'w-6 h-6',
  };

  return (
    <div className={`flex flex-col select-none ${className}`}>
      <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-1">
          {/* Architectural geometric block mark */}
          <div className={`${blockBoxSizes[size]} bg-bt-brick`} />
          <div className={`${blockBoxSizes[size]} bg-bt-charcoal`} />
        </div>
        <span className={`font-black uppercase font-mono text-bt-charcoal ${sizeClasses[size]}`}>
          BLOCK<span className="text-bt-brick">·</span>THEORY
        </span>
      </div>
      {showSubtitle && (
        <span className="text-[9px] font-mono tracking-[0.25em] text-bt-muted uppercase pl-5 mt-0.5">
          Café Operating System
        </span>
      )}
    </div>
  );
};

