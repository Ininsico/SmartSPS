import React from 'react';
import { cn } from './utils';

const PremiumButton = ({ children, onClick, className = '', variant = 'primary', icon: Icon, disabled = false, type = 'button' }) => {
  const isPrimary = variant === 'primary';
  const isSecondary = variant === 'secondary';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "group relative px-10 py-3 font-montserrat font-extrabold uppercase tracking-[0.15em] text-[12px] rounded-full overflow-hidden transition-all duration-500 active:scale-[0.98] flex items-center justify-center outline-none border-none cursor-pointer",
        isPrimary && "bg-premium-accent text-black hover:bg-premium-accent/90 hover:-translate-y-1 hover:shadow-2xl shadow-white/40",
        isSecondary && "bg-white/5 text-white border border-white/10 hover:bg-white/10 hover:-translate-y-1 hover:shadow-2xl shadow-black/10",
        variant === 'danger' && "bg-premium-danger text-white hover:opacity-90 hover:-translate-y-1 shadow-lg shadow-white/10",
        disabled && "opacity-40 cursor-not-allowed pointer-events-none",
        className
      )}
    >
      <div className="relative z-10 flex items-center justify-center gap-3 w-full">
        {Icon && <Icon size={18} className="flex-shrink-0" strokeWidth={2.5} />}
        {children && <span className="whitespace-nowrap pt-[1px]">{children}</span>}
      </div>

      {/* Premium Flash Effect */}
      <div className={cn(
        "absolute top-0 left-[150%] w-20 h-full skew-x-[-25deg] z-[1] transition-none group-hover:animate-flash-rtl",
        isPrimary ? "bg-gradient-to-l from-transparent via-white/40 to-transparent" : "bg-gradient-to-l from-transparent via-white/10 to-transparent"
      )} />
    </button>
  );
};

export default PremiumButton;
