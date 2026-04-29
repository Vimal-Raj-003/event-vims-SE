"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export interface EventBrand {
  primaryColor: string;
  secondaryColor: string;
  logoUrl?: string;
  fontFamily?: string;
  eventName: string;
}

const defaultBrand: EventBrand = {
  primaryColor: "#4F46E5",
  secondaryColor: "#818CF8",
  eventName: "VIMS Events",
};

interface BrandContextValue {
  brand: EventBrand;
  setBrand: (brand: Partial<EventBrand>) => void;
}

const BrandContext = createContext<BrandContextValue>({
  brand: defaultBrand,
  setBrand: () => {},
});

export function useBrand(): BrandContextValue {
  const context = useContext(BrandContext);
  if (!context) {
    throw new Error("useBrand must be used within a BrandProvider");
  }
  return context;
}

interface BrandProviderProps {
  children: ReactNode;
  initialBrand?: Partial<EventBrand>;
}

function hexToHSL(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) return `0 0% ${Math.round(l * 100)}%`;

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function BrandProvider({ children, initialBrand }: BrandProviderProps) {
  const [brand, setBrandState] = useState<EventBrand>({
    ...defaultBrand,
    ...initialBrand,
  });

  const setBrand = (updates: Partial<EventBrand>) => {
    setBrandState((prev) => ({ ...prev, ...updates }));
  };

  useEffect(() => {
    const root = document.documentElement;
    const primaryHSL = hexToHSL(brand.primaryColor);
    const secondaryHSL = hexToHSL(brand.secondaryColor);

    root.style.setProperty("--brand-primary", brand.primaryColor);
    root.style.setProperty("--brand-primary-hsl", primaryHSL);
    root.style.setProperty("--brand-secondary", brand.secondaryColor);
    root.style.setProperty("--brand-secondary-hsl", secondaryHSL);

    if (brand.fontFamily) {
      root.style.setProperty("--brand-font", brand.fontFamily);
    }
  }, [brand]);

  return (
    <BrandContext.Provider value={{ brand, setBrand }}>
      {children}
    </BrandContext.Provider>
  );
}
