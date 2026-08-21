export interface Song {
    id: string;
    title: string;
    artist: string | null;
    album: string | null;
    trackNumber: number;
    duration: number;
    path: string;
    coverPath?: string;
}