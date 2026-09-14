import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { AppError } from "@/lib/errors/app-error";
import { ErrorCode } from "@/lib/errors/error-code";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
/** Research PDFs run to a few hundred KB; the cap leaves room without inviting
 *  someone to park a video in the document library. */
export const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024;

/** Kept for the chart-image callers that predate documents. */
export const MAX_UPLOAD_BYTES = MAX_IMAGE_BYTES;

/** Only raster formats a charting tool actually produces. */
const extensionByMime: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

/** Documents are a separate allow-list: a PDF must never be storable through
 *  the chart-image path, nor an image through the document path. */
const documentExtensionByMime: Record<string, string> = {
  "application/pdf": "pdf",
};

const mimeByExtension: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  pdf: "application/pdf",
};

/**
 * Sits outside the bundle so uploads survive a rebuild. Statically scoped on
 * purpose: a path the bundler cannot see through makes it trace the whole
 * project. Change it here rather than through the environment.
 */
const UPLOAD_DIR = path.join(process.cwd(), "uploads");

/** A stored name is always "<uuid>.<ext>" — no caller-supplied path survives. */
const STORED_NAME = /^[0-9a-f-]{36}\.(png|jpg|webp|gif|pdf)$/;

export function isStoredName(name: string): boolean {
  return STORED_NAME.test(name);
}

export function contentTypeFor(name: string): string {
  return mimeByExtension[name.split(".").pop() ?? ""] ?? "application/octet-stream";
}

export async function storeDocument(file: File): Promise<string> {
  return store(file, documentExtensionByMime[file.type], MAX_DOCUMENT_BYTES);
}

export async function storeImage(file: File): Promise<string> {
  return store(file, extensionByMime[file.type], MAX_IMAGE_BYTES);
}

async function store(file: File, extension: string | undefined, maxBytes: number): Promise<string> {
  if (!extension) {
    throw new AppError(400, ErrorCode.validation, "file");
  }
  if (file.size === 0 || file.size > maxBytes) {
    throw new AppError(400, ErrorCode.validation, "file");
  }

  // The name is generated, never taken from the upload, so a crafted filename
  // cannot escape the directory or pick its own extension.
  const name = `${randomUUID()}.${extension}`;
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, name), Buffer.from(await file.arrayBuffer()));

  return name;
}

/** Reads any stored upload — image or document — by its generated name. */
export async function readUpload(name: string): Promise<Buffer> {
  if (!isStoredName(name)) {
    throw new AppError(404, ErrorCode.notFound);
  }

  try {
    return await readFile(path.join(UPLOAD_DIR, name));
  } catch {
    throw new AppError(404, ErrorCode.notFound);
  }
}

/** Retained for the chart-image callers. */
export const readImage = readUpload;
