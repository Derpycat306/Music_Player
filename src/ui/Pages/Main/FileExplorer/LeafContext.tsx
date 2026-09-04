import { usePlayer } from "../../../AudioPlayer/AudioPlayer";
import { useExplorer } from "../ExplorerContext";
import ContextMenu from "../../../ContextMenu/ContextMenu";

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
        onClose();
    }

    return (
        <ContextMenu x={X} y={Y} onClose={onClose}>
            {isPlaylist && name !== "Favorites" && (
                <button onClick={() => onDelete(name)}>Delete Playlist</button>
            )}

            <button onClick={onShuffle}>Shuffle</button>
        </ContextMenu>
    );
}

export default PlaylistContext;