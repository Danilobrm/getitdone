import { ImageResponse } from "next/og";

const ICONS = {
  "192": { size: 192, rounded: true },
  "512": { size: 512, rounded: true },
  // Full bleed with the glyph inside the safe zone, for adaptive/masked icons.
  "maskable-512": { size: 512, rounded: false },
  // iOS applies its own rounding.
  "apple-180": { size: 180, rounded: false },
} as const;

type IconName = keyof typeof ICONS;

export const dynamic = "force-static";

export function generateStaticParams() {
  return Object.keys(ICONS).map((name) => ({ name }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const icon = ICONS[name as IconName];
  if (!icon) return new Response("Not found", { status: 404 });

  const glyph = icon.rounded ? icon.size * 0.52 : icon.size * 0.4;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#000",
          borderRadius: icon.rounded ? icon.size * 0.22 : 0,
        }}
      >
        <svg width={glyph} height={glyph} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 12.5l5 5L20 6.5" />
        </svg>
      </div>
    ),
    { width: icon.size, height: icon.size },
  );
}
