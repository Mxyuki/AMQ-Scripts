// ==UserScript==
// @name         AMQ Artist Game
// @namespace    https://github.com/Mxyuki/AMQ-Scripts
// @version      0.1
// @description  Play with song only from a certain artist
// @author       Mxyuki
// @match        https://animemusicquiz.com/*
// @require      https://raw.githubusercontent.com/TheJoseph98/AMQ-Scripts/master/common/amqWindows.js
// @require      https://raw.githubusercontent.com/TheJoseph98/AMQ-Scripts/master/common/amqScriptInfo.js
// ==/UserScript==

if (document.getElementById("startPage")) return;

let loadInterval = setInterval(() => {
    if (document.getElementById("loadingScreen").classList.contains("hidden")) {
        clearInterval(loadInterval);
        setup();
    }
}, 500);

let artistSongList = [];
let allAnimeNames = [];

let selectedAnime = [];
let currentSongIndex = 0;
let songTime;
let audio;
let randomTime;

let point = 0;

let settingFiltered = [];

let gameSettings = {
    guessTime: 20,
    op: true,
    ed: true,
    ins: true,
    songNumber: 20,
    minYear: 1944,
    maxYear: 2023,
    minDiff: 0,
    maxDiff: 100
};

let agWindow;

function setup(){

    document.querySelector('#gcInput').addEventListener('keydown', function(event) {
        if (event.key === 'Enter') processCommand(this.value);
    });

    $('#gameChatPage > .col-xs-9').append('<div id="gameArtist" class="text-center hidden"></div>');

    $('#gameArtist').append(`
        <div id="gaAnimeContainer" class="row">



            <div class="col-xs-3">

                <div id="gaStandingContainer" class="container qpSideContainer floatingContainer cheatTestHide">
				    <div>
                        <h3>Score</h3>
                        <h4 id="gaStandingCorrectCount" class="hide" data-toggle="popover" data-content="Number of Correct Guesses." data-trigger="hover" data-html="true" data-placement="top" data-original-title="" title="">0</h4>
                    </div>
                    <div id="gaStandingItemContainer" class="ps__always_visible ps ps--theme_default" data-ps-id="f75b56c8-4af0-6f2b-8fd8-bec551a07143">
                        <div id="gaScoreBoardEntryContainer"></div>
                        <div class="ps__scrollbar-x-rail" style="left: 0px; bottom: 0px;">
                            <div class="ps__scrollbar-x" tabindex="0" style="left: 0px; width: 0px;"></div>
                        </div>
                        <div class="ps__scrollbar-y-rail" style="top: 0px; right: 0px;">
                            <div class="ps__scrollbar-y" tabindex="0" style="top: 0px; height: 0px;"></div>
                        </div>
                    </div>
                    <div id="gaScore">
                        <h1 id="gaScoreText">0</h1>
                    </div>
                </div>

            </div>



            <div id="gaAnimeCenterContainer" class="col-xs-6">

                <div id="gaCenterInfoContainer">
	                <div id="gaCounterShadowHider">
                        <div id="gaCounter" class="floatingContainer">
                            <span id="gaCurrentSongCount">100</span>/<span id="gaTotalSongCount">100</span>
                        </div>
                    </div>
                    <div id="gaAnimeNameContainer" class="qpAnimeNameContainer floatingContainer" data-original-title="" title="">
                        <div id="gaAnimeName">Name</div>
                    </div>
                </div>

                <div id="gaVideoContainerOuter">
                    <div id="gaVideoContainer">
                        <h1 id="gaCountDown" style="position: relative; top: -150px;">0</h1>
                    </div>
                </div>

                <div id="gaAnswerInputContainer" class="floatingContainer">

				    <div id="gaSkipContainer">
                        <div id="gaVoteShadowHider">
                            <duv id="gaVoteSkipGlowContainer"></duv>
                            <div id="gaVoteSkip" class="leftRightButtonTop clickAble qpSkipSection">
                                <p id="gaSkipText">Skip</p>
                            </div>
                        </div>
                    </div>
                    <input type="text" class="flatTextInput" id="gaAnswerInput" placeholder="Anime Name" maxlength="255"">

                </div>

            </div>

            <div class="col-xs-3">

                <div id="gaSongInfoContainer" class="container qpSideContainer floatingContainer cheatTestHide">
                    <div class="row">
                        <h3>Song Info</h3>
                    </div>
                    <div class="row">
                        <h5><b>Song Name</b></h5>
                        <p id="gaSongName">song name</p>
                    </div>
                    <div class="row">
                        <h5><b>Artist</b></h5>
                        <p id="gaSongArtist">artist</p>
                    </div>
                    <div class="row">
                        <h5><b>Type</b></h5>
                        <p id="gaSongType">type</p>
                    </div>
                </div>

            </div>



        </div>
    `);

    agWindow = new AMQWindow({
        title: "BR Plus",
        width: 700,
        height: 450,
        minWidth: 440,
        minHeight: 250,
        zIndex: 999,
        draggable: true
    });

    agWindow.addPanel({
        width: 1.0,
        height: 350,
        position: {
            x: 0,
            y: 20
        },
        id: "agOption"
    });

    $('#agOption').append(`
        <div id="agQuizSettings" class="mhSettingContainer">
            <div class="row">
                <div id="gaGuessTime" class="col-xs-6 text-center">
                    <label>Guess Time</label>
                    <div>
                        <input id="gaGuessTimeText" type="text" value="20" class="gaText text-center">
                    </div>
                </div>
                <div id="gaSongType" class="col-xs-6 text-center">
                    <label>Song Type</label>
                    <div id="gaSongTypeContainer" class="checkboxContainer">
						<div>
							<div class="customCheckbox">
								<input id="gaOpening" type="checkbox" checked="">
								<label for="gaOpening"><i class="fa fa-check" aria-hidden="true"></i></label>
							</div>
							<p>Opening</p>
						</div>
						<div>
							<div class="customCheckbox">
								<input type="checkbox" id="gaEnding" checked="">
								<label for="gaEnding"><i class="fa fa-check" aria-hidden="true"></i></label>
							</div>
							<p>Ending</p>
						</div>
						<div>
							<div class="customCheckbox">
								<input type="checkbox" id="gaInsert" checked="">
								<label for="gaInsert"><i class="fa fa-check" aria-hidden="true"></i></label>
							</div>
							<p>Insert Song</p>
						</div>
					</div>
                </div>
            </div>

            <div class="row">
                <div id="gaNumberSong" class="col-xs-6 text-center">
                    <label>Number of Songs</label>
                    <div>
                        <input id="gaNumberSongText" type="text" value="20" class="gaText text-center">
                    </div>
                </div>
                <div id="gaYear" class="col-xs-6 text-center">
                    <label>Min/Max Year</label>
                    <div>
                        <input id="gaYearMinText" type="text" value="1944" class="gaText text-center">
                        -
                        <input id="gaYearMaxText" type="text" value="2023" class="gaText text-center">
                    </div>
                </div>
            </div>

            <div class="row">
                <div id="gaDifficulty" class="col-xs-6 text-center">
                    <label>Min/Max Difficulty</label>
                    <div>
                        <input id="gaDifficultyMinText" type="text" value="0" class="gaText text-center">
                        -
                        <input id="gaDifficultyMaxText" type="text" value="100" class="gaText text-center">
                    </div>
                </div>
            </div>
        </div>
    `);

    $('#gaOpening').prop('checked', gameSettings.op).click(() => {
        gameSettings.op = !gameSettings.op;
    });
    $('#gaEnding').prop('checked', gameSettings.ed).click(() => {
        gameSettings.ed = !gameSettings.ed;
    });
    $('#gaInsert').prop('checked', gameSettings.ins).click(() => {
        gameSettings.ins = !gameSettings.ins;
    });
    document.getElementById("gaVoteSkip").addEventListener("click", gaSkipClicked);

    AMQ_addStyle(`

    #gameArtist {
        height: calc(100%);
    }

    #gaAnimeContainer {
        margin-bottom: 20px;
    }





    #gaStandingContainer {
        padding: 0;
    }

    #gaStandingCorrectCount {
        position: absolute;
        top: 5px;
        right: 5px;
        margin: 0;
        text-shadow: 0 0 5px #fff, 0 0 15px #b6ff00, 0 0 20px #b6ff00, 0 0 25px #b6ff00;
    }

    #gaStandingItemContainer {
        position: relative;
    }





    #gaCounterShadowHider {
        position: relative;
        z-index: 5;
        overflow: hidden;
        padding-top: 5px;
    }

    #gaCounter {
        font-size: 22px;
        width: 7ch;
        margin: 0 auto;
        border-top-left-radius: 50px;
        border-top-right-radius: 50px;
    }

    #gaAnimeNameContainer {
        font-size: 25px;
        position: relative;
    }

    #gaAnimeName {
        position: absolute;
        min-width: 100%;
        top: 50%;
        transform: translateY(-50%);
        white-space: pre-wrap;
    }

    #gaAnimeNameHider {
        position: absolute;
        top: 36px;
        left: 0;
        right: 0;
        background-color: #424242;
        line-height: 65px;
        font-size: 60px;
    }





    #gaVideoContainer {
        margin-top: 12px;
        width: 100%;
        height: 0px;
        padding-top: 56.25%;
        position: relative;
        background-color: #000;
    }

    #gaVideoOverflowContainer {
        position: relative;
        height: 100%;
        width: 100%;
        border-radius: 2px;
        overflow: hidden;
        z-index: 1;
        background-color: black;
    }

    @media screen and (max-height: 749px) #gaVideoContainer {
        width: 80%;
        padding-top: 45.1%;
        margin: 12px auto 0;
    }



    #gaAnswerInputContainer {
        width: 80%;
        margin: 8px auto 5px;
        padding: 5px;
        position: relative;
    }

    #gaSkipContainer {
        position: absolute;
        z-index: 1;
        top: 0;
        left: 0;
        height: 100%;
        width: 60px;
    }

    #gaVoteShadowHider {
        position: absolute;
        left: 0;
        top: 0;
        overflow: hidden;
        width: 80px;
        height: 100%;
    }

    #gaVoteSkipGlowContainer {
        position: absolute;
        left: 0;
        top: 0;
        height: 100%;
        -webkit-box-shadow: 3px 0px 10px 5px #228dff;
        box-shadow: 3px 0px 10px 5px #228dff;
        opacity: 0.7;
        z-index: -1;
    }

    #gaVoteSkip {
        position: absolute;
        width: 60px;
        top: 0;
        left: -14px;
        overflow: hidden;
        background-color: #424242;
        transform: skewX(-35.5deg);
        transition: transform 0.3s ease-out;
    }

    #gaSkipText {
        margin-top: 6px;
        margin-left: 7px;
    }

    #gaAnswerInputContainer .awesomplete {
        width: 100%;
    }



    .gaText {
        width: 50px;
        color: #000;
    }

    `);
}

function processCommand(command){
    if (command.startsWith("/ag ")){
        document.querySelector('#gcInput').value = "";

        if(command == "/ag") return;
        let commandArtist = command.replace("/ag ", "");
        if(commandArtist == " ") return;

        currentSongIndex = 0;
        point = 0;
        anisongDB(commandArtist);
    }
    else if (command.startsWith("/reset")){

        document.querySelector('#gcInput').value = "";

        audio.pause();

        $("#gameArtist").addClass("hidden");
        $("#quizPage").removeClass("hidden");

    }
    else if (command.startsWith("/agset")){

        document.querySelector('#gcInput').value = "";

        agWindow.open();

    }
}

function chatSystemMessage(msg) {
    if (!gameChat.isShown()) return;
    gameChat.systemMessage(msg);
}

async function anisongDB(query){

    let json = {};
    json.and_logic = false;
    json.ignore_duplicate = false;
    json.opening_filter = true;
    json.ending_filter = true;
    json.insert_filter = true;
    json.artist_search_filter = {search: query, partial_match: false, group_granularity: 0, max_other_artist: 99};
    return fetch("https://anisongdb.com/api/search_request", {
        method: "POST",
        headers: {"Accept": "application/json", "Content-Type": "application/json"},
        body: JSON.stringify(json)
    }).then(res => (res.json())).then(json => {
        //console.log(json);
        artistSongList = json;
        processJson();
    });
}

function processJson(){
    console.log(artistSongList);

    if(!$("#quizPage").hasClass("hidden") && artistSongList.length != 0){

        processsettings();

        $("#quizPage").addClass("hidden");

        $("#gameArtist").removeClass("hidden");
    }
}

function processsettings(){

    settingFiltered = [];
    gameSettings.guessTime = $('#gaGuessTimeText').val();
    gameSettings.songNumber = $('#gaNumberSongText').val();
    gameSettings.minYear = $('#gaYearMinText').val();
    gameSettings.maxYear = $('#gaYearMaxText').val();
    gameSettings.minDiff = $('#gaDifficultyMinText').val();
    gameSettings.maxDiff = $('#gaDifficultyMaxText').val();

    artistSongList.forEach(obj => {
        if(gameSettings.op == true && obj.songType.startsWith("Opening")) settingFiltered.push(obj);
        else if (gameSettings.ed == true && obj.songType.startsWith("Ending")) settingFiltered.push(obj);
        else if (gameSettings.ins == true && obj.songType.startsWith("Insert")) settingFiltered.push(obj);       
    });

    settingFiltered = settingFiltered.filter(obj => obj.songDifficulty >= gameSettings.minDiff && obj.songDifficulty <= gameSettings.maxDiff);

    settingFiltered = settingFiltered.filter(obj => {
        if (obj.animeVintage) {
            let year = parseInt(obj.animeVintage.split(" ")[1]);
            return year >= gameSettings.minYear && year <= gameSettings.maxYear;
        }
        return false;
    });

    if(settingFiltered.length > gameSettings.songNumber){
        for(let i = 0; i < gameSettings.songNumber; i++){
            let randomIndex = Math.floor(Math.random() * settingFiltered.length);
            selectedAnime[i] = settingFiltered[randomIndex];
            settingFiltered.splice(randomIndex, 1);
        }
    }
    else{
        selectedAnime = shuffleArray(settingFiltered);
    }

    $('#gaCurrentSongCount').text("?");
    $('#gaTotalSongCount').text(selectedAnime.length);

    console.log(settingFiltered);
    console.log(gameSettings);
    console.log(selectedAnime);

    setTimeout(playMusic, 1000);

}

function playMusic() {

    $('#gaCurrentSongCount').text(currentSongIndex + 1);
    
    audio = new Audio();
    audio.src = selectedAnime[currentSongIndex].audio;
    audio.onloadedmetadata = function() {
        console.log(audio.duration);
        randomTime = Math.random() * (audio.duration - gameSettings.guessTime);
        audio.currentTime = randomTime;
        audio.play();
    
        songTime = setTimeout(function() {
            audio.currentTime = randomTime;
            displayInfo();
            processAnswer();
            currentSongIndex++;
            if (currentSongIndex >= selectedAnime.length) finished();
            setTimeout(function() {
                audio.pause();
                setTimeout(playMusic, 200);
            }, 5000);
        }, gameSettings.guessTime * 1000);
    };
}

function displayInfo(){
    $('#gaAnimeName').text(selectedAnime[currentSongIndex].animeJPName);
    $('#gaSongName').text(selectedAnime[currentSongIndex].songName);
    $('#gaSongArtist').text(selectedAnime[currentSongIndex].songArtist);
    $('#gaSongType').text(selectedAnime[currentSongIndex].songType);
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function gaSkipClicked(){
    clearTimeout(songTime);
    audio.currentTime = randomTime;
    displayInfo();
    processAnswer();
    currentSongIndex++;
    setTimeout(function() {
        audio.pause();
        setTimeout(playMusic, 200);
    }, 5000);
}

function processAnswer(){
    let inputText = document.getElementById("gaAnswerInput").value;
    if(inputText == selectedAnime[currentSongIndex].animeJPName || inputText == selectedAnime[currentSongIndex].animeJPName){
        point++;
        $('#gaScoreText').text(point);
    }
    document.getElementById("gaAnswerInput").value = "";
}

function finished(){
    document.querySelector('#gcInput').value = "";

    audio.pause();

    $("#gameArtist").addClass("hidden");
    $("#quizPage").removeClass("hidden");
}

new Listener("get all song names", (payload) => {
    setTimeout(function() {
        if(allAnimeNames.length == 0){
            allAnimeNames = payload.names;
            new AmqAwesomeplete(document.querySelector("#gaAnswerInput"), {list: allAnimeNames, minChars: 1, maxItems: 15});
        }
    }, 10);
}).bindListener();
