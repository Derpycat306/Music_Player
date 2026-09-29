import { useContext } from "react";
import { ExplorerContext } from "./ExplorerContext";

export function useExplorer() {
    const context = useContext(ExplorerContext)

    if (!context) {
        throw new Error("ExplorerContext must be used within a provider");
    }

    return context;
}