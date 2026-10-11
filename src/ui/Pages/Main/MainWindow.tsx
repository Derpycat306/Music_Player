import { useEffect, useRef, useState } from "react";
import FileExplorer from "./FileExplorer/FileExplorer";
import styles from "./MainWindow.module.css";
import MainHeader from "./Header/MainHeader";
import MainPanel from "./MainPanel/MainPanel";
import SongList from "./SongListing/Songs/SongList";

function MainWindow() {
    const mainRef = useRef<HTMLDivElement>(null);
    const dragRef = useRef<{ side: "explorer" | "songs"; startX: number; startWidth: number } | null>(null);
    const [explorerWidth, setExplorerWidth] = useState(200);
    const [songListWidth, setSongListWidth] = useState(200);
    const [isResizing, setIsResizing] = useState(false);
    const [widthsLoaded, setWidthsLoaded] = useState(false);

    useEffect(() => {
        let active = true;
        void window.electron.settings.get().then((settings) => {
            if (!active) return;
            setExplorerWidth(settings.explorerWidth ?? 200);
            setSongListWidth(settings.songListWidth ?? 200);
            setWidthsLoaded(true);
        });

        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        if (!widthsLoaded) return;

        const timeout = window.setTimeout(() => {
            window.electron.settings.set({ explorerWidth, songListWidth });
        }, 200);

        return () => window.clearTimeout(timeout);
    }, [explorerWidth, songListWidth, widthsLoaded]);

    function maxPanelWidth(side: "explorer" | "songs") {
        const mainWidth = mainRef.current?.clientWidth ?? 0;
        const otherWidth = side === "explorer" ? songListWidth : explorerWidth;
        return Math.max(140, Math.min(420, mainWidth - otherWidth - 276));
    }

    function startResize(side: "explorer" | "songs", event: React.PointerEvent<HTMLDivElement>) {
        if (event.button !== 0) return;

        dragRef.current = {
            side,
            startX: event.clientX,
            startWidth: side === "explorer" ? explorerWidth : songListWidth,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
        setIsResizing(true);
        event.preventDefault();
    }

    function resize(event: React.PointerEvent<HTMLDivElement>) {
        const drag = dragRef.current;
        const mainWidth = mainRef.current?.clientWidth;
        if (!drag || !mainWidth) return;

        const delta = event.clientX - drag.startX;
        const width = drag.startWidth + (drag.side === "explorer" ? delta : -delta);
        const maxWidth = maxPanelWidth(drag.side);
        const nextWidth = Math.max(140, Math.min(maxWidth, width));

        if (drag.side === "explorer") {
            setExplorerWidth(nextWidth);
        } else {
            setSongListWidth(nextWidth);
        }
    }

    function stopResize() {
        dragRef.current = null;
        setIsResizing(false);
    }

    function resizeWithKeyboard(side: "explorer" | "songs", event: React.KeyboardEvent<HTMLDivElement>) {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();

        const direction = event.key === "ArrowRight" ? 1 : -1;
        if (!mainRef.current) return;

        if (side === "explorer") {
            const maxWidth = maxPanelWidth(side);
            setExplorerWidth((width) => Math.max(140, Math.min(maxWidth, width + direction * 12)));
        } else {
            const maxWidth = maxPanelWidth(side);
            setSongListWidth((width) => Math.max(140, Math.min(maxWidth, width - direction * 12)));
        }
    }

    return (
        <div className={styles.body}>
            <MainHeader />
            <div
                ref={mainRef}
                className={`${styles.main} ${isResizing ? styles.resizing : ""}`}
                style={{
                    gridTemplateColumns: `${explorerWidth}px 8px minmax(0, 1fr) 8px ${songListWidth}px`,
                }}
            >
                <div className={styles.explorer}><FileExplorer /></div>
                <div
                    className={`${styles.resizeHandle} ${styles.resizeExplorer}`}
                    role="separator"
                    aria-label="Resize Explorer"
                    aria-orientation="vertical"
                    aria-valuenow={explorerWidth}
                    aria-valuemin={140}
                    aria-valuemax={maxPanelWidth("explorer")}
                    tabIndex={0}
                    onPointerDown={(event) => startResize("explorer", event)}
                    onPointerMove={resize}
                    onPointerUp={stopResize}
                    onPointerCancel={stopResize}
                    onLostPointerCapture={stopResize}
                    onKeyDown={(event) => resizeWithKeyboard("explorer", event)}
                />
                <div className={styles.panel}><MainPanel /></div>
                <div
                    className={`${styles.resizeHandle} ${styles.resizeSongs}`}
                    role="separator"
                    aria-label="Resize song list"
                    aria-orientation="vertical"
                    aria-valuenow={songListWidth}
                    aria-valuemin={140}
                    aria-valuemax={maxPanelWidth("songs")}
                    tabIndex={0}
                    onPointerDown={(event) => startResize("songs", event)}
                    onPointerMove={resize}
                    onPointerUp={stopResize}
                    onPointerCancel={stopResize}
                    onLostPointerCapture={stopResize}
                    onKeyDown={(event) => resizeWithKeyboard("songs", event)}
                />
                <div className={styles.songList}><SongList /></div>
            </div>
        </div>
    );
}

export default MainWindow;
