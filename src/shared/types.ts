export interface Song {
    id: string;
    title: string;
    artist: string;
    album: string;
    trackNumber: number;
    duration: number;
    path: string;
    coverPath?: string;
}