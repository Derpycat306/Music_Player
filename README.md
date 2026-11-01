# Music Player

A desktop music player for playing locally owned songs, built with **React, TypeScript, JavaScript, CSS, HTML, and Electron**.

## Features

* **Local music library** — Select a local music folder and automatically discover supported audio files.
* **Artist and album browsing** — Displays music by its folder structure and metadata.
* **Album artwork** — Applies album or generic artwork from folders to songs in scope.
* **Library navigation** — Browse and filter music by their artist, album, or song name.
* **Playback controls** — Play, pause, seek, skip, and control volume.
* **Customization** — Save your favorite songs for quick access, and create custom playlists.
* **Library updates** — Automatically handles folder changes and additions while running.
* **Automatic updates** — Check for and install new application releases.

# Setup

For best usage, the local music files should be organized in the following format to avoid metadata inconsistencies:

Main_Folder/\
&emsp;  Artist_Name/\
&emsp;&emsp;    Album_Name/\
&emsp;&emsp;&emsp;      Song_Files

Songs placed outside in the main or artist folders will instead take from metadata, or simply display without an album or artist if none exists.\
Cover art is also applied to all songs in the same folder, and to any subfolders that have no art.

Then, select the main folder within settings as the root folder and everything is good to go!
