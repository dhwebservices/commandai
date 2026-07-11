import type { ReactNode } from "react";

export interface CardProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function Card({ children, className = "", style }: CardProps) {
  return (
    <div
      className={className}
      style={{
        background: "var(--color-surface)",
        borderRadius: "var(--radius-lg)",
        padding: "1.5rem",
        boxShadow: "var(--shadow-md)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
