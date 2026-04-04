interface AcrosoftLogoProps {
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: { flask: 28, text: "text-lg" },
  md: { flask: 36, text: "text-xl" },
  lg: { flask: 44, text: "text-2xl" },
};

const AcrosoftLogo = ({ size = "md" }: AcrosoftLogoProps) => {
  const s = sizes[size];
  return (
    <div className="flex items-center gap-2">
      <svg
        width={s.flask}
        height={s.flask}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="48" height="48" rx="10" fill="hsl(var(--primary))" />
        <path
          d="M20 12h8v8l6 12a2 2 0 01-1.79 2.89H15.79A2 2 0 0114 31.99L20 20V12z"
          fill="hsl(var(--primary-dark))"
          stroke="white"
          strokeWidth="1.5"
        />
        <path
          d="M20 12h8"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M18 28a6 6 0 0112 0"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="24" cy="26" r="1.5" fill="white" opacity="0.7" />
        <circle cx="28" cy="30" r="1" fill="white" opacity="0.5" />
      </svg>
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
