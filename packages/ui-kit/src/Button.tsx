import type { ReactNode } from "react";

// Phase 1 placeholder — design system to be built out per
// docs/architecture/frontend-design guidance when web-console gains
// real screens.
export function Button(props: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
}) {
  return (
    <button type={props.type ?? "button"} onClick={props.onClick} disabled={props.disabled}>
      {props.children}
    </button>
  );
}
