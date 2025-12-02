import React from 'react';

interface LogoProps {
    className?: string;
    showText?: boolean;
}

const Logo: React.FC<LogoProps> = ({ className = "", showText = true }) => {
    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
                <rect width="32" height="32" rx="8" className="fill-blue-600" />
                <path d="M16 6C12.134 6 9 9.13401 9 13C9 18.25 16 26 16 26C16 26 23 18.25 23 13C23 9.13401 19.866 6 16 6Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="16" cy="13" r="3" fill="white" />
                <path d="M22 22L26 26" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M6 26L10 22" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {showText && (
                <span className="font-bold text-xl tracking-tight text-slate-800">
                    Station<span className="text-blue-600">Flow</span>
                </span>
            )}
        </div>
    );
};

export default Logo;
