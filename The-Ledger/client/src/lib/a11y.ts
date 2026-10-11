import type { KeyboardEvent, MouseEvent } from "react";

/**
 * Props that make a non-interactive element (a card, a table row) behave as a
 * real control for keyboard and assistive-technology users.
 *
 * Several lists in the app are clickable <div>/<Card>/<TableRow> elements with
 * only an onClick. Those are invisible to Tab, expose no role to a screen
 * reader (job cards were announced as plain text), and cannot be activated with
 * Enter/Space. Spread this onto the element instead of a bare onClick:
 *
 *   <Card {...activatable(() => setLocation(`/jobs/${id}`), `Open job ${title}`)} />
 *
 * Keyboard events that originate from a nested control (a button inside the
 * card) are ignored so the inner control keeps its own behaviour.
 */
export function activatable(
  onActivate: (e: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>) => void,
  label?: string,
  role: "link" | "button" | "row" = "link",
) {
  return {
    role,
    tabIndex: 0,
    "aria-label": label,
    onClick: (e: MouseEvent<HTMLElement>) => onActivate(e),
    onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
      if (e.target !== e.currentTarget) return;
      if (e.key === "Enter" || (e.key === " " && role === "button")) {
        e.preventDefault();
        onActivate(e);
      }
    },
  } as const;
}
