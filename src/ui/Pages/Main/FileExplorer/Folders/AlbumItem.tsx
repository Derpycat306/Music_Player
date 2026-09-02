import type { AlbumListing } from "../FileExplorer";
import FolderItem from "./FolderItem";
import SongItem from "../Songs/SongItem";
import styles from "./FolderItem.module.css";

function AlbumItem({ album }: { album: AlbumListing }) {
    return (
        <FolderItem
            key={album.name}
            name={album.name}
            icon={album.art ? (
                <img
                    className={styles.albumArt}
                    src={`music:///song?path=${encodeURIComponent(album.art)}`}
                    alt=""
                />
            ) : null}
            children={[
                ...album.songs.map((song) => (
                    <SongItem key={song.id} song={song} queue={album.songs} />
                )),
            ]}
        />
    );
}

export default AlbumItem;
