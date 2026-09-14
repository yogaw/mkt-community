import { NextResponse, type NextRequest } from "next/server";
import { ebookService } from "@/features/ebooks/service/ebook-service";
import { requireAuth } from "@/lib/api/auth";
import { toErrorResponse } from "@/lib/api/response";
import { contentDisposition } from "@/lib/uploads/content-disposition";
import { contentTypeFor, readUpload } from "@/lib/uploads/storage";

/**
 * Serves a library document to an authenticated member only.
 *
 * Unlike the chart-image route, this one requires a bearer token: these are
 * licensed third-party documents behind a paid membership, so a URL alone must
 * not be enough to obtain one. The client fetches with its token and opens the
 * blob, rather than pointing the browser straight at a link.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    await requireAuth(request);

    const { id } = await params;
    const { fileName, title } = await ebookService.getFileName(id);
    const file = await readUpload(fileName);

    return new NextResponse(new Uint8Array(file), {
      status: 200,
      headers: {
        "Content-Type": contentTypeFor(fileName),
        // inline so it opens in the viewer. Encoded: these titles carry em
        // dashes, which a raw header value cannot hold.
        "Content-Disposition": contentDisposition("inline", `${title}.pdf`),
        // Never shared or cached by an intermediary: it is member-only content.
        "Cache-Control": "private, max-age=0, no-store",
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
