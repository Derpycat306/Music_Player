import {useState} from "react";
import {usePlayer} from "../../../../../AudioPlayer/AudioPlayer";

type Props = {
    song: string;
};

function NewPlaylist({song}: Props) {
    const {addPlaylist} = usePlayer();
    const [playlistName, setPlaylistName] = useState("");

    return (
        <div>
            <input type="text" onChange={(e) => 
                setPlaylistName(e.target.value)
            }/>
            <button
                onClick={() => {
                    addPlaylist(playlistName, song);
                }}
            >
                Add to Playlist
            </button>
        </div>
    )
}

export default NewPlaylist;