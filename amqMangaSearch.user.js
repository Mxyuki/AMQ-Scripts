// ==UserScript==
// @name         AMQ Manga Search
// @namespace    https://github.com/Mxyuki/AMQ-Scripts
// @version      1.0.0
// @description  Add a button in game next to "Video - Anime" that let you go to the Manga Page.
// @author       Mxyuki
// @match        https://animemusicquiz.com/*
// ==/UserScript==

if (document.getElementById("startPage")) return;
let loadInterval = setInterval(() => {
    if (document.getElementById("loadingScreen").classList.contains("hidden")) {
        setup();
        clearInterval(loadInterval);
    }
}, 500);

function setup(){
    $(`#qpSongInfoLinkRow b`).append(`
        -
        <a id="qpMangaLink" target="blank" href="https://myanimelist.net/manga/">Manga</a>
    `);
}

async function characterByID(id){
    try {
        let response = await fetch(`https://api.jikan.moe/v4/anime/${id}/characters`);
        let data = await response.json();
        if(data.data && data.data[0])mangaByCharacter(data.data[0].character.mal_id);
    } catch (error) {
        console.error("No Character");
        $("#qpMangaLink").attr("href", "https://myanimelist.net/manga/");
    }
}

async function mangaByCharacter(id) {
    try {
        let response = await fetch(`https://api.jikan.moe/v4/characters/${id}/manga`);
        let data = await response.json();
        if (data.data && data.data[0])
            $("#qpMangaLink").attr("href", data.data[0].manga.url);
    } catch (error) {
        console.error("No Manga");
        $("#qpMangaLink").attr("href", "https://myanimelist.net/manga/");
    }
}

new Listener("answer results", (payload) => {
    characterByID(payload.songInfo.siteIds.malId);
}).bindListener();
