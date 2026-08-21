import styles from './SongView.module.css'

function SongView(){
    return <div className={styles.main}>
        <h1>Song View</h1>
        <button onClick={() => {
            //@ts-ignore
            window.electron.setFolder(`C:\\Web Development\\jsprojects\\Electron\\Music_Player\\MusicSource`);
        }}> change directory</button>
    </div>
}

export default SongView