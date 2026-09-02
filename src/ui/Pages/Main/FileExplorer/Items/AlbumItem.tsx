import type { AlbumListing } from "../FileExplorer";
import FolderItem from "./FolderItem";
import SongItem from "./Songs/SongItem";

function AlbumItem({ album }: { album: AlbumListing }) {
    return (
        <FolderItem
            key={album.name}
            name={album.name}
            children={[
                ...album.songs.map((song) => (
                    <SongItem key={song.id} song={song} queue={album.songs} />
                )),
            ]}
        />
    );
}

export default AlbumItem;
