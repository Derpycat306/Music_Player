import styles from "./SongItem.module.css";
import {useState, useEffect} from "react";
import { usePlayer } from "../../../../AudioPlayer/AudioPlayer";
import SongContext from "./SongContext";

function SongItem({ song, queue, queueSource }: {
    song: Song;
    queue?: Song[];
    queueSource?: "provided" | "favorites";
}) {
    const { playSong, currentSong, isFavorite } = usePlayer();
    const [contextMenu, setContextMenu] = useState<{X: number, Y: number, song: Song} | null>(null);

    useEffect(() => {
        const closeContext = () => setContextMenu(null);

        window.addEventListener("click", closeContext);

        return () => {
            window.removeEventListener("click", closeContext);
        }
    }, [])

    return (
        <div>
            <div
                className={`${styles.item} ${song.id === currentSong?.id ? styles.current : ""} ${isFavorite(song.id) ? styles.favorite : ""}`}
                onClick={() => {playSong(song, queue ?? [], queueSource)}}
                onMouseDown={(e) => {
                    if(e.button === 2){
                        e.preventDefault;
                        setContextMenu({X: e.clientX, Y: e.clientY, song});
                    }
                }}
            >
                <div>{song.title}</div>
            </div>
                {contextMenu && (
                    <SongContext song={contextMenu.song} X={contextMenu.X} Y={contextMenu.Y} />
                )}
        </div>
    );
}

export default SongItem;
