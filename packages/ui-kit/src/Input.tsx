import type { InputHTMLAttributes } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = "", ...props }: InputProps) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      {label && (
        <span
          style={{
            fontSize: "0.875rem",
            fontWeight: 500,
            color: "var(--color-text-primary)",
          }}
        >
          {label}
        </span>
      )}
      <input
        className={className}
        style={{
          width: "100%",
          padding: "0.625rem 0.875rem",
          border: error ? "1px solid var(--color-error)" : "1px solid var(--color-border)",
          borderRadius: "var(--radius-md)",
          fontSize: "1rem",
          transition: "all 0.2s ease",
          background: "var(--color-bg)",
          ...props.style,
        }}
        {...props}
      />
      {error && (
        <span style={{ fontSize: "0.875rem", color: "var(--color-error)" }}>{error}</span>
      )}
    </label>
  );
}
