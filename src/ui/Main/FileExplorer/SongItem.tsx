import styles from "./SongItem.module.css";
import { usePlayer } from "../../AudioPlayer/AudioPlayer";

function SongItem({ song }: { song: Song }) {
    const { playSong, isFavorite, toggleFavorite } = usePlayer();

    return (
        <div
            className={`${styles.item} ${isFavorite(song.id) ? styles.favorite : ""}`}
            onClick={() => {playSong(song)}}
            onMouseDown={(e) => {
                if(e.button === 2)
                e.preventDefault; toggleFavorite(song.id);
            }}
        >
            <div>{song.title}</div>
        </div>
    );
}

export default SongItem;
