// ==UserScript==
// @name         AMQ Fav Songs
// @namespace    https://github.com/Mxyuki/AMQ-Scripts
// @version      2.0.0
// @description  Total remak of previous AMQ Fav Songs, now allow to makes playlists, to see video or not
// @description  Since it is totally new some issue might appear so just tell me on discord
// @author       Mxyuki
// @match        https://*.animemusicquiz.com/*
// @icon         https://i.imgur.com/syptORo.png
// @require      https://github.com/joske2865/AMQ-Scripts/raw/master/common/amqScriptInfo.js
// @downloadURL  https://github.com/Mxyuki/AMQ-Scripts/raw/main/amqFavoriteSongs.user.js
// @updateURL    https://github.com/Mxyuki/AMQ-Scripts/raw/main/amqFavoriteSongs.user.js
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(function () {
    'use strict';

    /* =========================================================================================
     *  CONFIG — edit ACCENT freely, or override --pm-accent with Stylus (see :root block below)
     * ========================================================================================= */
    const ACCENT = '#3ea8ff';

    const DOMAINS = ['eudist', 'naedist', 'nawdist'];

    const STORAGE_KEYS = {
        PLAYLISTS: 'pm_playlists_v1',
        SETTINGS: 'pm_settings_v1',
    };

    const LIKED_ID = 'liked_songs_system';

    /* =========================================================================================
     *  STORAGE
     * ========================================================================================= */
    function storageGet(key, def) {
        let raw = null;
        try {
            if (typeof GM_getValue === 'function') raw = GM_getValue(key, null);
            else raw = localStorage.getItem(key);
        } catch (e) { raw = null; }
        if (!raw) return def;
        try { return JSON.parse(raw); } catch (e) { return def; }
    }
    function storageSet(key, val) {
        const raw = JSON.stringify(val);
        try {
            if (typeof GM_setValue === 'function') GM_setValue(key, raw);
            else localStorage.setItem(key, raw);
        } catch (e) { /* ignore */ }
    }

    let playlists = storageGet(STORAGE_KEYS.PLAYLISTS, null);
    if (!playlists) {
        playlists = [
            { id: LIKED_ID, name: 'Liked Songs', system: true, createdAt: Date.now(), songs: [] },
        ];
        storageSet(STORAGE_KEYS.PLAYLISTS, playlists);
    }

    let settings = Object.assign({
        domain: 'eudist',
        volume: 0.5,
        quality: '720',
        order: 'inOrder',
        loop: false,
    }, storageGet(STORAGE_KEYS.SETTINGS, {}));

    function savePlaylists() {
        storageSet(STORAGE_KEYS.PLAYLISTS, playlists);
        document.dispatchEvent(new CustomEvent('pm:playlistsChanged'));
    }
    function saveSettings() {
        storageSet(STORAGE_KEYS.SETTINGS, settings);
    }

    function getPlaylist(id) { return playlists.find(p => p.id === id); }
    function findSongInPlaylist(playlist, annSongId) {
        return playlist.songs.find(s => s.annSongId === annSongId);
    }
    function findPlaylistsContaining(annSongId) {
        return playlists.filter(p => findSongInPlaylist(p, annSongId));
    }
    function uid() { return 'p_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

    function createPlaylist(name) {
        const pl = { id: uid(), name: name || 'New Playlist', system: false, createdAt: Date.now(), songs: [] };
        playlists.push(pl);
        savePlaylists();
        return pl;
    }
    function deletePlaylist(id) {
        const pl = getPlaylist(id);
        if (!pl || pl.system) return;
        playlists = playlists.filter(p => p.id !== id);
        savePlaylists();
    }
    function renamePlaylist(id, name) {
        const pl = getPlaylist(id);
        if (!pl) return;
        pl.name = name;
        savePlaylists();
    }
    function addSongToPlaylist(playlistId, song) {
        const pl = getPlaylist(playlistId);
        if (!pl) return;
        const existing = findSongInPlaylist(pl, song.annSongId);
        if (existing) {
            Object.assign(existing, song, { addedAt: existing.addedAt });
        } else {
            pl.songs.push(Object.assign({}, song));
        }
        savePlaylists();
    }
    function removeSongFromPlaylist(playlistId, annSongId) {
        const pl = getPlaylist(playlistId);
        if (!pl) return;
        pl.songs = pl.songs.filter(s => s.annSongId !== annSongId);
        savePlaylists();
    }
    function updateSongEverywhere(song) {
        let changed = false;
        playlists.forEach(pl => {
            const existing = findSongInPlaylist(pl, song.annSongId);
            if (existing) {
                Object.assign(existing, song, { addedAt: existing.addedAt });
                changed = true;
            }
        });
        if (changed) savePlaylists();
    }

    /* =========================================================================================
     *  SONG EXTRACTION FROM PAYLOAD
     * ========================================================================================= */
    function typeLabel(song) {
        if (song.type === 1) return 'OP' + (song.typeNumber ? ' ' + song.typeNumber : '');
        if (song.type === 2) return 'ED' + (song.typeNumber ? ' ' + song.typeNumber : '');
        return 'INS';
    }

    function extractSong(songInfo) {
        const romaji = (songInfo.animeNames && songInfo.animeNames.romaji) || '';
        const english = (songInfo.animeNames && songInfo.animeNames.english) || '';
        const altAnimeNames = (songInfo.altAnimeNames || []).filter(n => n && n !== romaji && n !== english);

        const videoMap = {};
        const vtm = songInfo.videoTargetMap || {};
        Object.keys(vtm).forEach(cdn => {
            const group = vtm[cdn] || {};
            Object.keys(group).forEach(q => {
                if (!videoMap[q]) videoMap[q] = group[q];
            });
        });

        return {
            annSongId: songInfo.annSongId,
            annId: songInfo.annId,
            songName: songInfo.songName,
            artist: songInfo.artist,
            animeRomaji: romaji,
            animeEnglish: english,
            altAnimeNames,
            type: songInfo.type,
            typeNumber: songInfo.typeNumber,
            videoMap,
            addedAt: Date.now(),
        };
    }

    function parseExternalSongType(str) {
        if (!str) return { type: 3, typeNumber: 0 };
        const s = String(str).toLowerCase().trim();
        if (s.startsWith('opening')) {
            const n = parseInt(s.replace('opening', '').trim(), 10);
            return { type: 1, typeNumber: isNaN(n) ? 1 : n };
        }
        if (s.startsWith('ending')) {
            const n = parseInt(s.replace('ending', '').trim(), 10);
            return { type: 2, typeNumber: isNaN(n) ? 1 : n };
        }
        return { type: 3, typeNumber: 0 };
    }

    function convertExternalSong(item) {
        const romaji = item.animeJPName || '';
        const english = item.animeENName || '';
        const altAnimeNames = (item.animeAltName || []).filter(n => n && n !== romaji && n !== english);
        const { type, typeNumber } = parseExternalSongType(item.songType);
        const videoMap = {};
        if (item.HQ) videoMap['720'] = item.HQ;
        if (item.MQ) videoMap['480'] = item.MQ;
        if (item.audio) videoMap['0'] = item.audio;
        let artist = item.songArtist || '';
        if (!artist && Array.isArray(item.artists) && item.artists.length) {
            artist = item.artists.map(a => (a.names && a.names[0]) || '').filter(Boolean).join(', ');
        }
        return {
            annSongId: item.annSongId,
            annId: item.annId,
            songName: item.songName || '',
            artist,
            animeRomaji: romaji,
            animeEnglish: english,
            altAnimeNames,
            type,
            typeNumber,
            videoMap,
            addedAt: Date.now(),
        };
    }
    
    function normalizeImportedSong(item) {
        if (!item || typeof item !== 'object') return null;
        if (item.videoMap && typeof item.videoMap === 'object') return item;
        if ('HQ' in item || 'MQ' in item || 'audio' in item) return convertExternalSong(item);
        return null;
    }

    function sanitizeFilename(name) {
        const cleaned = String(name || 'playlist').replace(/[\\/:*?"<>|]/g, '_').trim();
        return cleaned || 'playlist';
    }
    const css = `
    :root {
        --pm-accent: ${ACCENT};
        --pm-bg: #14161a;
        --pm-bg2: #1c1f24;
        --pm-bg3: #262a31;
        --pm-bg4: #2f343c;
        --pm-text: #e8eaed;
        --pm-text-dim: #9aa0a8;
        --pm-border: #33383f;
        --pm-danger: #e05263;
    }
    #pmMenuOpen.clickAble:hover { color: var(--pm-accent); }

    #pmWindow {
        display: none;
        position: fixed;
        top: 5%;
        left: 50%;
        transform: translateX(-50%);
        width: 900px;
        max-width: 95vw;
        height: 85vh;
        background: var(--pm-bg);
        border: 1px solid var(--pm-border);
        border-radius: 8px;
        z-index: 100000;
        color: var(--pm-text);
        font-family: inherit;
        box-shadow: 0 10px 40px rgba(0,0,0,0.6);
        flex-direction: column;
    }
    #pmWindow.pm-open { display: flex; }
    #pmOverlay {
        display: none;
        position: fixed; inset: 0;
        background: rgba(0,0,0,0.55);
        z-index: 99999;
    }
    #pmOverlay.pm-open { display: block; }

    .pm-header {
        display: flex; align-items: center; justify-content: space-between;
        padding: 10px 16px; border-bottom: 1px solid var(--pm-border);
        background: var(--pm-bg2); border-radius: 8px 8px 0 0;
    }
    .pm-header h3 { margin: 0; font-size: 16px; color: var(--pm-accent); }
    .pm-close { cursor: pointer; font-size: 20px; color: var(--pm-text-dim); line-height: 1; padding: 2px 8px; }
    .pm-close:hover { color: var(--pm-text); }

    .pm-body { flex: 1; overflow: hidden; display: flex; flex-direction: column; }

    /* ---- Player ---- */
    .pm-player { padding: 12px 16px; border-bottom: 1px solid var(--pm-border); background: var(--pm-bg2); }
    .pm-video-wrap { position: relative; width: 100%; max-height: 220px; background: #000; border-radius: 6px; overflow: hidden; margin-bottom: 8px; display: flex; align-items: center; justify-content: center; }
    .pm-video-wrap video { width: 100%; max-height: 220px; display: block; }
    .pm-audio-placeholder {
        position: absolute; inset: 0; display: none; flex-direction: column; align-items: center; justify-content: center;
        background: linear-gradient(135deg, var(--pm-bg3), var(--pm-bg4)); text-align: center; padding: 10px;
    }
    .pm-video-wrap.pm-audio-mode .pm-audio-placeholder { display: flex; }
    .pm-audio-placeholder .pm-note-icon { font-size: 36px; color: var(--pm-accent); margin-bottom: 6px; }

    .pm-titles { text-align: center; margin-bottom: 8px; }
    .pm-anime-romaji { font-size: 15px; font-weight: 600; position: relative; display: inline-block; }
    .pm-anime-english { font-size: 11px; color: var(--pm-text-dim); margin-left: 6px; }
    .pm-alt-badge { font-size: 10px; color: var(--pm-accent); border: 1px solid var(--pm-accent); border-radius: 3px; padding: 0 4px; margin-left: 6px; cursor: default; position: relative; }
    .pm-alt-badge:hover .pm-alt-tooltip { display: block; }
    .pm-alt-tooltip {
        display: none; position: absolute; top: 130%; left: 50%; transform: translateX(-50%);
        background: var(--pm-bg4); border: 1px solid var(--pm-border); border-radius: 4px; padding: 6px 10px;
        font-size: 11px; color: var(--pm-text); white-space: nowrap; z-index: 5; text-align: left;
    }
    .pm-song-name { font-size: 17px; font-weight: 700; margin-top: 2px; }
    .pm-artist { font-size: 13px; color: var(--pm-text-dim); }
    .pm-anime-type-line { font-size: 12px; color: var(--pm-text-dim); margin-top: 2px; }

    .pm-progress-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
    .pm-time { font-size: 11px; color: var(--pm-text-dim); min-width: 38px; text-align: center; }
    .pm-seek { flex: 1; }

    input[type=range] { -webkit-appearance: none; height: 5px; background: var(--pm-bg4); border-radius: 3px; outline: none; }
    input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 13px; height: 13px; border-radius: 50%; background: var(--pm-accent); cursor: pointer; }
    input[type=range]::-moz-range-thumb { width: 13px; height: 13px; border-radius: 50%; background: var(--pm-accent); border: none; cursor: pointer; }

    .pm-controls-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .pm-btn {
        background: var(--pm-bg3); border: 1px solid var(--pm-border); color: var(--pm-text);
        border-radius: 5px; padding: 5px 10px; font-size: 12px; cursor: pointer; user-select: none;
    }
    .pm-btn:hover { border-color: var(--pm-accent); color: var(--pm-accent); }
    .pm-btn.pm-active { background: var(--pm-accent); border-color: var(--pm-accent); color: #08131c; font-weight: 600; }
    .pm-btn.pm-danger:hover { border-color: var(--pm-danger); color: var(--pm-danger); }
    .pm-icon-btn { font-size: 15px; padding: 5px 9px; }

    .pm-vol-wrap { display: flex; align-items: center; gap: 5px; }
    .pm-vol-wrap input[type=range] { width: 80px; }

    .pm-quality-row { display: flex; gap: 6px; margin-left: auto; }
    .pm-order-select, .pm-domain-select {
        background: var(--pm-bg3); color: var(--pm-text); border: 1px solid var(--pm-border);
        border-radius: 5px; padding: 5px 8px; font-size: 12px;
    }

    .pm-history-panel {
        margin-top: 10px; max-height: 130px; overflow-y: auto; background: var(--pm-bg3);
        border: 1px solid var(--pm-border); border-radius: 5px; padding: 4px;
    }
    .pm-history-row { padding: 5px 8px; font-size: 12px; border-radius: 4px; cursor: pointer; color: var(--pm-text-dim); }
    .pm-history-row:hover { background: var(--pm-bg4); color: var(--pm-text); }
    .pm-history-row.pm-history-current { color: var(--pm-accent); font-weight: 600; background: var(--pm-bg4); }

    /* ---- Browser ---- */
    .pm-browser { flex: 1; overflow: hidden; display: flex; }
    .pm-sidebar { width: 210px; border-right: 1px solid var(--pm-border); background: var(--pm-bg2); display: flex; flex-direction: column; }
    .pm-sidebar-actions { display: flex; gap: 4px; padding: 8px; border-bottom: 1px solid var(--pm-border); }
    .pm-sidebar-actions .pm-btn { flex: 1; font-size: 11px; padding: 5px 4px; }
    .pm-playlist-list { flex: 1; overflow-y: auto; }
    .pm-playlist-item {
        padding: 9px 12px; cursor: pointer; border-bottom: 1px solid var(--pm-border);
        display: flex; justify-content: space-between; align-items: center; font-size: 13px;
    }
    .pm-playlist-item:hover { background: var(--pm-bg3); }
    .pm-playlist-item.pm-selected { background: var(--pm-bg3); border-left: 3px solid var(--pm-accent); }
    .pm-playlist-item.pm-playing-marker .pm-pl-play { color: var(--pm-accent); }
    .pm-pl-play { color: var(--pm-text-dim); font-size: 12px; padding: 0 6px 0 0; cursor: pointer; }
    .pm-pl-play:hover { color: var(--pm-accent); }
    .pm-pl-count { font-size: 11px; color: var(--pm-text-dim); }
    .pm-pl-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-right: 6px; }
    .pm-pl-del { color: var(--pm-text-dim); font-size: 13px; padding: 0 4px; }
    .pm-pl-del:hover { color: var(--pm-danger); }

    .pm-main-list { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
    .pm-list-header { padding: 8px 12px; border-bottom: 1px solid var(--pm-border); display: flex; gap: 8px; align-items: center; }
    .pm-search { flex: 1; background: var(--pm-bg3); border: 1px solid var(--pm-border); color: var(--pm-text); border-radius: 5px; padding: 6px 10px; font-size: 12px; }
    .pm-list-title { font-size: 13px; font-weight: 600; color: var(--pm-accent); padding: 8px 12px 0; }

    .pm-songs { flex: 1; overflow-y: auto; padding: 4px 6px; }
    .pm-song-row {
        display: flex; align-items: center; gap: 8px; padding: 7px 8px; border-radius: 5px; font-size: 12px;
        border-bottom: 1px solid rgba(255,255,255,0.03);
    }
    .pm-song-row:hover { background: var(--pm-bg2); }
    .pm-song-play { cursor: pointer; color: var(--pm-accent); font-size: 15px; width: 18px; text-align: center; }
    .pm-song-meta { flex: 1; min-width: 0; }
    .pm-song-title-line { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .pm-song-sub-line { color: var(--pm-text-dim); font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .pm-song-qualities { display: flex; gap: 4px; font-size: 10px; }
    .pm-q-tag { border: 1px solid var(--pm-border); border-radius: 3px; padding: 1px 5px; cursor: pointer; color: var(--pm-text-dim); text-decoration: none; display: inline-block; }
    .pm-q-tag:visited { color: var(--pm-text-dim); }
    .pm-q-tag:hover, .pm-q-tag:visited:hover { color: var(--pm-accent); border-color: var(--pm-accent); }
    .pm-q-tag.pm-disabled { opacity: 0.25; pointer-events: none; }
    .pm-q-tag.pm-active, .pm-q-tag.pm-active:visited { background: var(--pm-accent); border-color: var(--pm-accent); color: #08131c; font-weight: 600; }
    .pm-song-id { font-size: 10px; color: var(--pm-text-dim); width: 60px; text-align: right; }
    .pm-song-actions { display: flex; gap: 4px; align-items: center; }
    .pm-song-actions select { background: var(--pm-bg3); color: var(--pm-text); border: 1px solid var(--pm-border); border-radius: 4px; font-size: 10px; padding: 2px; }
    .pm-song-remove { cursor: pointer; color: var(--pm-text-dim); font-size: 13px; padding: 0 4px; }
    .pm-song-remove:hover { color: var(--pm-danger); }
    .pm-empty-hint { color: var(--pm-text-dim); font-size: 12px; padding: 20px; text-align: center; }

    /* ---- Song info row buttons (in-quiz) ---- */
    #pmLikeBtn, #pmAddBtn { cursor: pointer; margin-left: 10px; font-size: 15px; display: inline-block; position: relative; color: var(--pm-text-dim); }
    #pmLikeBtn:hover, #pmAddBtn:hover { color: var(--pm-accent); }
    #pmLikeBtn.pm-liked { color: var(--pm-danger); }
    #pmAddBtn.pm-in-playlist { color: var(--pm-accent); }

    .pm-popover {
        position: absolute; z-index: 100001; background: var(--pm-bg2); border: 1px solid var(--pm-border);
        border-radius: 6px; padding: 8px; min-width: 200px; box-shadow: 0 6px 20px rgba(0,0,0,0.5);
        color: var(--pm-text); font-size: 12px;
    }
    .pm-popover-item { display: flex; align-items: center; gap: 6px; padding: 4px 4px; cursor: pointer; border-radius: 4px; }
    .pm-popover-item:hover { background: var(--pm-bg3); }
    .pm-popover-new { display: flex; gap: 4px; margin-top: 6px; border-top: 1px solid var(--pm-border); padding-top: 6px; }
    .pm-popover-new input { flex: 1; background: var(--pm-bg3); border: 1px solid var(--pm-border); color: var(--pm-text); border-radius: 4px; padding: 4px 6px; font-size: 11px; }

    /* ---- Confirm dialog / toast ---- */
    .pm-confirm-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 100002; display: flex; align-items: center; justify-content: center; }
    .pm-confirm-box { background: var(--pm-bg2); border: 1px solid var(--pm-border); border-radius: 8px; padding: 18px; width: 320px; color: var(--pm-text); }
    .pm-confirm-box p { font-size: 13px; margin: 0 0 14px; }
    .pm-confirm-actions { display: flex; justify-content: flex-end; gap: 8px; }

    .pm-toast {
        position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
        background: var(--pm-bg3); border: 1px solid var(--pm-accent); color: var(--pm-text);
        padding: 8px 16px; border-radius: 6px; font-size: 12px; z-index: 100003; opacity: 0; transition: opacity 0.25s;
    }
    .pm-toast.pm-error { border-color: var(--pm-danger); }
    .pm-toast.pm-show { opacity: 1; }
    `;
    const styleTag = document.createElement('style');
    styleTag.textContent = css;
    document.head.appendChild(styleTag);

    /* =========================================================================================
     *  SMALL DOM HELPERS
     * ========================================================================================= */
    function ce(tag, attrs, html) {
        const e = document.createElement(tag);
        if (attrs) Object.keys(attrs).forEach(k => {
            if (k === 'class') e.className = attrs[k];
            else if (k === 'style') e.setAttribute('style', attrs[k]);
            else e.setAttribute(k, attrs[k]);
        });
        if (html !== undefined) e.innerHTML = html;
        return e;
    }
    function fmtTime(sec) {
        if (!isFinite(sec) || sec < 0) sec = 0;
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return m + ':' + (s < 10 ? '0' : '') + s;
    }
    function showToast(msg, isError) {
        const t = ce('div', { class: 'pm-toast' + (isError ? ' pm-error' : '') }, msg);
        document.body.appendChild(t);
        requestAnimationFrame(() => t.classList.add('pm-show'));
        setTimeout(() => {
            t.classList.remove('pm-show');
            setTimeout(() => t.remove(), 300);
        }, 2600);
    }
    function confirmDialog(message, onConfirm) {
        const overlay = ce('div', { class: 'pm-confirm-overlay' });
        const box = ce('div', { class: 'pm-confirm-box' });
        box.appendChild(ce('p', {}, message));
        const actions = ce('div', { class: 'pm-confirm-actions' });
        const cancelBtn = ce('div', { class: 'pm-btn' }, 'Cancel');
        const okBtn = ce('div', { class: 'pm-btn pm-danger' }, 'Delete');
        actions.appendChild(cancelBtn);
        actions.appendChild(okBtn);
        box.appendChild(actions);
        overlay.appendChild(box);
        document.body.appendChild(overlay);
        cancelBtn.addEventListener('click', () => overlay.remove());
        overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
        okBtn.addEventListener('click', () => { overlay.remove(); onConfirm(); });
    }
    function closeAnyPopover() {
        document.querySelectorAll('.pm-popover').forEach(p => p.remove());
        document.querySelectorAll('.pm-popover-modal').forEach(p => p.remove());
    }

    /* =========================================================================================
     *  PLAYER ENGINE
     * ========================================================================================= */
    const playerState = {
        activePlaylistId: null,
        currentSongIndex: -1,
        currentSong: null,
        currentQuality: settings.quality,
        semiRandomPlayed: new Set(),
        loadTimer: null,
        historyMap: {}, // playlistId -> { entries: [{song, index}], pointer: -1 }
    };

    function getHistoryBucket(playlistId) {
        if (!playerState.historyMap[playlistId]) playerState.historyMap[playlistId] = { entries: [], pointer: -1 };
        return playerState.historyMap[playlistId];
    }

    let videoEl, audioPlaceholderEl, seekEl, curTimeEl, durTimeEl, playPauseBtn, loopBtn, volumeEl, historyPanelEl;
    let romajiEl, englishEl, altBadgeEl, songNameEl, artistEl, animeTypeLineEl, qualityRowEl, domainSelectEl, orderSelectEl, playingMarkerRefreshFn;

    function qualityChain(preferred) {
        const chains = { '720': ['720', '480', '0'], '480': ['480', '720', '0'], '0': ['0', '480', '720'] };
        return chains[preferred] || chains['720'];
    }
    function buildUrl(domain, filename) {
        return 'https://' + domain + '.animemusicquiz.com/' + filename;
    }

    function attemptChain(song, chain, idx, resumeTime, autoplay) {
        clearTimeout(playerState.loadTimer);
        if (idx >= chain.length) {
            showToast('Could not load "' + song.songName + '"', true);
            goForwardOrNext();
            return;
        }
        const quality = chain[idx];
        const url = buildUrl(settings.domain, song.videoMap[quality]);
        let done = false;
        const cleanup = () => {
            videoEl.removeEventListener('loadedmetadata', onReady);
            videoEl.removeEventListener('error', onError);
            clearTimeout(playerState.loadTimer);
        };
        const onReady = () => {
            if (done) return;
            done = true;
            cleanup();
            if (resumeTime) { try { videoEl.currentTime = resumeTime; } catch (e) {} }
            playerState.currentQuality = quality;
            settings.quality = quality;
            saveSettings();
            updateQualityButtonsUI();
            updateAudioVideoVisual(quality);
            if (autoplay) videoEl.play().catch(() => {});
        };
        const onError = () => {
            if (done) return;
            done = true;
            cleanup();
            attemptChain(song, chain, idx + 1, resumeTime, autoplay);
        };
        videoEl.addEventListener('loadedmetadata', onReady, { once: true });
        videoEl.addEventListener('error', onError, { once: true });
        playerState.loadTimer = setTimeout(onError, 6000);
        videoEl.src = url;
        videoEl.load();
    }

    function loadSongWithFallback(song, preferredQuality, resumeTime, autoplay) {
        const chain = qualityChain(preferredQuality).filter(q => song.videoMap[q]);
        if (chain.length === 0) {
            showToast('No playable source for "' + song.songName + '"', true);
            goForwardOrNext();
            return;
        }
        attemptChain(song, chain, 0, resumeTime || 0, autoplay !== false);
    }

    function updateAudioVideoVisual(quality) {
        const wrap = document.getElementById('pmVideoWrap');
        if (!wrap) return;
        if (quality === '0') wrap.classList.add('pm-audio-mode');
        else wrap.classList.remove('pm-audio-mode');
    }

    function updateQualityButtonsUI() {
        if (!qualityRowEl || !playerState.currentSong) return;
        qualityRowEl.querySelectorAll('.pm-q-tag').forEach(tag => {
            const q = tag.dataset.q;
            const has = !!playerState.currentSong.videoMap[q];
            tag.classList.toggle('pm-disabled', !has);
            tag.classList.toggle('pm-active', playerState.currentQuality === q);
        });
    }

    function updateNowPlayingUI(song) {
        const altList = song.altAnimeNames || [];
        romajiEl.textContent = song.animeRomaji || '(unknown anime)';
        englishEl.textContent = song.animeEnglish && song.animeEnglish !== song.animeRomaji ? song.animeEnglish : '';
        if (altList.length) {
            altBadgeEl.style.display = 'inline-block';
            altBadgeEl.querySelector('.pm-alt-tooltip').innerHTML = altList.map(n => escapeHtml(n)).join('<br>');
        } else {
            altBadgeEl.style.display = 'none';
        }
        songNameEl.textContent = song.songName;
        artistEl.textContent = song.artist;
        animeTypeLineEl.textContent = (song.animeEnglish || song.animeRomaji || '') + ' • ' + typeLabel(song);
        updateQualityButtonsUI();
        refreshPlaylistPlayingMarker();
    }

    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    function playSong(song, playlistId, index, quality) {
        playerState.currentSong = song;
        playerState.activePlaylistId = playlistId;
        playerState.currentSongIndex = index;
        pushHistoryEntry(playlistId, song, index);
        updateNowPlayingUI(song);
        if (settings.order === 'semiRandom') playerState.semiRandomPlayed.add(song.annId);
        loadSongWithFallback(song, quality || playerState.currentQuality || settings.quality || '720', 0, true);
        renderHistoryPanel();
    }

    function pushHistoryEntry(playlistId, song, index) {
        const bucket = getHistoryBucket(playlistId);
        bucket.entries = bucket.entries.slice(0, bucket.pointer + 1);
        bucket.entries.push({ song, index });
        bucket.pointer = bucket.entries.length - 1;
    }

    function jumpToHistoryEntry(playlistId, pointer) {
        const bucket = getHistoryBucket(playlistId);
        const entry = bucket.entries[pointer];
        if (!entry) return;
        bucket.pointer = pointer;
        playerState.currentSong = entry.song;
        playerState.activePlaylistId = playlistId;
        playerState.currentSongIndex = entry.index;
        updateNowPlayingUI(entry.song);
        loadSongWithFallback(entry.song, playerState.currentQuality || settings.quality || '720', 0, true);
        renderHistoryPanel();
    }

    function goBack() {
        if (!playerState.activePlaylistId) return;
        const bucket = getHistoryBucket(playerState.activePlaylistId);
        if (bucket.pointer <= 0) {
            if (playerState.currentSong) { videoEl.currentTime = 0; videoEl.play().catch(() => {}); }
            return;
        }
        jumpToHistoryEntry(playerState.activePlaylistId, bucket.pointer - 1);
    }

    function goForwardOrNext() {
        if (!playerState.activePlaylistId) return;
        const bucket = getHistoryBucket(playerState.activePlaylistId);
        if (bucket.pointer < bucket.entries.length - 1) {
            jumpToHistoryEntry(playerState.activePlaylistId, bucket.pointer + 1);
        } else {
            computeFreshNext();
        }
    }

    function setActivePlaylist(playlistId, startIndex) {
        if (playerState.activePlaylistId !== playlistId) {
            playerState.semiRandomPlayed.clear();
        }
        const pl = getPlaylist(playlistId);
        if (!pl || !pl.songs.length) return;
        let idx = startIndex;
        if (idx === undefined) {
            if (settings.order === 'random') idx = Math.floor(Math.random() * pl.songs.length);
            else if (settings.order === 'semiRandom') idx = pickSemiRandomIndex(pl);
            else idx = 0;
        }
        playSong(pl.songs[idx], playlistId, idx);
    }

    function pickSemiRandomIndex(pl) {
        let candidates = pl.songs.map((s, i) => i).filter(i => !playerState.semiRandomPlayed.has(pl.songs[i].annId));
        if (candidates.length === 0) {
            playerState.semiRandomPlayed.clear();
            candidates = pl.songs.map((s, i) => i);
        }
        return candidates[Math.floor(Math.random() * candidates.length)];
    }

    function computeFreshNext() {
        const pl = getPlaylist(playerState.activePlaylistId);
        if (!pl || !pl.songs.length) return;
        let nextIdx;
        if (settings.order === 'random') {
            if (pl.songs.length === 1) nextIdx = 0;
            else {
                do { nextIdx = Math.floor(Math.random() * pl.songs.length); }
                while (pl.songs[nextIdx].annSongId === (playerState.currentSong && playerState.currentSong.annSongId));
            }
        } else if (settings.order === 'semiRandom') {
            nextIdx = pickSemiRandomIndex(pl);
        } else {
            nextIdx = (playerState.currentSongIndex + 1) % pl.songs.length;
        }
        playSong(pl.songs[nextIdx], pl.id, nextIdx);
    }

    function renderHistoryPanel() {
        if (!historyPanelEl || historyPanelEl.style.display === 'none') return;
        historyPanelEl.innerHTML = '';
        if (!playerState.activePlaylistId) {
            historyPanelEl.appendChild(ce('div', { class: 'pm-empty-hint' }, 'Nothing playing yet.'));
            return;
        }
        const bucket = getHistoryBucket(playerState.activePlaylistId);
        if (!bucket.entries.length) {
            historyPanelEl.appendChild(ce('div', { class: 'pm-empty-hint' }, 'No history yet.'));
            return;
        }
        bucket.entries.forEach((entry, idx) => {
            const row = ce('div', { class: 'pm-history-row' + (idx === bucket.pointer ? ' pm-history-current' : '') },
                escapeHtml(entry.song.songName) + ' — ' + escapeHtml(entry.song.artist));
            row.addEventListener('click', () => jumpToHistoryEntry(playerState.activePlaylistId, idx));
            historyPanelEl.appendChild(row);
        });
        historyPanelEl.scrollTop = historyPanelEl.scrollHeight;
    }

    function switchDomain(newDomain) {
        settings.domain = newDomain;
        saveSettings();
        if (playerState.currentSong) {
            const resume = videoEl.currentTime;
            const wasPlaying = !videoEl.paused;
            loadSongWithFallback(playerState.currentSong, playerState.currentQuality, resume, wasPlaying);
        }
    }
    function switchQuality(quality) {
        if (!playerState.currentSong || !playerState.currentSong.videoMap[quality]) return;
        const resume = videoEl.currentTime;
        const wasPlaying = !videoEl.paused;
        loadSongWithFallback(playerState.currentSong, quality, resume, wasPlaying);
    }

    /* =========================================================================================
     *  MAIN WINDOW BUILD
     * ========================================================================================= */
    let selectedBrowserPlaylistId = LIKED_ID;
    let searchQuery = '';

    function buildPlayerSection() {
        const wrap = ce('div', { class: 'pm-player' });

        const videoWrap = ce('div', { class: 'pm-video-wrap', id: 'pmVideoWrap' });
        videoEl = ce('video', { preload: 'metadata' });
        audioPlaceholderEl = ce('div', { class: 'pm-audio-placeholder' },
            '<div class="pm-note-icon"><i class="fa fa-music" aria-hidden="true"></i></div><div>Audio only</div>');
        videoWrap.appendChild(videoEl);
        videoWrap.appendChild(audioPlaceholderEl);
        wrap.appendChild(videoWrap);

        const titles = ce('div', { class: 'pm-titles' });
        romajiEl = ce('span', { class: 'pm-anime-romaji' }, 'No song loaded');
        englishEl = ce('span', { class: 'pm-anime-english' }, '');
        altBadgeEl = ce('span', { class: 'pm-alt-badge', style: 'display:none' }, '+alt<div class="pm-alt-tooltip"></div>');
        titles.appendChild(romajiEl);
        titles.appendChild(englishEl);
        titles.appendChild(altBadgeEl);
        songNameEl = ce('div', { class: 'pm-song-name' }, '—');
        artistEl = ce('div', { class: 'pm-artist' }, '');
        animeTypeLineEl = ce('div', { class: 'pm-anime-type-line' }, '');
        wrap.appendChild(titles);
        wrap.appendChild(songNameEl);
        wrap.appendChild(artistEl);
        wrap.appendChild(animeTypeLineEl);

        const progressRow = ce('div', { class: 'pm-progress-row' });
        curTimeEl = ce('div', { class: 'pm-time' }, '0:00');
        seekEl = ce('input', { type: 'range', class: 'pm-seek', min: '0', max: '1000', value: '0' });
        durTimeEl = ce('div', { class: 'pm-time' }, '0:00');
        progressRow.appendChild(curTimeEl);
        progressRow.appendChild(seekEl);
        progressRow.appendChild(durTimeEl);
        wrap.appendChild(progressRow);

        const controls = ce('div', { class: 'pm-controls-row' });
        playPauseBtn = ce('div', { class: 'pm-btn pm-icon-btn' }, '<i class="fa fa-play" aria-hidden="true"></i>');
        loopBtn = ce('div', { class: 'pm-btn pm-icon-btn', title: 'Loop this song' }, '<i class="fa fa-repeat" aria-hidden="true"></i>');
        const historyBtn = ce('div', { class: 'pm-btn pm-icon-btn', title: 'Song history for this playlist' }, '<i class="fa fa-history" aria-hidden="true"></i>');
        const prevBtn = ce('div', { class: 'pm-btn pm-icon-btn', title: 'Previous song' }, '<i class="fa fa-step-backward" aria-hidden="true"></i>');
        const nextBtn = ce('div', { class: 'pm-btn pm-icon-btn', title: 'Next song' }, '<i class="fa fa-step-forward" aria-hidden="true"></i>');

        const volWrap = ce('div', { class: 'pm-vol-wrap' });
        volWrap.appendChild(ce('span', {}, '<i class="fa fa-volume-up" aria-hidden="true"></i>'));
        volumeEl = ce('input', { type: 'range', min: '0', max: '1', step: '0.01', value: String(settings.volume) });
        volWrap.appendChild(volumeEl);

        orderSelectEl = ce('select', { class: 'pm-order-select' },
            '<option value="inOrder">In Order</option><option value="random">Random</option><option value="semiRandom">Semi-Random</option>');
        orderSelectEl.value = settings.order;

        domainSelectEl = ce('select', { class: 'pm-domain-select' },
            DOMAINS.map(d => '<option value="' + d + '">' + d + '</option>').join(''));
        domainSelectEl.value = settings.domain;

        qualityRowEl = ce('div', { class: 'pm-quality-row' });
        ['0', '480', '720'].forEach(q => {
            const label = q === '0' ? 'Audio' : (q === '480' ? 'MQ' : 'HQ');
            const tag = ce('div', { class: 'pm-q-tag pm-disabled', 'data-q': q }, label);
            tag.addEventListener('click', () => switchQuality(q));
            qualityRowEl.appendChild(tag);
        });

        controls.appendChild(prevBtn);
        controls.appendChild(playPauseBtn);
        controls.appendChild(nextBtn);
        controls.appendChild(loopBtn);
        controls.appendChild(historyBtn);
        controls.appendChild(volWrap);
        controls.appendChild(orderSelectEl);
        controls.appendChild(domainSelectEl);
        controls.appendChild(qualityRowEl);
        wrap.appendChild(controls);

        historyPanelEl = ce('div', { class: 'pm-history-panel', style: 'display:none;' });
        wrap.appendChild(historyPanelEl);

        // wiring
        videoEl.volume = settings.volume;
        volumeEl.addEventListener('input', () => {
            videoEl.volume = parseFloat(volumeEl.value);
            settings.volume = parseFloat(volumeEl.value);
            saveSettings();
        });
        playPauseBtn.addEventListener('click', () => {
            if (!playerState.currentSong) return;
            if (videoEl.paused) videoEl.play().catch(() => {});
            else videoEl.pause();
        });
        prevBtn.addEventListener('click', () => goBack());
        nextBtn.addEventListener('click', () => goForwardOrNext());
        historyBtn.addEventListener('click', () => {
            const show = historyPanelEl.style.display === 'none';
            historyPanelEl.style.display = show ? 'block' : 'none';
            historyBtn.classList.toggle('pm-active', show);
            if (show) renderHistoryPanel();
        });
        loopBtn.addEventListener('click', () => {
            settings.loop = !settings.loop;
            loopBtn.classList.toggle('pm-active', settings.loop);
        });
        orderSelectEl.addEventListener('change', () => {
            settings.order = orderSelectEl.value;
            saveSettings();
            playerState.semiRandomPlayed.clear();
        });
        domainSelectEl.addEventListener('change', () => switchDomain(domainSelectEl.value));

        videoEl.addEventListener('play', () => { playPauseBtn.innerHTML = '<i class="fa fa-pause" aria-hidden="true"></i>'; });
        videoEl.addEventListener('pause', () => { playPauseBtn.innerHTML = '<i class="fa fa-play" aria-hidden="true"></i>'; });
        videoEl.addEventListener('ended', () => {
            if (settings.loop) { videoEl.currentTime = 0; videoEl.play().catch(() => {}); }
            else goForwardOrNext();
        });

        let seeking = false;
        videoEl.addEventListener('timeupdate', () => {
            if (seeking) return;
            curTimeEl.textContent = fmtTime(videoEl.currentTime);
            if (videoEl.duration) seekEl.value = String((videoEl.currentTime / videoEl.duration) * 1000);
        });
        videoEl.addEventListener('loadedmetadata', () => {
            durTimeEl.textContent = fmtTime(videoEl.duration);
        });
        seekEl.addEventListener('mousedown', () => { seeking = true; });
        seekEl.addEventListener('touchstart', () => { seeking = true; });
        seekEl.addEventListener('input', () => {
            if (videoEl.duration) curTimeEl.textContent = fmtTime((seekEl.value / 1000) * videoEl.duration);
        });
        const commitSeek = () => {
            if (videoEl.duration) videoEl.currentTime = (seekEl.value / 1000) * videoEl.duration;
            seeking = false;
        };
        seekEl.addEventListener('change', commitSeek);
        seekEl.addEventListener('mouseup', commitSeek);
        seekEl.addEventListener('touchend', commitSeek);

        return wrap;
    }

    function refreshPlaylistPlayingMarker() {
        if (typeof playingMarkerRefreshFn === 'function') playingMarkerRefreshFn();
    }

    function buildBrowserSection() {
        const wrap = ce('div', { class: 'pm-browser' });

        // sidebar
        const sidebar = ce('div', { class: 'pm-sidebar' });
        const sideActions = ce('div', { class: 'pm-sidebar-actions' });
        const newBtn = ce('div', { class: 'pm-btn' }, '+ New');
        const exportBtn = ce('div', { class: 'pm-btn', title: 'Export the selected playlist' }, 'Export');
        const importBtn = ce('div', { class: 'pm-btn', title: 'Import a playlist file as a new playlist' }, 'Import');
        const importInput = ce('input', { type: 'file', accept: 'application/json', style: 'display:none' });
        sideActions.appendChild(newBtn);
        sideActions.appendChild(exportBtn);
        sideActions.appendChild(importBtn);
        sideActions.appendChild(importInput);
        sidebar.appendChild(sideActions);
        const listEl = ce('div', { class: 'pm-playlist-list' });
        sidebar.appendChild(listEl);

        newBtn.addEventListener('click', () => {
            const name = prompt('Playlist name:');
            if (name && name.trim()) {
                const pl = createPlaylist(name.trim());
                selectedBrowserPlaylistId = pl.id;
                renderSidebar();
                renderSongList();
            }
        });
        exportBtn.addEventListener('click', () => {
            const pl = getPlaylist(selectedBrowserPlaylistId);
            if (!pl) return;
            const blob = new Blob([JSON.stringify(pl.songs, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = ce('a', { href: url, download: sanitizeFilename(pl.name) + '.json' });
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        });
        importBtn.addEventListener('click', () => importInput.click());
        importInput.addEventListener('change', () => {
            const file = importInput.files[0];
            if (!file) return;
            const baseName = file.name.replace(/\.json$/i, '');
            const reader = new FileReader();
            reader.onload = () => {
                try {
                    const data = JSON.parse(reader.result);
                    if (!Array.isArray(data) || !data.length) throw new Error('bad format');

                    if (data[0] && typeof data[0] === 'object' && Array.isArray(data[0].songs)) {
                        // Full multi-playlist backup (our own "Export" used to produce this)
                        data.forEach(pl => {
                            if (pl.id === LIKED_ID) {
                                (pl.songs || []).forEach(s => {
                                    const song = normalizeImportedSong(s);
                                    if (song) addSongToPlaylist(LIKED_ID, song);
                                });
                            } else {
                                const songs = (pl.songs || []).map(normalizeImportedSong).filter(Boolean);
                                const newPl = { id: uid(), name: pl.name || baseName, system: false, createdAt: Date.now(), songs };
                                playlists.push(newPl);
                            }
                        });
                        savePlaylists();
                        showToast('Playlists imported.');
                    } else {
                        const songs = data.map(normalizeImportedSong).filter(Boolean);
                        if (!songs.length) throw new Error('no valid songs');
                        const newPl = { id: uid(), name: baseName || 'Imported Playlist', system: false, createdAt: Date.now(), songs };
                        playlists.push(newPl);
                        selectedBrowserPlaylistId = newPl.id;
                        savePlaylists();
                        showToast('Imported "' + newPl.name + '" (' + songs.length + ' songs).');
                    }
                    renderSidebar();
                    renderSongList();
                } catch (e) {
                    showToast('Import failed: invalid file.', true);
                }
                importInput.value = '';
            };
            reader.readAsText(file);
        });

        function renderSidebar() {
            listEl.innerHTML = '';
            playlists.forEach(pl => {
                const item = ce('div', { class: 'pm-playlist-item' + (pl.id === selectedBrowserPlaylistId ? ' pm-selected' : '') });
                if (pl.id === playerState.activePlaylistId) item.classList.add('pm-playing-marker');
                const playEl = ce('span', { class: 'pm-pl-play', title: 'Play this playlist' }, '<i class="fa fa-play" aria-hidden="true"></i>');
                playEl.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (!pl.songs.length) { showToast('This playlist is empty.', true); return; }
                    setActivePlaylist(pl.id);
                    selectedBrowserPlaylistId = pl.id;
                    renderSidebar();
                    renderSongList();
                });
                const nameEl = ce('span', { class: 'pm-pl-name' }, escapeHtml(pl.name));
                const countEl = ce('span', { class: 'pm-pl-count' }, String(pl.songs.length));
                item.appendChild(playEl);
                item.appendChild(nameEl);
                item.appendChild(countEl);
                if (!pl.system) {
                    const delEl = ce('span', { class: 'pm-pl-del' }, '<i class="fa fa-trash" aria-hidden="true"></i>');
                    delEl.addEventListener('click', (e) => {
                        e.stopPropagation();
                        confirmDialog('Delete playlist "' + pl.name + '"? This cannot be undone.', () => {
                            if (playerState.activePlaylistId === pl.id) {
                                playerState.activePlaylistId = null;
                                playerState.currentSong = null;
                            }
                            deletePlaylist(pl.id);
                            if (selectedBrowserPlaylistId === pl.id) selectedBrowserPlaylistId = LIKED_ID;
                            renderSidebar();
                            renderSongList();
                        });
                    });
                    item.appendChild(delEl);
                    nameEl.addEventListener('dblclick', () => {
                        const newName = prompt('Rename playlist:', pl.name);
                        if (newName && newName.trim()) { renamePlaylist(pl.id, newName.trim()); renderSidebar(); renderSongList(); }
                    });
                }
                item.addEventListener('click', () => {
                    selectedBrowserPlaylistId = pl.id;
                    renderSidebar();
                    renderSongList();
                });
                listEl.appendChild(item);
            });
        }
        playingMarkerRefreshFn = renderSidebar;

        // main list
        const mainList = ce('div', { class: 'pm-main-list' });
        const listHeader = ce('div', { class: 'pm-list-header' });
        const playPlaylistBtn = ce('div', { class: 'pm-btn', title: 'Play this playlist' }, '<i class="fa fa-play" aria-hidden="true"></i> Play');
        const searchEl = ce('input', { class: 'pm-search', placeholder: 'Search song / artist / anime...' });
        listHeader.appendChild(playPlaylistBtn);
        listHeader.appendChild(searchEl);
        mainList.appendChild(listHeader);
        const titleEl = ce('div', { class: 'pm-list-title' });
        mainList.appendChild(titleEl);
        const songsEl = ce('div', { class: 'pm-songs' });
        mainList.appendChild(songsEl);

        searchEl.addEventListener('input', () => { searchQuery = searchEl.value.toLowerCase(); renderSongList(); });
        playPlaylistBtn.addEventListener('click', () => {
            setActivePlaylist(selectedBrowserPlaylistId);
            renderSidebar();
        });

        function renderSongList() {
            const pl = getPlaylist(selectedBrowserPlaylistId);
            if (!pl) return;
            titleEl.textContent = pl.name + ' (' + pl.songs.length + ' songs)';
            songsEl.innerHTML = '';
            const filtered = pl.songs.filter(s => {
                if (!searchQuery) return true;
                const hay = (s.songName + ' ' + s.artist + ' ' + s.animeRomaji + ' ' + s.animeEnglish).toLowerCase();
                return hay.includes(searchQuery);
            });
            if (!filtered.length) {
                songsEl.appendChild(ce('div', { class: 'pm-empty-hint' }, pl.songs.length ? 'No songs match your search.' : 'This playlist is empty. Like a song in-game to add it here!'));
                return;
            }
            filtered.forEach(song => {
                const realIndex = pl.songs.indexOf(song);
                const row = ce('div', { class: 'pm-song-row' });
                const playIcon = ce('div', { class: 'pm-song-play' }, '<i class="fa fa-play" aria-hidden="true"></i>');
                playIcon.addEventListener('click', () => { setActivePlaylist(pl.id, realIndex); renderSidebar(); });
                row.appendChild(playIcon);

                const meta = ce('div', { class: 'pm-song-meta' });
                meta.appendChild(ce('div', { class: 'pm-song-title-line' }, escapeHtml(song.songName) + ' — ' + escapeHtml(song.artist)));
                meta.appendChild(ce('div', { class: 'pm-song-sub-line' }, escapeHtml(song.animeRomaji) + ' • ' + typeLabel(song)));
                row.appendChild(meta);

                const qTags = ce('div', { class: 'pm-song-qualities' });
                ['0', '480', '720'].forEach(q => {
                    const label = q === '0' ? 'Audio' : (q === '480' ? 'MQ' : 'HQ');
                    const has = !!song.videoMap[q];
                    const t = ce('a', {
                        class: 'pm-q-tag' + (has ? '' : ' pm-disabled'),
                        href: has ? buildUrl(settings.domain, song.videoMap[q]) : '#',
                        target: '_blank',
                        rel: 'noopener noreferrer',
                        title: has ? 'Open/copy direct link' : '',
                    }, label);
                    t.addEventListener('click', (e) => { if (!has) e.preventDefault(); });
                    qTags.appendChild(t);
                });
                row.appendChild(qTags);

                row.appendChild(ce('div', { class: 'pm-song-id' }, '#' + song.annSongId));

                const actions = ce('div', { class: 'pm-song-actions' });
                if (playlists.length > 1) {
                    const select = ce('select', {});
                    select.appendChild(ce('option', { value: '' }, 'Add to...'));
                    playlists.filter(p => p.id !== pl.id).forEach(p => select.appendChild(ce('option', { value: p.id }, escapeHtml(p.name))));
                    select.addEventListener('change', () => {
                        if (select.value) {
                            addSongToPlaylist(select.value, song);
                            showToast('Added to "' + getPlaylist(select.value).name + '"');
                            renderSidebar();
                            select.value = '';
                        }
                    });
                    actions.appendChild(select);
                }
                const removeEl = ce('div', { class: 'pm-song-remove' }, '<i class="fa fa-times" aria-hidden="true"></i>');
                removeEl.addEventListener('click', () => {
                    removeSongFromPlaylist(pl.id, song.annSongId);
                    renderSidebar();
                    renderSongList();
                    updateSongInfoRowState();
                });
                actions.appendChild(removeEl);
                row.appendChild(actions);

                songsEl.appendChild(row);
            });
        }

        document.addEventListener('pm:playlistsChanged', () => { renderSidebar(); renderSongList(); });

        renderSidebar();
        renderSongList();

        wrap.appendChild(sidebar);
        wrap.appendChild(mainList);
        return wrap;
    }

    function buildMainWindow() {
        const overlay = ce('div', { id: 'pmOverlay' });
        document.body.appendChild(overlay);

        const win = ce('div', { id: 'pmWindow' });
        const header = ce('div', { class: 'pm-header' });
        header.appendChild(ce('h3', {}, 'Playlist Manager'));
        const closeBtn = ce('div', { class: 'pm-close' }, '<i class="fa fa-times" aria-hidden="true"></i>');
        header.appendChild(closeBtn);
        win.appendChild(header);

        const body = ce('div', { class: 'pm-body' });
        body.appendChild(buildPlayerSection());
        body.appendChild(buildBrowserSection());
        win.appendChild(body);

        document.body.appendChild(win);

        function close() { win.classList.remove('pm-open'); overlay.classList.remove('pm-open'); }
        function open() { win.classList.add('pm-open'); overlay.classList.add('pm-open'); }
        closeBtn.addEventListener('click', close);
        overlay.addEventListener('click', close);

        return { open, close };
    }

    let mainWindowCtl = null;

    /* =========================================================================================
     *  MENU ENTRY (#optionsContainer)
     * ========================================================================================= */
    function injectMenuButton() {
        const ul = document.querySelector('#optionsContainer ul');
        if (!ul || document.getElementById('pmMenuOpen')) return;
        const li = ce('li', { class: 'clickAble', id: 'pmMenuOpen' }, 'My Playlists');
        li.addEventListener('click', () => {
            if (!mainWindowCtl) mainWindowCtl = buildMainWindow();
            mainWindowCtl.open();
        });
        const installedLi = ul.querySelector('li[data-target="#installedModal"]');
        if (installedLi) {
            if (installedLi.nextElementSibling) ul.insertBefore(li, installedLi.nextElementSibling);
            else ul.appendChild(li);
        } else {
            ul.insertBefore(li, ul.firstChild);
        }
    }

    /* =========================================================================================
     *  IN-QUIZ SONG INFO ROW: like / add-to-playlist buttons + indicator
     * ========================================================================================= */
    let currentRevealedSong = null;

    function isLiked(song) { return !!findSongInPlaylist(getPlaylist(LIKED_ID), song.annSongId); }

    function updateSongInfoRowState() {
        if (!currentRevealedSong) return;
        const likeBtn = document.getElementById('pmLikeBtn');
        const addBtn = document.getElementById('pmAddBtn');
        if (!likeBtn || !addBtn) return;
        const liked = isLiked(currentRevealedSong);
        likeBtn.classList.toggle('pm-liked', liked);
        const likeIcon = likeBtn.querySelector('i');
        if (likeIcon) likeIcon.className = 'fa ' + (liked ? 'fa-heart' : 'fa-heart-o');

        const containing = findPlaylistsContaining(currentRevealedSong.annSongId).filter(p => p.id !== LIKED_ID);
        const inPlaylist = containing.length > 0;
        addBtn.classList.toggle('pm-in-playlist', inPlaylist);
        const addIcon = addBtn.querySelector('i');
        if (addIcon) addIcon.className = 'fa ' + (inPlaylist ? 'fa-plus-square' : 'fa-plus-square-o');
    }

    function openAddToPlaylistPopover() {
        closeAnyPopover();
        if (!currentRevealedSong) return;

        const overlay = ce('div', { class: 'pm-confirm-overlay pm-popover-modal' });
        const box = ce('div', { class: 'pm-confirm-box' });
        box.appendChild(ce('p', { style: 'font-weight:600;color:var(--pm-accent);margin-bottom:10px;' },
            'Add "' + escapeHtml(currentRevealedSong.songName) + '" to...'));

        const listWrap = ce('div', { style: 'max-height:220px;overflow-y:auto;margin-bottom:6px;' });
        box.appendChild(listWrap);

        function renderList() {
            listWrap.innerHTML = '';
            const custom = playlists.filter(p => p.id !== LIKED_ID);
            if (!custom.length) {
                listWrap.appendChild(ce('div', { style: 'color:var(--pm-text-dim);padding:4px;font-size:12px;' }, 'No custom playlists yet — create one below.'));
                return;
            }
            custom.forEach(p => {
                const has = !!findSongInPlaylist(p, currentRevealedSong.annSongId);
                const item = ce('div', { class: 'pm-popover-item' },
                    '<i class="fa ' + (has ? 'fa-check-square-o' : 'fa-square-o') + '" aria-hidden="true"></i> ' + escapeHtml(p.name) +
                    '<span style="margin-left:auto;color:var(--pm-text-dim);font-size:10px;">(' + p.songs.length + ')</span>');
                item.style.justifyContent = 'flex-start';
                item.addEventListener('click', () => {
                    if (has) removeSongFromPlaylist(p.id, currentRevealedSong.annSongId);
                    else addSongToPlaylist(p.id, currentRevealedSong);
                    updateSongInfoRowState();
                    renderList();
                });
                listWrap.appendChild(item);
            });
        }
        renderList();

        const newRow = ce('div', { class: 'pm-popover-new' });
        const input = ce('input', { placeholder: 'New playlist name' });
        const addNewBtn = ce('div', { class: 'pm-btn' }, '<i class="fa fa-plus" aria-hidden="true"></i>');
        newRow.appendChild(input);
        newRow.appendChild(addNewBtn);
        box.appendChild(newRow);
        function createAndAdd() {
            if (input.value.trim()) {
                const pl = createPlaylist(input.value.trim());
                addSongToPlaylist(pl.id, currentRevealedSong);
                updateSongInfoRowState();
                input.value = '';
                renderList();
            }
        }
        addNewBtn.addEventListener('click', createAndAdd);
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') createAndAdd(); });

        const actions = ce('div', { class: 'pm-confirm-actions', style: 'margin-top:10px;' });
        const closeBtn2 = ce('div', { class: 'pm-btn' }, 'Done');
        actions.appendChild(closeBtn2);
        box.appendChild(actions);
        closeBtn2.addEventListener('click', () => overlay.remove());

        overlay.appendChild(box);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
        document.body.appendChild(overlay);
    }

    function ensureSongInfoButtons() {
        const row = document.getElementById('qpSongInfoLinkRow');
        if (!row) return;
        if (!document.getElementById('pmLikeBtn')) {
            const likeBtn = ce('span', { id: 'pmLikeBtn', title: 'Like this song' }, '<i class="fa fa-heart-o" aria-hidden="true"></i>');
            likeBtn.addEventListener('click', () => {
                if (!currentRevealedSong) return;
                if (isLiked(currentRevealedSong)) removeSongFromPlaylist(LIKED_ID, currentRevealedSong.annSongId);
                else addSongToPlaylist(LIKED_ID, currentRevealedSong);
                updateSongInfoRowState();
            });
            row.appendChild(likeBtn);
        }
        if (!document.getElementById('pmAddBtn')) {
            const addBtn = ce('span', { id: 'pmAddBtn', title: 'Add to playlist' }, '<i class="fa fa-plus-square-o" aria-hidden="true"></i>');
            addBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (!currentRevealedSong) return;
                openAddToPlaylistPopover();
            });
            row.appendChild(addBtn);
        }
        updateSongInfoRowState();
    }

    /* =========================================================================================
     *  AMQ LISTENER
     * ========================================================================================= */
    function registerListener() {
        if (typeof Listener === 'undefined') return false;
        new Listener('answer results', (payload) => {
            try {
                const songInfo = payload && payload.songInfo;
                if (!songInfo) return;
                const song = extractSong(songInfo);
                currentRevealedSong = song;
                updateSongEverywhere(song);
                ensureSongInfoButtons();
            } catch (e) { /* ignore malformed payloads */ }
        }).bindListener();
        return true;
    }

    /* =========================================================================================
     *  INIT
     * ========================================================================================= */
    function init() {
        let listenerOk = registerListener();
        injectMenuButton();
        ensureSongInfoButtons();
        setInterval(() => {
            injectMenuButton();
            if (!listenerOk) listenerOk = registerListener();
        }, 1000);
    }

    function waitForAmq() {
        if (document.body) init();
        else setTimeout(waitForAmq, 300);
    }
    waitForAmq();

})();
