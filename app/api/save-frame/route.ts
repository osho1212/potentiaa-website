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

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]"]);

/**
 * WHETHER THE REQUEST CAME FROM THE STUDIO PAGE ON THIS MACHINE.
 *
 * The NODE_ENV check keeps this off a deployed site, but `next dev` has no CSRF
 * protection of its own: while it runs, any website open in the same browser
 * can POST to localhost. request.json() parses a text/plain body as happily as
 * a JSON one, and text/plain is exactly what a cross-site request can send
 * without a CORS preflight - so a malicious page could overwrite the frames.
 *
 * Browsers attach Origin to every POST, so require it to be this dev server's
 * own origin. Requiring a localhost Host as well shuts out DNS rebinding, where
 * an attacker's domain is pointed at 127.0.0.1 and Origin and Host would match.
 */
function isFromLocalStudio(request: Request): boolean {
  const host = request.headers.get("host") ?? "";
  const origin = request.headers.get("origin");
  if (!origin) return false;

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return false;
  }

  const hostname = host.replace(/:\d+$/, "");
  return LOCAL_HOSTNAMES.has(hostname) && originHost === host;
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not available outside development" }, { status: 403 });
  }
  if (!isFromLocalStudio(request)) {
    return NextResponse.json({ error: "Only the local /studio page can save frames" }, { status: 403 });
  }
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return NextResponse.json({ error: "Expected application/json" }, { status: 415 });
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
