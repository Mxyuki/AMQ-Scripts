// ==UserScript==
// @name         AMQ Artist/Song
// @namespace    https://github.com/Mxyuki/AMQ-Scripts
// @version      0.1
// @description  
// @author       Mxyuki
// @match        https://animemusicquiz.com/
// @require      https://raw.githubusercontent.com/TheJoseph98/AMQ-Scripts/master/common/amqScriptInfo.js
// ==/UserScript==

// don't load on login page
if (document.getElementById("startPage")) return;

// Wait until the LOADING... screen is hidden and load script
let loadInterval = setInterval(() => {
    if (document.getElementById("loadingScreen").classList.contains("hidden")) {
        setup();
        clearInterval(loadInterval);
    }
}, 500);

var prefixSong = "/as";
var prefixArtist = "/aa";

var song;
var artist;

var songAnswer;
var artistAnswer;

let songPoint = 0;
let artistPoint = 0;

var countSong;
var totalSong;

function sendChatMessage(message) {
    gameChat.$chatInputField.val(message);
    gameChat.sendMessage();
}

function setup() {
    let commandListener = new Listener("game chat update", (payload) => {
        payload.messages.forEach(message => {
            if (message.sender === selfName && message.message.startsWith(prefixSong)) {
                var index = message.message.indexOf(' ');
                if (index > 0) song = message.message.substr(index + 1);
            }
            if (message.sender === selfName && message.message.startsWith(prefixArtist)) {
                var index2 = message.message.indexOf(' ');
                if (index2 > 0) artist = message.message.substr(index2 + 1);
            }
        });
    });

    commandListener.bindListener();

    new Listener("Game Starting", (payload) =>{
        songPoint = 0;
        artistPoint = 0;
        songAnswer = '';
        artistAnswer = '';
        song = '';
        artist = '';
    }).bindListener();

    new Listener("answer results", (data) => {
        setTimeout(function() {

    songAnswer = document.getElementById("qpSongName").innerText;
    artistAnswer = document.getElementById("qpSongArtist").innerText;
    countSong = document.getElementById("qpCurrentSongCount").innerText;
    totalSong = document.getElementById("qpTotalSongCount").innerText;

            song = (song.toLowerCase());
            artist = (artist.toLowerCase());
            songAnswer = (songAnswer.toLowerCase());
            artistAnswer = (artistAnswer.toLowerCase());

    if(songAnswer == song){
            songPoint++;
            sendChatMessage("Song Point +1, Total :" + songPoint + "/" + countSong );
        }

    if(artistAnswer == artist){
            artistPoint++;
            sendChatMessage("Artist Point +1, Total :" + artistPoint + "/" + countSong );
        }
            song = '';
            artist = '';
            songAnswer = '';
            artistAnswer = '';

            if(countSong == totalSong){
                sendChatMessage("------------Result------------");
                sendChatMessage("Song : " + songPoint + " / " + totalSong);
                sendChatMessage("Artist : " + artistPoint + " / " + totalSong);
                sendChatMessage("--------------End-------------");
                songPoint = 0;
                artistPoint = 0;
                songAnswer = '';
                artistAnswer = '';
                song = '';
                artist = '';
            }
        }, 1000);
    }).bindListener();
    }
