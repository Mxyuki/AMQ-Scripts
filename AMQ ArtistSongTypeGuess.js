// ==UserScript==
// @name         AMQ Artist / Song / Type
// @namespace    https://github.com/Mxyuki/AMQ-Scripts
// @version      0.2
// @description  Try to find the artist, the song and the type of music with your friends.
// @author       Mxyuki
// @match        https://animemusicquiz.com/
// @require      https://raw.githubusercontent.com/TheJoseph98/AMQ-Scripts/master/common/amqScriptInfo.js
// @require      https://raw.githubusercontent.com/TheJoseph98/AMQ-Scripts/master/common/amqWindows.js
// ==/UserScript==

if (document.getElementById("startPage")) return;

let loadInterval = setInterval(() => {
    if (document.getElementById("loadingScreen").classList.contains("hidden")) {
        window();
        setup();
        clearInterval(loadInterval);
    }
}, 500);

let asWindow;

var prefixSong = "/as";
var prefixArtist = "/aa";

var song;
var artist;
var opedins;

var songAnswer;
var artistAnswer;
var opedinsAnswer

let songPoint = 0;
let artistPoint = 0;
let opedinsPoint = 0;

var countSong;
var totalSong;

let toggle = 0;

if (quiz.gameMode == "Ranked") return;

function sendChatMessage(message) {
    gameChat.$chatInputField.val(message);
    gameChat.sendMessage();
}

function setup() {
    new Listener("Game Starting", (payload) =>{
        songPoint = 0;
        artistPoint = 0;
        songAnswer = '';
        artistAnswer = '';
        opedinsAnswer = '';
        song = '';
        artist = '';
        opedins = '';
    }).bindListener();

    new Listener("answer results", (data) => {

        //Player Answers
                song = document.getElementById("asSongText").value;
                artist = document.getElementById("asArtistText").value;
                opedins = document.getElementById("asOpEdInsText").value;
        if(artist != '' && toggle == 1){
            sendChatMessage("Artist : " + artist);
        }
        if(song != '' && toggle == 1){
            sendChatMessage("Song : " + song);
        }
        if(opedins != '' && toggle == 1){
            sendChatMessage("Type : " + opedins);
        }

        setTimeout(function() {
                //AMQ Answers
                songAnswer = document.getElementById("qpSongName").innerText;
                artistAnswer = document.getElementById("qpSongArtist").innerText;
                opedinsAnswer = document.getElementById("qpSongType").innerText;
                //Player Answers
                song = document.getElementById("asSongText").value;
                artist = document.getElementById("asArtistText").value;
                opedins = document.getElementById("asOpEdInsText").value;
                //How many song in game
                countSong = document.getElementById("qpCurrentSongCount").innerText;
                totalSong = document.getElementById("qpTotalSongCount").innerText;

            songAnswer = (songAnswer.toLowerCase());
            artistAnswer = (artistAnswer.toLowerCase());
            opedinsAnswer = (opedinsAnswer.toLowerCase());
            song = (song.toLowerCase());
            artist = (artist.toLowerCase());
            opedins = (opedins.toLowerCase());

                if(songAnswer == song && toggle == 1){
                    songPoint++;
                    sendChatMessage("Song Point +1, Total :" + songPoint + "/" + countSong );
                }

                if(artistAnswer == artist && toggle == 1){
                    artistPoint++;
                    sendChatMessage("Artist Point +1, Total :" + artistPoint + "/" + countSong );
                }

                if(opedinsAnswer == opedins && toggle == 1){
                    opedinsPoint++;
                    sendChatMessage("Type Point +1, Total :" + opedinsPoint + "/" + countSong );
                }
            setTimeout(function() {
                song = '';
                artist = '';
                opedins = '';
                songAnswer = '';
                artistAnswer = '';
                opedinsAnswer = '';
                $("#asSongText").val("");
                $("#asArtistText").val("");
                $("#asOpEdInsText").val("");
                }, 4000);

                if(countSong == totalSong && toggle == 1){
                    sendChatMessage("------------Result------------");
                    sendChatMessage("Song : " + songPoint + " / " + totalSong);
                    sendChatMessage("Artist : " + artistPoint + " / " + totalSong);
                    sendChatMessage("Type : " + opedinsPoint + " / " + totalSong);
                    sendChatMessage("--------------End-------------");
                    songPoint = 0;
                    artistPoint = 0;
                    opedins = 0;
                    songAnswer = '';
                    artistAnswer = '';
                    opedinsAnswer = '';
                    song = '';
                    artist = '';
                    opedins = '';
                }
            }, 1500);
        }).bindListener();
}

function Enable(){
    $("#asStatus").text('Enabled');
    toggle = 1;
}
function Disable(){
    $("#asStatus").text('Disabled');
    toggle = 0;
}

function window() {
    asWindow = new AMQWindow({
        title: "Artist/Song Script",
        width: 300,
        height: 350,
        zIndex: 1054,
        draggable: true
    });

    asWindow.addPanel({
        width: 1.0,
        height: 50,
        position: {
            x: 0,
            y: 25
        },
        id: "asArtist"
    });

    asWindow.addPanel({
        width: 1.0,
        height: 50,
        position: {
            x: 0,
            y: 75,
        },
        id: "asSong"
    });

    asWindow.addPanel({
        width: 1.0,
        height: 50,
        position: {
            x: 0,
            y: 125,
        },
        id: "asOpEdIns"
    });

    asWindow.addPanel({
        width: 1.0,
        height: 50,
        position: {
            x: 0,
            y: 160,
        },
        id: "asToggle"
    });

    asWindow.addPanel({
        width: 1.0,
        height: 50,
        position: {
            x: 0,
            y: 225,
        },
        id: "asStatusText"
    });

    asWindow.panels[0].panel.append(
        $(`<div id="asSongTextBox"></div>`)

        .append($(`<input id="asSongText" type="text" placeholder="Song Name">`))
    );

    asWindow.panels[1].panel.append(
        $(`<div id="asArtistTextBox"></div>`)

        .append($(`<input id="asArtistText" type="text" placeholder="Artist Name">`))
    )

    asWindow.panels[2].panel.append(
        $(`<div id="asOpEdInsTextBox"></div>`)

        .append($(`<input id="asOpEdInsText" type="text" placeholder="OP/ED/INS Number">`))
    )

    asWindow.panels[3].panel.append(
        $(`<div id="asToggle"></div>`)
        .append(
            $(`<button id="farmWindowEnable" class="btn btn-primary">Enable</button>`).click(function () {
                Enable();
            })
            )
         .append(
            $(`<button id="farmWindowDisable" class="btn btn-primary">Disable</button>`).click(function () {
                Disable();
            })
    )
)
    asWindow.panels[4].panel.append(
        $(`<div id="asStatusText"></div>`)
        .append(
            $(
                `<div id="asStatus">
                    <p id="asStatus">Disabled</p>
                </div>`
            )
        )
    )
}
    let oldWidth = $("#qpOptionContainer").width();
    $("#qpOptionContainer").width(oldWidth + 35);
    $("#qpOptionContainer > div").append($(`<div id="qpasScript" class="clickAble qpOption"><i aria-hidden="true" class="fa fa-bars qpMenuItem"></i></div>`)
                                         .click(() => {
        if (asWindow.isVisible()) {
            asWindow.close();
        }
        else {
            asWindow.open();
        }
    })
        .popover({
        content: "Artist/Song",
        trigger: "hover",
        placement: "bottom"
    })
       );



AMQ_addStyle(`
        #qpasScript {
            width: 27px;
            margin-right: 5px;
        }
        #asSongTextBox {
            width: 100%;
            float: center;
            text-align: center;

        }
        #asArtistTextBox {
            width: 100%;
            float: center;
            text-align: center;

        }
        #asOpEdInsTextBox {
            width: 100%;
            float: center;
            text-align: center;

        }
        #asOpEdInsText {
            width: 275px;
            float: center;
            text-align: center;

        }
        #asSongText {
            width: 275px;
            float: center;
            text-align: center;

        }
        #asArtistText {
            width: 275px;
            float: center;
            text-align: center;

        }

         #asToggle {
            width: 275px;
            float: center;
            text-align: center;

        }

        #asToggle > button {
            text-align: center;
            float: center;
            width: 70px;
            margin: 13px;
        }

        #asStatus > p {
            text-align: center;
            float: center;
        }

        #asStatusText {
            width: 100%;
            float: center;
            text-align: center;

        }

    `);
