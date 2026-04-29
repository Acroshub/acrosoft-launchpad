import acrosLogo from "@/assets/acros-logo.svg";

interface AcrosoftLogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const AcrosoftLogo = ({ size = "md", className = "" }: AcrosoftLogoProps) => {
  const dimensions = {
    sm: { box: 32, text: "text-lg" },
    md: { box: 40, text: "text-xl" },
    lg: { box: 56, text: "text-3xl" },
  };

  const { box, text } = dimensions[size];

  return (
    <div className={`flex items-center gap-2.5 group cursor-pointer ${className}`}>
      <img
        src={acrosLogo}
        alt="Acrosoft Labs"
        style={{ width: box, height: box }}
        className="transition-transform group-hover:scale-110 active:scale-95 duration-300 object-contain"
      />

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
