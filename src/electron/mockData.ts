import { Song } from "../shared/types.js";

export const mockSongs: Song[] = [
    {
        id: "1",
        title: "First Song",
        artist: "Example Artist",
        album: "Example Album",
        trackNumber: 1,
        path: "C:/Music/Example Artist/Example Album/01 First Song.flac",
        duration: 214
    },
    {
        id: "2",
        title: "Second Song",
        artist: "Example Artist",
        album: "Example Album",
        trackNumber: 2,
        path: "C:/Music/Example Artist/Example Album/02 Second Song.flac",
        duration: 187
    },
    {
        id: "3",
        title: "Another Day",
        artist: "Another Artist",
        album: "Another Album",
        trackNumber: 1,
        path: "C:/Music/Another Artist/Another Album/01 Another Day.flac",
        duration: 241
    },
    {
        id: "4",
        title: "Final Track",
        artist: "Another Artist",
        album: "Another Album",
        trackNumber: 2,
        path: "C:/Music/Another Artist/Another Album/02 Final Track.flac",
        duration: 302
    }
];