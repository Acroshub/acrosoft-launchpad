import React from "react";

interface AcrosoftLogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const AcrosoftLogo = ({ size = "md", className = "" }: AcrosoftLogoProps) => {
  const dimensions = {
    sm: { box: 32, icon: 20, text: "text-lg" },
    md: { box: 40, icon: 24, text: "text-xl" },
    lg: { box: 56, icon: 32, text: "text-3xl" },
  };

  const { box, icon, text } = dimensions[size];

  return (
    <div className={`flex items-center gap-2.5 group cursor-pointer ${className}`}>
      {/* Matraz Icon SVG */}
      <div className="relative flex items-center justify-center">
        <div 
          className="bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 transition-transform group-hover:scale-110 active:scale-95 duration-300"
          style={{ width: box, height: box }}
        >
          <svg 
            width={icon} 
            height={icon} 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2.5" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className="text-white"
          >
            <path d="M6 3h12" />
            <path d="M8 3v3a2 2 0 0 1-2 2H4" />
            <path d="M10 3v10a4 4 0 0 1-8 0V3" />
            <path d="M9 3h6" />
            <path d="M10 3v3c0 2 2 2 2 5v10c0 1 1 2 2 2h4c1 0 2-1 2-2V11c0-3 2-3 2-5V3" />
          </svg>
          {/* White Arch (subtle detail) */}
          <div className="absolute top-1 right-1 w-2 h-2 border-t-2 border-r-2 border-white/40 rounded-tr-md" />
        </div>
      </div>

      {/* Text Logo */}
      <div className="flex items-center gap-1.5 leading-none">
        <span className={`${text} font-black tracking-tight text-foreground transition-colors`}>
          Acrosoft
        </span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-2 py-1 rounded-md">
          Labs
        </span>
      </div>
    </div>
  );
};

export default AcrosoftLogo;
