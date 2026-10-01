import type { ButtonHTMLAttributes } from "react";

import { CTA_GRADIENT } from "../../lib/theme";

type Variant = "cta" | "primary" | "ghost" | "danger";

type ButtonProps = {
  variant?: Variant;
  block?: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement>;

const VARIANTS: Record<Variant, string> = {
  cta: "text-white hover:opacity-90",
  primary: "bg-white text-zinc-900 hover:opacity-90",
  ghost: "bg-white/10 text-white backdrop-blur-lg hover:bg-white/20",
  danger: "bg-red-500 text-white hover:opacity-90",
};

export function Button({
  variant = "primary",
  block = false,
  className,
  style,
  children,
  ...rest
}: ButtonProps) {
  const classes = [
    "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition",
    "disabled:cursor-not-allowed disabled:opacity-50",
    VARIANTS[variant],
    block ? "w-full" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      className={classes}
      style={variant === "cta" ? { background: CTA_GRADIENT, ...style } : style}
      {...rest}
    >
      {children}
    </button>
  );
}
