import styles from "./SongItem.module.css";
import { useEffect, useRef, useState } from "react";
import { usePlayer } from "../../../../../AudioPlayer/useAudioPlayer";
import SongContext from "./SongContext";

function formatDuration(seconds: number): string {
    if (!Number.isFinite(seconds) || seconds < 0) return "--:--";
    return `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, "0")}`;
}

function SongItem(prop: {songListing: SongListing}) {
    const { playSong, currentSong } = usePlayer();
    const [contextMenu, setContextMenu] = useState<{X: number, Y: number} | null>(null);
    const titleRef = useRef<HTMLSpanElement>(null);
    const titleMeasureRef = useRef<HTMLSpanElement>(null);
    const [isTitleScrollable, setIsTitleScrollable] = useState(false);
    const song = prop.songListing.song
    const art = prop.songListing.art

    useEffect(() => {
        const titleElement = titleRef.current;
        if (!titleElement) return;

        const updateScrollable = () => {
            const textWidth = titleMeasureRef.current?.getBoundingClientRect().width ?? 0;
            setIsTitleScrollable(textWidth > titleElement.clientWidth + 1);
        };

        const observer = new ResizeObserver(updateScrollable);
        observer.observe(titleElement);
        updateScrollable();

        return () => observer.disconnect();
    }, [song.title]);

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
                        <span
                            ref={titleRef}
                            className={`${styles.title} ${isTitleScrollable ? styles.titleScrollable : ""}`}
                            title={song.title}
                        >
                            <span className={styles.titleTrack}>
                                <span>{song.title}</span>
                                {isTitleScrollable && <span aria-hidden="true">{song.title}</span>}
                            </span>
                            <span ref={titleMeasureRef} className={styles.titleMeasure} aria-hidden="true">
                                {song.title}
                            </span>
                        </span>
                        <span className={styles.artist}>{song.artist ?? "Unknown Artist"}</span>
                    </span>
                    <span className={styles.duration}>{formatDuration(song.duration)}</span>
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
