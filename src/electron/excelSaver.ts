import * as XLSX from "xlsx";
import { ipcMain, app } from "electron";
import path from "path/posix";

function exportSongs(songs: Song[]): boolean {
    try {
    const sheet = XLSX.utils.json_to_sheet(songs.map(song => ({
        Artist: song.artist,
        Album: song.album,
        Title: song.title,
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