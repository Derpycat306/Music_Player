import { XmarkCircle } from "iconoir-react";
import styles from "./SettingsMenu.module.css";
import { Link } from "react-router-dom";

const TESTING = import.meta.env.DEV;

function SettingsMenu() {
    return (
        <div className={styles.body}>
            <div className={styles.header}>
                <Link to={"/"} className={styles.mainLink}>
                    <XmarkCircle className={styles.xmark} />
                </Link>
            </div>
            <div className={styles.main}>
                {TESTING && (
                    <button
                        onClick={() => {
                            window.electron.setFolder(
                                `C:\\Web Development\\jsprojects\\Electron\\Music_Player\\Test\\TestMusic`,
                            );
                        }}
                    >
                        use testing directory
                    </button>
                )}
                <button
                    onClick={() => {
                        window.electron.selectFolder();
                    }}
                >
                    Select Folder
                </button>
            </div>
        </div>
    );
}

export default SettingsMenu;
