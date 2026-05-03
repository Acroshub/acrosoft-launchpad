import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { PHONE_COUNTRIES, DEFAULT_COUNTRY, parsePhoneValue } from "@/i18n/phone-countries";

interface PhoneInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  compact?: boolean;
  disabled?: boolean;
}

export default function PhoneInput({
  value,
  onChange,
  placeholder,
  compact = false,
  disabled = false,
}: PhoneInputProps) {
  const [dial, setDial] = useState(() => parsePhoneValue(value).dial);
  const [number, setNumber] = useState(() => parsePhoneValue(value).number);

  // Sync from parent only when value is cleared externally (form reset)
  useEffect(() => {
    if (!value) {
      setDial(DEFAULT_COUNTRY.dial);
      setNumber("");
    }
  }, [value]);

  const emitChange = (d: string, n: string) => {
    const combined = n.trim() ? `${d} ${n.trim()}` : "";
    onChange(combined);
  };

  const handleDial = (d: string) => {
    setDial(d);
    emitChange(d, number);
  };

  const handleNumber = (n: string) => {
    setNumber(n);
    emitChange(dial, n);
  };

  const h = compact ? "h-7" : "h-11";
  const text = compact ? "text-xs" : "text-sm";
  const px = compact ? "px-1.5" : "px-2";

  return (
    <div className="flex gap-1.5 w-full">
      <select
        value={dial}
        onChange={(e) => handleDial(e.target.value)}
        disabled={disabled}
        className={`${h} ${text} ${px} rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 shrink-0 cursor-pointer`}
        style={{ minWidth: compact ? "70px" : "90px" }}
      >
        {PHONE_COUNTRIES.map((c) => (
          <option key={c.code} value={c.dial}>
            {c.flag} {c.dial}
          </option>
        ))}
      </select>
      <Input
        type="tel"
        value={number}
        onChange={(e) => handleNumber(e.target.value)}
        placeholder={placeholder ?? "71234567"}
        disabled={disabled}
        className={`${h} ${text} flex-1 min-w-0`}
      />
    </div>
  );
}
