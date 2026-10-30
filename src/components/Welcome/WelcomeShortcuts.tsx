import React from "react";
import { Kbd } from "./Kbd";
import { getWelcomeShortcuts } from "./utils/welcomeUtils";

/**
 * WelcomeShortcuts
 *
 * Desktop-only row of keyboard shortcuts, rendered from `getWelcomeShortcuts`.
 */
export const WelcomeShortcuts: React.FC = () => (
  <ul
    data-testid="welcome-shortcuts"
    className="hidden md:flex mt-8 flex-wrap gap-4 justify-center text-xs text-secondary"
  >
    {getWelcomeShortcuts().map(({ keys, label }) => (
      <li key={label}>
        {keys.map((key, index) => (
          <React.Fragment key={key}>
            {index > 0 && " / "}
            <Kbd>{key}</Kbd>
          </React.Fragment>
        ))}{" "}
        {label}
      </li>
    ))}
  </ul>
);
