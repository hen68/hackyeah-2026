import { ImageResponse } from "next/og";

export const alt = "Digna — Feel understood through menopause";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 28,
          padding: 80,
          background: "#F4FBF6",
          borderTop: "16px solid #00331F",
          color: "#0E1F16",
        }}
      >
        <div style={{ fontSize: 40, fontWeight: 700, color: "#00331F" }}>Digna</div>
        <div style={{ fontSize: 84, fontWeight: 400, lineHeight: 1.05, letterSpacing: -2 }}>
          Feel understood through menopause
        </div>
        <div style={{ fontSize: 36, maxWidth: 900, color: "#405147" }}>
          Tell me how you feel each day. Before every visit, your doctor gets a clear report.
        </div>
      </div>
    ),
    size,
  );
}
