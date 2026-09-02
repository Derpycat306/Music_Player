import { protocol } from "electron";
import fs from "fs";
import path from "path";

export function initProtocol() {
    protocol.handle("music", async (request) => {
        const url = new URL(request.url);
        const filePath = url.searchParams.get("path");

        if (!filePath) {
            return new Response("Missing path", { status: 400 });
        }

        try {
            const stats = await fs.promises.stat(filePath);
            const fileSize = stats.size;
            const contentType = getContentType(filePath);

            const range = request.headers.get("range");

            if (!range) {
                const buffer = await fs.promises.readFile(filePath);

                return new Response(buffer, {
                    status: 200,
                    headers: {
                        "Content-Type": contentType,
                        "Content-Length": fileSize.toString(),
                        "Accept-Ranges": "bytes",
                    },
                });
            }

            const match = range.match(/bytes=(\d+)-(\d*)/);

            if (!match) {
                return new Response("Invalid range", {
                    status: 416,
                });
            }

            const start = Number(match[1]);
            const requestedEnd = match[2] ? Number(match[2]) : fileSize - 1;

            const end = Math.min(requestedEnd, fileSize - 1);

            if (start >= fileSize || start > end) {
                return new Response(null, {
                    status: 416,
                    headers: {
                        "Content-Range": `bytes */${fileSize}`,
                    },
                });
            }

            const chunkSize = end - start + 1;

            const buffer = Buffer.alloc(chunkSize);

            const handle = await fs.promises.open(filePath, "r");

            try {
                await handle.read(buffer, 0, chunkSize, start);
            } finally {
                await handle.close();
            }

            return new Response(buffer, {
                status: 206,
                headers: {
                    "Content-Type": contentType,
                    "Content-Length": chunkSize.toString(),
                    "Content-Range": `bytes ${start}-${end}/${fileSize}`,
                    "Accept-Ranges": "bytes",
                },
            });
        } catch (error) {
            console.error("Music protocol error:", error);

            return new Response("File error", {
                status: 500,
            });
        }
    });
}

function getContentType(filePath: string): string {
    const extension = path.extname(filePath).toLowerCase();
    const imageTypes: Record<string, string> = {
        ".gif": "image/gif",
        ".jpeg": "image/jpeg",
        ".jpg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
    };

    return imageTypes[extension] ?? "audio/mpeg";
}