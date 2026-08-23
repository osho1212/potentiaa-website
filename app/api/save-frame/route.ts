import { NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { FRAME_COUNT, FRAME_DIR, frameName } from "@/lib/frames";

/**
 * Dev-only endpoint used by /studio to write rendered hero frames into
 * public/assets/module-frames/.
 *
 * Refuses to run outside development - it writes to disk, so it must never
 * exist on a deployed site.
 */

export const runtime = "nodejs";

const OUT_DIR = path.join(process.cwd(), "public", ...FRAME_DIR.split("/").filter(Boolean));

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not available outside development" }, { status: 403 });
  }

  let body: { index?: unknown; dataUrl?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const index = Number(body.index);
  if (!Number.isInteger(index) || index < 0 || index >= FRAME_COUNT) {
    return NextResponse.json({ error: `index must be 0..${FRAME_COUNT - 1}` }, { status: 400 });
  }

  const dataUrl = typeof body.dataUrl === "string" ? body.dataUrl : "";
  const prefix = "data:image/webp;base64,";
  if (!dataUrl.startsWith(prefix)) {
    return NextResponse.json({ error: "dataUrl must be a base64 webp" }, { status: 400 });
  }

  const buffer = Buffer.from(dataUrl.slice(prefix.length), "base64");

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(path.join(OUT_DIR, frameName(index)), buffer);

  return NextResponse.json({ ok: true, file: frameName(index), bytes: buffer.byteLength });
}
