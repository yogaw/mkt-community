import { NextResponse } from "next/server";
import { toErrorResponse } from "@/lib/api/response";
import { contentTypeFor, readImage } from "@/lib/uploads/storage";

/**
 * Serves an uploaded chart.
 *
 * Deliberately unauthenticated: these URLs go into <img src>, which cannot
 * carry the bearer token the rest of the API uses. Names are random UUIDs, so
 * they are unguessable, but anyone holding a URL can fetch it. Moving these to
 * object storage with signed URLs is the production path.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> },
): Promise<NextResponse> {
  try {
    const { name } = await params;
    const file = await readImage(name);

    return new NextResponse(new Uint8Array(file), {
      status: 200,
      headers: {
        "Content-Type": contentTypeFor(name),
        // Content at a given name never changes; the name is new on every upload.
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
