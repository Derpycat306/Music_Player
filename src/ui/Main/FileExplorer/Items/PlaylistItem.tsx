import FolderItem from "./FolderItem";
import {usePlayer} from "../../../AudioPlayer/AudioPlayer";
import SongItem from "./Songs/SongItem";

function AlbumItem({ playlist }: { playlist: Playlist }) {
    const { songs } = usePlayer();

    const normalizeKey = (value: string) => value.replace(/\\/g, "/").toLowerCase();
    const songItems: Song[] = songs.filter((song) => {
        const exactMatches = playlist.songs.some((savedSong) =>
            normalizeKey(savedSong) === normalizeKey(song.id) ||
            normalizeKey(savedSong) === normalizeKey(song.path),
        );

        return exactMatches;
    });

    const children = songItems.length > 0
        ? songItems.map((song) => (
            <SongItem key={song.id} song={song} queue={songItems} />
        ))
        : [<div key={`${playlist.name}-empty`}>No songs in this playlist.</div>];

    return (
        <FolderItem
            key={playlist.name}
            name={playlist.name}
            children={children}
        />
    );
}

export default AlbumItem;
