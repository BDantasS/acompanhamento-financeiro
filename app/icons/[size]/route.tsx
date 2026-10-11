import { ImageResponse } from "next/og";

const SIZES = new Set([180, 192, 512]);

// Ícone do PWA gerado em PNG: /icons/192, /icons/512, /icons/180 (Apple)
export async function GET(_req: Request, ctx: RouteContext<"/icons/[size]">) {
  const size = Number((await ctx.params).size);
  if (!SIZES.has(size)) return new Response("Not found", { status: 404 });

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0f8a5f",
          color: "white",
          fontSize: size * 0.5,
          fontWeight: 700,
        }}
      >
        R$
      </div>
    ),
    { width: size, height: size },
  );
}
