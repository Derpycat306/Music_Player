import { usePlayer } from "../../AudioPlayer/AudioPlayer";
import { XmarkCircle } from "iconoir-react";
import styles from "./SettingsMenu.module.css";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

const TESTING = import.meta.env.DEV;

function SettingsMenu() {
    const {songs} = usePlayer();
    const [folderPath, setFolderPath] = useState<string | null>(null);
    const [exportStatus, setExportStatus] = useState<string | null>(null);
    const [updateStatus, setUpdateStatus] = useState<string | null>(null);

    useEffect(() => {
        void window.electron.settings.get().then((settings) => {
            setFolderPath(settings.baseFolder);
        });
    }, []);

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
                        void window.electron.selectFolder().then((selectedPath) => {
                            if (selectedPath) {
                                setFolderPath(selectedPath);
                            }
                        });
                    }}
                >
                    Select Folder
                    <span className={styles.buttonMessage}>
                        {folderPath ?? "No folder selected"}
                    </span>
                </button>
                <button onClick={() => {
                    void window.electron.exportSongs(songs).then((saved) => {
                        setExportStatus(saved ? "Saved to Downloads" : null);
                    });
                }}>
                    Export songs
                    {exportStatus && (
                        <span className={styles.buttonMessage}>{exportStatus}</span>
                    )}
                </button>
                <button onClick={() => {
                    setUpdateStatus("Checking for updates...");
                    void window.electron.updates.check().then((update) => {
                        if (!update.available) {
                            setUpdateStatus("You are up to date");
                            return;
                        }

                        const shouldInstall = window.confirm(
                            `Version ${update.version} is available. Download and install it now?`,
                        );

                        if (!shouldInstall) {
                            setUpdateStatus("Update postponed");
                            return;
                        }

                        setUpdateStatus("Downloading update...");
                        void window.electron.updates.install().then(() => {
                            setUpdateStatus("Restarting to install update...");
                        }).catch(() => {
                            setUpdateStatus("Update failed");
                        });
                    }).catch(() => {
                        setUpdateStatus("Unable to check for updates");
                    });
                }}>
                    Check for updates
                    {updateStatus && (
                        <span className={styles.buttonMessage}>{updateStatus}</span>
                    )}
                </button>
            </div>
        </div>
    );
}

export default SettingsMenu;
