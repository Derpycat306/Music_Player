import styles from './MainPanel.module.css'

function MainPanel(){
    return <div className={styles.main}>
        <h1>Main Home Page</h1>
        <button onClick={() => {
            //@ts-ignore
            window.electron.setFolder(`C:\\Web Development\\jsprojects\\Electron\\Music_Player\\MusicSource`);
        }}>use testing directory</button>
        <button onClick={() => {
                //@ts-ignore
                window.electron.selectFolder()
            }
        }>Select Folder</button>
    </div>
}

export default MainPanel