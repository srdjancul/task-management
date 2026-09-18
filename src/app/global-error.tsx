"use client";

// Rendered only if the root layout itself crashes, so globals.css may not
// be loaded — the few inline values mirror the tokens (grey-900/grey-50).
export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          background: "#181a20",
          color: "#ffffff",
          fontFamily: "system-ui, sans-serif",
          fontSize: 14,
        }}
      >
        <p>Something went badly wrong.</p>
        <button
          onClick={reset}
          style={{
            border: "1px solid #4b4f5c",
            background: "transparent",
            color: "#ffffff",
            borderRadius: 8,
            padding: "6px 12px",
            cursor: "pointer",
          }}
        >
          Reload
        </button>
      </body>
    </html>
  );
}
