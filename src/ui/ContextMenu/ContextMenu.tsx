import { useEffect, useRef, useState, type CSSProperties, type PropsWithChildren } from "react";
import styles from "./ContextMenu.module.css";

type ContextMenuProps = PropsWithChildren<{
    x: number;
    y: number;
    onClose: () => void;
}>;

function ContextMenu({ x, y, onClose, children }: ContextMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ x, y });

    useEffect(() => {
        const menu = menuRef.current;
        if (!menu) return;

        const margin = 8;
        const nextX = Math.min(Math.max(margin, x), window.innerWidth - menu.offsetWidth - margin);
        const nextY = Math.min(Math.max(margin, y), window.innerHeight - menu.offsetHeight - margin);
        setPosition({ x: nextX, y: nextY });
    }, [x, y]);

    useEffect(() => {
        const handlePointerDown = (event: PointerEvent) => {
            if (!menuRef.current?.contains(event.target as Node)) onClose();
        };
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
        };

        document.addEventListener("pointerdown", handlePointerDown);
        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("pointerdown", handlePointerDown);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [onClose]);

    const menuStyle: CSSProperties = {
        left: position.x,
        top: position.y,
    };

    return (
        <div
            ref={menuRef}
            className={styles.menu}
            style={menuStyle}
            role="menu"
            onPointerDown={(event) => event.stopPropagation()}
        >
            {children}
        </div>
    );
}

export default ContextMenu;
