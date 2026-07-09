import type { ReactNode } from "react";

// Phase 1 placeholder — design system to be built out per
// docs/architecture/frontend-design guidance when web-console gains
// real screens.
export function Button(props: { children: ReactNode; onClick?: () => void }) {
  return <button onClick={props.onClick}>{props.children}</button>;
}
