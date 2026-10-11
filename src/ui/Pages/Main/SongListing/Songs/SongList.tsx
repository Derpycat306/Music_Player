import { useEffect, useRef, useState } from 'react';
import { usePlayer } from '../../../../AudioPlayer/useAudioPlayer';
import SongItem from './Item/SongItem';
import styles from './SongList.module.css'

function CurrentTitle({ title }: { title: string }) {
    const titleRef = useRef<HTMLElement>(null);
    const measureRef = useRef<HTMLSpanElement>(null);
    const [isScrollable, setIsScrollable] = useState(false);

    useEffect(() => {
        const element = titleRef.current;
        if (!element) return;

        const updateScrollable = () => {
            const textWidth = measureRef.current?.getBoundingClientRect().width ?? 0;
            setIsScrollable(textWidth > element.clientWidth + 1);
        };

        const observer = new ResizeObserver(updateScrollable);
        observer.observe(element);
        updateScrollable();

        return () => observer.disconnect();
    }, [title]);

    return (
        <strong
            ref={titleRef}
            className={`${styles.currentTitle} ${isScrollable ? styles.currentTitleScrollable : ''}`}
            tabIndex={isScrollable ? 0 : undefined}
            title={title}
        >
            <span className={styles.currentTitleTrack}>
                <span className={styles.currentTitleText}>{title}</span>
                {isScrollable && (
                    <span className={styles.currentTitleText} aria-hidden="true">{title}</span>
                )}
            </span>
            <span ref={measureRef} className={styles.currentTitleMeasure} aria-hidden="true">{title}</span>
        </strong>
    );
}

function SongList () {
    const {currentQueue, currentSong} = usePlayer();

    return (
        currentSong && currentQueue.length > 0 && <div className={styles.module}>
            <div className={styles.name}>
                <div className={styles.currentArt}>
                    {currentSong.art && (
                        <img
                            src={`music:///song?path=${encodeURIComponent(currentSong.art)}`}
                            alt=""
                        />
                    )}
                </div>
                <div className={styles.currentInfo}>
                    <span className={styles.nowPlayingLabel}>Now Playing</span>
                    <CurrentTitle title={currentSong.song.title} />
                    <span className={styles.currentArtist} title={currentSong.song.artist ?? "Unknown Artist"}>
                        {currentSong.song.artist ?? "Unknown Artist"}
                    </span>
                </div>
            </div>
            <div className={styles.songs}>
                {
                    currentQueue.map(songListing => (
                        <SongItem key={songListing.song.id} songListing={songListing} />
                    ))
                }
            </div>
        </div>
    )
}

export default SongList