interface AcrosoftLogoProps {
  size?: "sm" | "md" | "lg";
  variant?: "dark" | "light";
  className?: string;
}

const AcrosoftLogo = ({ size = "md", variant = "dark", className = "" }: AcrosoftLogoProps) => {
  const sizes = {
    sm: "text-xl",
    md: "text-2xl",
    lg: "text-4xl",
  };

  const inkColor = variant === "light" ? "#FFFFFF" : "#14161F";

  return (
    <div className={`inline-flex items-baseline font-poppins leading-none tracking-tight cursor-pointer ${sizes[size]} ${className}`}>
      <span className="font-bold" style={{ color: inkColor }}>Acros</span>
      <span className="font-medium ml-[0.2em]" style={{ color: "#0F766E" }}>Software</span>
    </div>
  );
};

export default AcrosoftLogo;
