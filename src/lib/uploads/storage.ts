import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { AppError } from "@/lib/errors/app-error";
import { ErrorCode } from "@/lib/errors/error-code";

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/** Only raster formats a charting tool actually produces. */
const extensionByMime: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

const mimeByExtension: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
};

/**
 * Sits outside the bundle so uploads survive a rebuild. Statically scoped on
 * purpose: a path the bundler cannot see through makes it trace the whole
 * project. Change it here rather than through the environment.
 */
const UPLOAD_DIR = path.join(process.cwd(), "uploads");

/** A stored name is always "<uuid>.<ext>" — no caller-supplied path survives. */
const STORED_NAME = /^[0-9a-f-]{36}\.(png|jpg|webp|gif)$/;

export function isStoredName(name: string): boolean {
  return STORED_NAME.test(name);
}

export function contentTypeFor(name: string): string {
  return mimeByExtension[name.split(".").pop() ?? ""] ?? "application/octet-stream";
}

export async function storeImage(file: File): Promise<string> {
  const extension = extensionByMime[file.type];
  if (!extension) {
    throw new AppError(400, ErrorCode.validation, "file");
  }
  if (file.size === 0 || file.size > MAX_UPLOAD_BYTES) {
    throw new AppError(400, ErrorCode.validation, "file");
  }

  // The name is generated, never taken from the upload, so a crafted filename
  // cannot escape the directory or pick its own extension.
  const name = `${randomUUID()}.${extension}`;
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, name), Buffer.from(await file.arrayBuffer()));

  return name;
}

export async function readImage(name: string): Promise<Buffer> {
  if (!isStoredName(name)) {
    throw new AppError(404, ErrorCode.notFound);
  }

  try {
    return await readFile(path.join(UPLOAD_DIR, name));
  } catch {
    throw new AppError(404, ErrorCode.notFound);
  }
}
