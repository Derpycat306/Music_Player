import * as XLSX from "xlsx";
import { ipcMain, app } from "electron";
import path from "path";
import fs from "fs";

function formatSize(size: number): string {
    if (size < 1024) {
        return `${size} B`;
    } else if (size < 1024 * 1024) {
        return `${(size / 1024).toFixed(2)} KB`;
    } else {
        return `${(size / (1024 * 1024)).toFixed(2)} MB`;
    }
}

function exportSongs(songs: Song[]): boolean {
    try {
    const sheet = XLSX.utils.json_to_sheet(songs.map(song => ({
        Artist: song.artist,
        Album: song.album,
        Title: song.title,
        Length: song.duration,
        Size: song.path ? formatSize(fs.statSync(song.path).size) : "0 B",
    })));
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Songs");
    const downloads = app.getPath("downloads");
    const filePath = path.join(downloads, "songs.xlsx");
    XLSX.writeFile(book, filePath);
        return true;
    } catch {
        return false;
    }
}

ipcMain.handle("export-songs", async (_, songs: Song[]) => {
    return exportSongs(songs);
});