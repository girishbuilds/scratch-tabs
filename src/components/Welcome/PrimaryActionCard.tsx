import React from "react";
import { ArrowRight } from "../Icons";
import type { LucideProps } from "lucide-react";

export type PrimaryActionVariant = "primary" | "neutral";

export interface PrimaryActionCardProps {
  icon: React.ComponentType<LucideProps>;
  title: string;
  description: string;
  /** Label of the call-to-action shown at the bottom of the card on desktop */
  ctaLabel: string;
  onClick: () => void;
  /** "primary" is the single dominant action; "neutral" is a quieter alternative */
  variant: PrimaryActionVariant;
}

const variantClasses: Record<PrimaryActionVariant, {
  card: string;
  iconBox: string;
  iconColor: string;
  cta: string;
}> = {
  primary: {
    card: "bg-primary/5 border-primary/40 hover:border-primary/60",
    iconBox: "bg-primary/10 group-hover:bg-primary/20",
    iconColor: "text-primary",
    cta: "bg-primary text-white",
  },
  neutral: {
    card: "bg-surface border-base hover:border-primary/30",
    iconBox: "bg-element group-hover:bg-element-hover",
    iconColor: "text-secondary",
    cta: "bg-element text-main border border-base group-hover:bg-element-hover",
  },
};

/**
 * PrimaryActionCard
 *
 * A first-run action card. Handles only presentation of one action;
 * the call-to-action is a styled span so the whole card stays a single button.
 */
export const PrimaryActionCard: React.FC<PrimaryActionCardProps> = ({
  icon: Icon,
  title,
  description,
  ctaLabel,
  onClick,
  variant,
}) => {
  const classes = variantClasses[variant];

  return (
    <button
      onClick={onClick}
      className={`group flex items-center p-4 md:flex-col md:items-stretch md:p-6 border rounded-sm text-left w-full
        transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${classes.card}`}
    >
      <div className={`p-2 md:p-3 rounded-sm self-start mr-3 md:mr-0 md:mb-4 transition-colors ${classes.iconBox}`}>
        <Icon size={20} className={`md:hidden ${classes.iconColor}`} />
        <Icon size={24} className={`hidden md:block ${classes.iconColor}`} />
      </div>
      <div className="flex-1">
        <h3 className="text-main font-semibold text-sm md:text-lg md:mb-1">{title}</h3>
        <p className="text-muted text-xs md:text-sm">{description}</p>
      </div>
      <ArrowRight size={16} className="md:hidden ml-2 text-muted flex-shrink-0" />
      <span
        className={`hidden md:block mt-5 py-2 rounded-sm text-center text-sm font-medium transition-colors ${classes.cta}`}
      >
        {ctaLabel}
      </span>
    </button>
  );
};
