export function artworkSource(art: string): string {
    if (art.startsWith("data:image/")) return art;
    return `music:///song?path=${encodeURIComponent(art)}`;
}
