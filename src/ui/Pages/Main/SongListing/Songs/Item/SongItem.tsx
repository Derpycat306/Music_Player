import styles from "./SongItem.module.css";
import {useState, useEffect} from "react";
import { usePlayer } from "../../../../../AudioPlayer/AudioPlayer";
import SongContext from "./SongContext";

function SongItem(prop: {songListing: SongListing}) {
    const { playSong, currentSong, isFavorite } = usePlayer();
    const [contextMenu, setContextMenu] = useState<{X: number, Y: number, song: Song} | null>(null);
    const song = prop.songListing.song
    const art = prop.songListing.art

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
                className={`${styles.item} ${song.id === currentSong?.song.id ? styles.current : ""} ${isFavorite(song.id) ? styles.favorite : ""}`}
                onClick={() => {playSong(prop.songListing)}}
                onMouseDown={(e) => {
                    if(e.button === 2){
                        e.preventDefault;
                        e.stopPropagation;
                        setContextMenu({X: e.clientX-200, Y: e.clientY, song});
                    }
                }}
            >
                {art != null && (
                    <div className={styles.icon}>
                        <img
                            src={`music:///song?path=${encodeURIComponent(art)}`}
                            alt=""
                        />
                    </div>
                )}
                <div className={styles.title}>{song.title}</div>
            </div>
                {contextMenu && (
                    <SongContext song={contextMenu.song} X={contextMenu.X} Y={contextMenu.Y} />
                )}
        </div>
    );
}

export default SongItem;
