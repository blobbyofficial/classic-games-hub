"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0, background: "#151320", color: "#e5e5e5" }}>
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Something went wrong</h1>
          <p style={{ opacity: 0.7, marginTop: "0.5rem" }}>The app hit an unexpected error.</p>
          <button
            onClick={reset}
            style={{ marginTop: "1.5rem", padding: "0.6rem 1.2rem", borderRadius: "0.6rem", border: "none", background: "#8b5cf6", color: "#fff", fontWeight: 600, cursor: "pointer" }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
