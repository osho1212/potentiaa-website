import { NextResponse } from "next/server";
import { writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Dev-only endpoint used by /public/__trace.html to bake the traced hero field
 * into lib/heroFieldData.ts.
 *
 * The field's strands are read off the owner's reference video by ridge
 * detection - see the tracer - and that has to happen in a browser, because
 * decoding an mp4 frame needs a <video>. This is how the result gets from there
 * to a file the bundle can import.
 *
 * Refuses to run outside development: it writes to source, so it must never
 * exist on a deployed site.
 */

export const runtime = "nodejs";

const OUT = path.join(process.cwd(), "lib", "heroFieldData.ts");

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not available outside development" }, { status: 403 });
  }

  let body: { data?: unknown; strands?: unknown; samples?: unknown; note?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data = typeof body.data === "string" ? body.data : "";
  const strands = Number(body.strands);
  const samples = Number(body.samples);
  const note = typeof body.note === "string" ? body.note : "";

  if (!data || !Number.isInteger(strands) || !Number.isInteger(samples)) {
    return NextResponse.json({ error: "data, strands and samples are required" }, { status: 400 });
  }
  if (!/^[A-Za-z0-9+/=]+$/.test(data)) {
    return NextResponse.json({ error: "data must be base64" }, { status: 400 });
  }

  const file = `/**
 * THE HERO FIELD, traced off the owner's reference video. GENERATED - do not
 * hand-edit; re-run the tracer at /__trace.html instead.
 *
 * ${note}
 *
 * Every strand in the hero is a filament measured out of the video rather than
 * invented: ridge detection on a frame finds the centreline of each one, the
 * result is warped onto the artwork's own module axis, and this is what comes
 * out. See lib/heroEnergy for how it is unpacked and what is added to it.
 *
 * Coordinates are the artwork's half-width units with the artwork's centre at
 * the origin and +y upward - the same frame lib/heroEnergy works in - stored as
 * signed 16-bit at 1/${SCALE} of a unit, x and y interleaved, ${samples} points
 * per strand, ${strands} strands. The leading byte of each strand is its colour
 * family: 0 blue, 1 coral.
 */

export const FIELD_STRANDS = ${strands};
export const FIELD_SAMPLES = ${samples};
export const FIELD_SCALE = ${SCALE};

export const FIELD_DATA =
  "${data}";
`;

  await writeFile(OUT, file, "utf8");
  return NextResponse.json({ ok: true, bytes: data.length, strands, samples });
}

/** Fixed-point divisor the tracer and the reader must agree on. */
const SCALE = 4096;
