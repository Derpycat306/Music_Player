import path from "path";

const AUDIO_EXTENSIONS = new Set([
    ".mp3",
    ".flac",
    ".wav",
    ".ogg",
    ".m4a",
    ".aac",
    ".opus",
]);

export function isAudioFile(filename: string): boolean {
    return AUDIO_EXTENSIONS.has(path.extname(filename).toLowerCase());
}

export function removeExtension(name: string): string {
    for(const ext of AUDIO_EXTENSIONS){
        if(name.endsWith(ext)){
            return name.slice(0, -ext.length)
        }
    }
    return name
}

const IMAGE_EXTENSIONS = new Set([
    ".jpg",
    ".png",
    ".gif",
    ".webp",
    ".avif",
    ".svg",
    ".bmp",
    ".ico",
]);

export function isImageFile(filename: string): boolean {
    return IMAGE_EXTENSIONS.has(path.extname(filename).toLowerCase());
}
