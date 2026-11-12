import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";
import { defaultLayoutToml } from "@/domain/default-layout";
import { shapes } from "@/domain/geometry";
import { importKalamine } from "@/domain/kalamine";
import { isSpaceChar } from "@/domain/layout";
import { isSpecialKey } from "@/domain/symbols";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { ogColors } from "@/lib/og-colors";

const size = { width: 1200, height: 630 };

// The 34-key board: the shape the image has room for, and the one most split keyboards share.
const shape = shapes.split34;
const imported = importKalamine(defaultLayoutToml, "split40");
const keys = imported.ok ? imported.layout.keys : {};
const minX = Math.min(...shape.keys.map((slot) => slot.x));
const columns = Math.max(...shape.keys.map((slot) => slot.x)) - minX + 1;
const unit = 66;
const gap = 8;

export async function generateImageMetadata({ params }: { params: { lang: string } }) {
  if (!hasLocale(params.lang)) return [];
  const { meta } = await getDictionary(params.lang);
  return [{ id: "default", alt: meta.imageAlt, size, contentType: "image/png" }];
}

export default async function Image({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const { meta, about } = await getDictionary(lang);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px 64px",
          background: ogColors.background,
          color: ogColors.foreground,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div style={{ width: 18, height: 56, borderRadius: 6, background: ogColors.accent }} />
            <div style={{ fontSize: 68, fontWeight: 700, letterSpacing: -2 }}>{meta.title}</div>
          </div>
          <div style={{ fontSize: 34, color: ogColors.muted, maxWidth: 1000 }}>{about.title}</div>
        </div>

        <div
          style={{
            position: "relative",
            display: "flex",
            alignSelf: "center",
            width: columns * unit - gap,
            height: shape.height * unit - gap,
          }}
        >
          {shape.keys.map((slot) => {
            const char = keys[slot.id]?.base;
            const special = isSpecialKey(char) && !isSpaceChar(char);
            return (
              <div
                key={slot.id}
                style={{
                  position: "absolute",
                  left: (slot.x - minX) * unit,
                  top: slot.y * unit,
                  width: unit - gap,
                  height: unit - gap,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 10,
                  border: `2px solid ${slot.home ? ogColors.accent : ogColors.keyBorder}`,
                  background: slot.home ? ogColors.accentSoft : ogColors.key,
                  color: special ? ogColors.accent : ogColors.foreground,
                  fontSize: 28,
                  fontWeight: 600,
                }}
              >
                {char && !isSpaceChar(char) ? char.toUpperCase() : ""}
              </div>
            );
          })}
        </div>
      </div>
    ),
    size,
  );
}
