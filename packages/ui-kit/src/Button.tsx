import type { ReactNode, ButtonHTMLAttributes, ElementType } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "danger";
  size?: "sm" | "md" | "lg";
  as?: ElementType;
  to?: string;
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  disabled,
  style,
  as: Component = "button",
  ...props
}: ButtonProps) {
  const baseStyles: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 500,
    borderRadius: "var(--radius-md)",
    transition: "all 0.2s ease",
    border: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.6 : 1,
    textDecoration: "none",
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      background: "var(--color-primary)",
      color: "white",
    },
    secondary: {
      background: "var(--color-bg-tertiary)",
      color: "var(--color-text-primary)",
    },
    danger: {
      background: "var(--color-error)",
      color: "white",
    },
  };

  const sizeStyles: Record<string, React.CSSProperties> = {
    sm: {
      padding: "0.5rem 1rem",
      fontSize: "0.875rem",
    },
    md: {
      padding: "0.625rem 1.25rem",
      fontSize: "1rem",
    },
    lg: {
      padding: "0.75rem 1.5rem",
      fontSize: "1.125rem",
    },
  };

  const hoverStyles: React.CSSProperties = variant === "primary"
    ? { background: "var(--color-primary-dark)" }
    : variant === "danger"
    ? { background: "#dc2626" }
    : { background: "var(--color-border)" };

  return (
    <Component
      className={className}
      disabled={disabled}
      style={{
        ...baseStyles,
        ...variantStyles[variant],
        ...sizeStyles[size],
        ...style,
      }}
      onMouseEnter={(e: React.MouseEvent<HTMLElement>) => {
        if (!disabled) {
          Object.assign(e.currentTarget.style, hoverStyles);
        }
      }}
      onMouseLeave={(e: React.MouseEvent<HTMLElement>) => {
        if (!disabled) {
          Object.assign(e.currentTarget.style, variantStyles[variant]);
        }
      }}
      {...props}
    >
      {children}
    </Component>
  );
}
