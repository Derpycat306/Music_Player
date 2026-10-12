import { useEffect, useRef, useState } from 'react';
import { usePlayer } from '../../../../AudioPlayer/useAudioPlayer';
import { useExplorer } from '../../ExplorerContext/UseExplorer';
import SongItem from './Item/SongItem';
import styles from './SongList.module.css'
import { useVirtualList } from '../../useVirtualList';

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
    const {largeView, setLargeView, isPlaybackContext, returnToPlaybackContext} = useExplorer();
    const songsRef = useRef<HTMLDivElement>(null);
    const songsWindowRef = useRef<HTMLDivElement>(null);
    const rowHeight = 64;
    const visibleRange = useVirtualList(
        songsRef,
        songsWindowRef,
        currentQueue.length,
        rowHeight,
        6,
        currentSong !== null && currentQueue.length > 1,
    );

    function handleViewAction() {
        if (!isPlaybackContext) {
            returnToPlaybackContext();
        } else {
            setLargeView(!largeView);
        }
    }

    return (
        currentSong && currentQueue.length > 1 && <div className={styles.module}>
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
                    <button
                        type="button"
                        className={styles.viewModeButton}
                        aria-label={!isPlaybackContext
                            ? "Return to the currently playing context"
                            : largeView ? "Switch to normal view" : "Switch to large view"}
                        title={!isPlaybackContext
                            ? "Return to currently playing context"
                            : largeView ? "Normal view" : "Large view"}
                        onClick={handleViewAction}
                    >
                        {!isPlaybackContext ? "Return" : largeView ? "Normal view" : "Large view"}
                    </button>
                </div>
            </div>
            <div className={styles.songs} ref={songsRef}>
                <div
                    className={styles.songsWindow}
                    ref={songsWindowRef}
                    style={{ height: `${Math.max(0, currentQueue.length * rowHeight - 6)}px` }}
                >
                    {currentQueue.slice(visibleRange.start, visibleRange.end).map((songListing, offset) => {
                        const index = visibleRange.start + offset;
                        return (
                            <div
                                className={styles.songRow}
                                key={songListing.song.id}
                                style={{ top: `${index * rowHeight}px` }}
                            >
                                <SongItem songListing={songListing} />
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    )
}

export default SongList