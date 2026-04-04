import logoIcon from "@/assets/acrosoft-logo.png";

interface AcrosoftLogoProps {
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: { icon: 28, text: "text-lg" },
  md: { icon: 36, text: "text-xl" },
  lg: { icon: 44, text: "text-2xl" },
};

const AcrosoftLogo = ({ size = "md" }: AcrosoftLogoProps) => {
  const s = sizes[size];
  return (
    <div className="flex items-center gap-2">
      <img src={logoIcon} alt="Acrosoft Labs" width={s.icon} height={s.icon} />
      <div className="flex items-center gap-1.5">
        <span className={`${s.text} font-bold text-primary`}>Acrosoft</span>
        <span
          className={`${s.text} font-medium text-muted-foreground bg-secondary px-2 py-0.5 rounded-full text-sm`}
        >
          Labs
        </span>
      </div>
    </div>
  );
};

export default AcrosoftLogo;
