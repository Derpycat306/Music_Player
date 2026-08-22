import AlbumItem from "./AlbumItem";
import type { ArtistListing } from "./FileExplorer";
import FolderItem from "./FolderItem";
import SongItem from "./SongItem";

function ArtistItem({ artist }: { artist: ArtistListing }) {
    return (
        <FolderItem
            key={artist.name}
            name={artist.name}
            children={[
                ...artist.albums.map((album) => (
                    <AlbumItem key={album.id} album={album} />
                )),

                ...artist.songs.map((song) => (
                    <SongItem key={song.id} song={song} />
                )),
            ]}
        />
    );
}

export default ArtistItem;
