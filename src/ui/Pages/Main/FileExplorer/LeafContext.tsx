import { usePlayer } from "../../../AudioPlayer/AudioPlayer";
import { useExplorer } from "../ExplorerContext";
import styles from "../SongListing/Songs/Item/SongContext.module.css";

type Props = {
    id: string;
    name: string;
    X: number;
    Y: number;
    isPlaylist: boolean;
    onClose: () => void;
};


function PlaylistContext({id, name, X, Y, isPlaylist, onClose}: Props) {
    const {deletePlaylist, playSong} = usePlayer()
    const {traverse} = useExplorer()

    function onDelete(name: string) {
        if (window.confirm(`Delete playlist "${name}"?`)) {
            deletePlaylist(name);
        }
        onClose()
    }

    function onShuffle() {
        const queue = traverse(id, true);
        const topSong = queue.at(0)
        if(topSong !== undefined)
            playSong(topSong);
    }

    return (
        <div
            className={styles.contextMenu}
            onClick={(event) => event.stopPropagation()}
            style={{ position: "fixed", left: X, top: Y }}
        >
            {isPlaylist && name !== "Favorites" && (
                <button onClick={() => onDelete(name)}>Delete Playlist</button>
            )}

            <button onClick={onShuffle}>Shuffle</button>
        </div>
    );
}

export default PlaylistContext;