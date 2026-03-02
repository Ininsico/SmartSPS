import React from 'react';

const PremiumButton = ({ children, onClick, className = '', variant = 'primary', icon: Icon, disabled = false }) => {
    const isPrimary = variant === 'primary';

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`premium-btn-container ${isPrimary ? 'btn-black' : 'btn-white'} ${disabled ? 'btn-disabled' : ''} ${className}`}
        >
            <div className="btn-content">
                {Icon && <Icon size={20} className="btn-icon-custom" strokeWidth={2.5} />}
                {children && <span className="btn-text">{children}</span>}
            </div>
            <div className="flash-effect-rtl"></div>

            <style dangerouslySetInnerHTML={{
                __html: `
        .premium-btn-container {
          position: relative;
          padding: 0.85rem 2.5rem;
          font-family: 'Montserrat', sans-serif;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 2px;
          font-size: 0.85rem;
          cursor: pointer;
          border-radius: 99px;
          border: 1px solid #000;
          overflow: hidden;
          transition: all 0.5s cubic-bezier(0.19, 1, 0.22, 1);
          display: flex;
          align-items: center;
          justify-content: center;
          background: #000;
          color: #fff;
          outline: none;
        }

        .btn-white {
          background: #fff;
          color: #000;
        }

        .btn-black:hover {
          background: #fff;
          color: #000;
          transform: translateY(-4px);
          box-shadow: 0 15px 30px rgba(0,0,0,0.15);
        }

        .btn-white:hover {
          background: #000;
          color: #fff;
          transform: translateY(-4px);
          box-shadow: 0 15px 30px rgba(0,0,0,0.1);
        }

        .btn-disabled {
          opacity: 0.4;
          cursor: not-allowed;
          pointer-events: none;
        }

        .btn-content {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.85rem;
          position: relative;
          z-index: 2;
          width: 100%;
        }

        .btn-icon-custom {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .btn-text {
          white-space: nowrap;
          line-height: 1;
          display: flex;
          align-items: center;
          margin-top: 1px; /* Subtle optical adjustment for Montserrat */
        }

        /* Right to Left Flash Effect */
        .flash-effect-rtl {
          position: absolute;
          top: 0;
          left: 150%;
          width: 80px;
          height: 100%;
          background: linear-gradient(
            to left,
            transparent,
            rgba(255, 255, 255, 0.8),
            transparent
          );
          transform: skewX(-25deg);
          z-index: 1;
        }

        .btn-white .flash-effect-rtl {
          background: linear-gradient(
            to left,
            transparent,
            rgba(0,0,0,0.15),
            transparent
          );
        }

        .premium-btn-container:hover .flash-effect-rtl {
          animation: flash-rtl 0.8s cubic-bezier(0.19, 1, 0.22, 1) forwards;
        }

        @keyframes flash-rtl {
          0% {
            left: 150%;
          }
          100% {
            left: -150%;
          }
        }
      `}} />
        </button>
    );
};

export default PremiumButton;
