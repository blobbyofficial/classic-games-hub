"use client";

import { useEffect } from "react";

/**
 * The root layout has failed, so there is no stylesheet, no font and no theme
 * provider — everything here has to be inline. The media query is the only way
 * left to respect the reader's colour scheme.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0 }}>
        <style>{`
          :root { color-scheme: light dark; --bg:#faf9fc; --fg:#1c1a24; --dim:#5d5a6b; --line:#e4e2ea; }
          @media (prefers-color-scheme: dark) { :root { --bg:#151320; --fg:#eceaf2; --dim:#a09db0; --line:#2e2b3c; } }
          .ge-wrap { font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; background: var(--bg);
            color: var(--fg); min-height: 100vh; display: grid; place-items: center; padding: 1.5rem; }
          .ge-card { max-width: 26rem; text-align: center; }
          .ge-btn { margin-top: 1.75rem; padding: 0.7rem 1.4rem; border-radius: 0.7rem; border: none; font: inherit;
            font-weight: 600; color: #fff; cursor: pointer; background: linear-gradient(120deg,#8b5cf6,#d946a8); }
          .ge-btn:hover { filter: brightness(1.08); }
          .ge-link { display: inline-block; margin-top: 1rem; color: var(--dim); font-size: 0.85rem; }
        `}</style>
        <div className="ge-wrap">
          <div className="ge-card">
            <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>Something went wrong</h1>
            <p style={{ color: "var(--dim)", marginTop: "0.6rem", lineHeight: 1.6 }}>
              Classic Games Hub hit an unexpected error before it could load. Trying again usually
              sorts it.
            </p>
            <button className="ge-btn" onClick={reset}>
              Try again
            </button>
            <br />
            <a className="ge-link" href="/">
              Go to the home page
            </a>
            {error.digest && (
              <p
                style={{
                  marginTop: "1.75rem",
                  paddingTop: "1rem",
                  borderTop: "1px solid var(--line)",
                  color: "var(--dim)",
                  fontFamily: "ui-monospace, monospace",
                  fontSize: "0.7rem",
                }}
              >
                Reference: {error.digest}
              </p>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}
