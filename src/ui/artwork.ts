function findCover(covers: AlbumCover[], id: string): string | undefined {
    return covers.find((cover) => cover.id === id)?.coverPath;
}

function albumKey(artist: string | null, album: string | null): string {
    return JSON.stringify([
        artist?.trim().toLowerCase() ?? "",
        album?.trim().toLowerCase() ?? "",
    ]);
}

export function createArtworkResolver(songs: Song[], covers: AlbumCover[]) {
    const rootArt = findCover(covers, "root-art");
    const metadataAlbumArt = new Map<string, string>();
    for (const song of songs) {
        if (song.coverPath && song.album) {
            const key = albumKey(song.artist, song.album);
            if (!metadataAlbumArt.has(key)) metadataAlbumArt.set(key, song.coverPath);
        }
    }

    function forSong(song: Song): string | null {
        const albumArt = song.album
            ? findCover(
                covers,
                `album-art:${encodeURIComponent(song.artist ?? "")}:${encodeURIComponent(song.album)}`,
            )
            : undefined;
        const artistArt = song.artist
            ? findCover(covers, `artist-art:${encodeURIComponent(song.artist)}`)
            : undefined;

        return song.coverPath ??
            metadataAlbumArt.get(albumKey(song.artist, song.album)) ??
            albumArt ??
            artistArt ??
            rootArt ??
            null;
    }

    function forAlbum(artist: string, album: string): string | null {
        const albumArt = findCover(
            covers,
            `album-art:${encodeURIComponent(artist)}:${encodeURIComponent(album)}`,
        );
        const artistArt = findCover(covers, `artist-art:${encodeURIComponent(artist)}`);

        return metadataAlbumArt.get(albumKey(artist, album)) ??
            albumArt ??
            artistArt ??
            rootArt ??
            null;
    }

    function forArtist(
        artist: string,
        albums: Array<{ id: string; art?: string | null }>,
    ): string | null {
        const artistArt = findCover(covers, `artist-art:${encodeURIComponent(artist)}`);
        const albumArt = albums.find((album) =>
            album.id.startsWith("album:") &&
            !album.id.endsWith(":singles") &&
            album.art &&
            album.art !== rootArt,
        )?.art;

        return artistArt ?? albumArt ?? rootArt ?? null;
    }

    return { forSong, forAlbum, forArtist };
}
