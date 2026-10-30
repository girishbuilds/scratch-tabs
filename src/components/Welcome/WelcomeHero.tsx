import React from "react";
import { ShieldCheck, Globe, HardDrive } from "../Icons";
import { useThemeStore } from "../../stores/themeStore";

const LOGO_LIGHT_THEME = "/favicon.svg";
const LOGO_DARK_THEME = "/favicon-gray.svg";

const TRUST_BADGES = [
  { icon: ShieldCheck, label: "Private by design" },
  { icon: Globe, label: "Works offline" },
  { icon: HardDrive, label: "Saved locally" },
];

/**
 * WelcomeHero
 *
 * Orientation block: logo, product name, benefit-led tagline and trust badges.
 * The product name is deliberately the largest text on the page.
 */
export const WelcomeHero: React.FC = () => {
  const { isDarkMode } = useThemeStore();

  return (
    <header className="text-center w-full max-w-3xl mb-6 md:mb-8">
      <div className="flex items-center justify-center gap-3 md:gap-4 mb-2 md:mb-3">
        <img
          src={isDarkMode ? LOGO_DARK_THEME : LOGO_LIGHT_THEME}
          alt="Scratch Tabs Logo"
          className="w-8 h-8 md:w-10 md:h-10 flex-shrink-0"
        />
        <h1 className="text-2xl md:text-4xl font-mono font-semibold text-main tracking-tight">
          SCRATCH_TABS
        </h1>
      </div>
      <h2 className="text-sm md:text-lg font-normal text-secondary mb-4 md:mb-5">
        The missing half of your dev environment.
      </h2>

      <ul className="flex flex-wrap justify-center gap-x-4 gap-y-2 md:gap-x-6 text-xs text-secondary">
        {TRUST_BADGES.map(({ icon: Icon, label }) => (
          <li key={label} className="flex items-center gap-2">
            <Icon size={14} className="text-success" />
            <span>{label}</span>
          </li>
        ))}
      </ul>
    </header>
  );
};
