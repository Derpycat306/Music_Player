import styles from "./SongItem.module.css";
import { useState } from "react";
import { usePlayer } from "../../../../../AudioPlayer/useAudioPlayer";
import SongContext from "./SongContext";

function SongItem(prop: {songListing: SongListing}) {
    const { playSong, currentSong } = usePlayer();
    const [contextMenu, setContextMenu] = useState<{X: number, Y: number} | null>(null);
    const song = prop.songListing.song
    const art = prop.songListing.art

    return (
        <>
            <div className={`${styles.item} ${song.id === currentSong?.song.id ? styles.current : ""}`}>
                <button
                    type="button"
                    className={styles.playItem}
                    onClick={() => {
                        void playSong(prop.songListing);
                    }}
                    onContextMenu={(event) => {
                        event.preventDefault();
                        setContextMenu({ X: event.clientX, Y: event.clientY });
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
                    <span className={styles.copy}>
                        <span className={styles.title}>{song.title}</span>
                        <span className={styles.artist}>{song.artist ?? "Unknown Artist"}</span>
                    </span>
                </button>
            </div>
            {contextMenu && (
                <SongContext
                    song={song}
                    X={contextMenu.X}
                    Y={contextMenu.Y}
                    onClose={() => setContextMenu(null)}
                />
            )}
        </>
    );
}

export default SongItem;
