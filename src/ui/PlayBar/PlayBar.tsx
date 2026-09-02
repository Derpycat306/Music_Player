import { useState, type ReactNode } from "react";
import { usePlayer } from "../AudioPlayer/AudioPlayer";
import styles from "./PlayBar.module.css";

import { SoundOff, SoundMin, SoundLow, SoundHigh } from "iconoir-react";

function formatTime(seconds: number): string {
    if (!Number.isFinite(seconds) || seconds < 0) {
        return "00:00";
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
        .toString()
        .padStart(2, "0")}`;
}

function VolumeIcon(volume: number, mute: boolean): ReactNode {
    if (volume === 0 || mute) {
        return <SoundOff />;
    }

    if (volume < 0.33) {
        return <SoundMin />;
    }

    if (volume < 0.66) {
        return <SoundLow />;
    }

    return <SoundHigh />;
}

function PlayBar() {
    const {
        currentSong,
        playing,
        currentTime,
        duration,
        volume,
        autoplay,
        pause,
        seek,
        setVolume,
        playSong,
        playNext,
        playPrevious,
        toggleAutoplay
    } = usePlayer();
    const [muted, setMuted] = useState<boolean>(false);
    const [resetVol, newResetVol] = useState<number>(0);

    if (!currentSong)
        return <div className={styles.main}>Nothing Playing Yet</div>;

    return (
        <div className={styles.main}>
            <div className={styles.info}>
                <div>{currentSong.title}</div>
                <div>{currentSong.artist}</div>
            </div>

            <div className={styles.controls}>
                <div className={styles.controlButtons}>
                    <button onClick={() => playPrevious()}>◀</button>

                    <button
                        onClick={() =>
                            playing ? pause() : playSong(currentSong)
                        }
                    >
                        {playing ? "⏸" : "▶"}
                    </button>

                    <button 
                        onClick={() => playNext()}
                        className={`${autoplay ? styles.auto : ""}`}
                        onContextMenu={(e) => {
                            e.preventDefault();
                            toggleAutoplay();
                        }}
                        >▶</button>
                </div>

                <div className={styles.timeControl}>
                    <input
                        className={styles.timeSeeker}
                        type="range"
                        min="0"
                        step="0.05"
                        max={duration || 0}
                        value={currentTime}
                        onChange={(e) => seek(Number(e.target.value))}
                    />
                    <span>{formatTime(currentTime)}</span>
                    <span> / </span>
                    <span>{formatTime(duration)}</span>
                </div>
            </div>

            <div className={styles.volume}>
                <div
                    className={styles.mute}
                    onClick={() => {
                        if (muted) {
                            setMuted(false);
                            setVolume(resetVol);
                        } else {
                            setMuted(true);
                            newResetVol(volume);
                            setVolume(0);
                        }
                    }}
                >
                    {VolumeIcon(volume, muted)}
                </div>

                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volume}
                    onChange={(e) => {
                        setMuted(false);
                        setVolume(Number(e.target.value));
                    }}
                />
            </div>
        </div>
    );
}

export default PlayBar;
