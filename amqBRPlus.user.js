// ==UserScript==
// @name         AMQ BR Plus
// @namespace    https://github.com/Mxyuki/AMQ-Scripts
// @version      1.7.3
// @description  Upgrade Battle Royal QOL
// @description  Alt + O to open the window or when in game click on the icon in the top right.
// @description  ----- Main Page : -----
// @description  Display all the animes you picked.
// @description  The search bar filter the anime you picked.
// @description  Clicking on Anime Name or ANN ID at the top Organize your picks.
// @description  Clicking on a Name will write it automatically into the answer box.
// @description  Clicking on an ANN ID will send you to the anime ANN Page.
// @description  Clicking on the "-" Next to the anime name will remove the anime from the picked list, and in picking phase will drop the anime.
// @description  Clicking on the Search icon on the right of the anime name will open an anisongdb search page for this anime.
// @description  Display button : when clicked toggle that when entering a new tile it display all items names (doesn't show datastore items).
// @description  Share button : when clicked upload your picked list as a json on litterbox and give you the link to it.
// @description  "/brpload https://litter.catbox.moe/XXXXXX.json" will add the animes of the litterbox page into your picked list.
// @description  "/brpclean" remove all the animes in your Picked List
// @description  Tile List button : Open the Tile List Page.
// @description  ----- Tile List Page : -----
// @description  When in Looting phase, display all the animes that are in your Tile (doesn't show datastore items), it change automatically at each time you change tile.
// @description  Clicking on Anime Name or ANN ID at the top Organize the Tile Animes.
// @description  Clicking on an Anime name, it will show you were it is in the Tile.
// @description  Clicking on an ANN ID will send you to the anime ANN Page.
// @description  The pages are resizable, and titles language adapt based on the one you have in settings.
// @author       Mxyuki
// @match        https://animemusicquiz.com/*
// @require      https://raw.githubusercontent.com/TheJoseph98/AMQ-Scripts/master/common/amqWindows.js
// @require      https://raw.githubusercontent.com/TheJoseph98/AMQ-Scripts/master/common/amqScriptInfo.js
// @downloadURL  https://github.com/Mxyuki/AMQ-Scripts/raw/main/amqBRPlus.user.js
// @updateURL    https://github.com/Mxyuki/AMQ-Scripts/raw/main/amqBRPlus.user.js
// ==/UserScript==

if (document.getElementById("startPage")) return;

let loadInterval = setInterval(() => {
    if (document.getElementById("loadingScreen").classList.contains("hidden")) {
        setup();
        clearInterval(loadInterval);
    }
}, 500);

let tileShow = [];
let pickedShow = [];

let isDisplayed = false;

let language;

let filteredAnimes = [];

let regex = /^https:\/\/litter\.catbox\.moe\/.+\.json$/;

let brpWindow;
let brpTileListWindow;
let brpAnisongdbWindow;

document.addEventListener('keydown', function(event) {
    if (event.altKey && event.code === 'KeyO') {

        if (brpWindow.isVisible()) {
            brpWindow.close();
        }
        else {
            brpWindow.open();
        }
    }
});

document.querySelector('#gcInput').addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
        processCommand(this.value);
    }
});

function displayPicked(){

    document.querySelectorAll('.brpPickedSong').forEach(function(brpPickedSong) {
        brpPickedSong.remove();
    });

    for (let i = 0; i < pickedShow.length; i++) {
        const brpTable = document.getElementById('brpTable');
        const tr = document.createElement('tr');
        tr.classList.add('brpPickedSong');
        tr.innerHTML = `<td class="brpPickedName"><i class="fa fa-minus brpRemove" aria-hidden="true"></i><p>${pickedShow[i].name}</p><i class="fa fa-search brpAnisongSearch" aria-hidden="true"></i></td><td class="brpPickedANNID" style="text-align: center;">${pickedShow[i].id}</td>`;
        brpTable.appendChild(tr);

        tr.querySelector('.brpRemove').addEventListener('click', function() {

            socket.sendCommand({
                type: "quiz",
                command: "drop entry",
                data: {
                    id: pickedShow[i].id
                }
            });

            pickedShow.forEach(function(show, index) {
                if (show.name === pickedShow[i].name) {
                    pickedShow.splice(index, 1);
                }
                displayPicked();
            });
        });

        tr.querySelector('.brpAnisongSearch').addEventListener('click', function() {
            brpAnisongdbWindow.open();
            getAnisongdbData(pickedShow[i].name);
        });

        tr.querySelector('p').addEventListener('click', function() {
            $("#qpAnswerInput").val(pickedShow[i].name);
            quiz.answerInput.submitAnswer(true);
        });

        tr.querySelector('.brpPickedANNID').addEventListener('click', function() {
            window.open(`https://www.animenewsnetwork.com/encyclopedia/anime.php?id=${pickedShow[i].id}`, '_blank');
        });
    }
}

function displayFiltered(){

    document.querySelectorAll('.brpPickedSong').forEach(function(brpPickedSong) {
        brpPickedSong.remove();
    });

    for (let i = 0; i < filteredAnimes.length; i++) {
        const brpTable = document.getElementById('brpTable');
        const tr = document.createElement('tr');
        tr.classList.add('brpPickedSong');
        tr.innerHTML = `<td class="brpPickedName"><i class="fa fa-minus brpRemove" aria-hidden="true"></i><p>${filteredAnimes[i].name}</p><i class="fa fa-search brpAnisongSearch" aria-hidden="true"></i></td><td class="brpPickedANNID" style="text-align: center;">${filteredAnimes[i].id}</td>`;
        brpTable.appendChild(tr);

        tr.querySelector('.brpRemove').addEventListener('click', function() {

            socket.sendCommand({
                type: "quiz",
                command: "drop entry",
                data: {
                    id: filteredAnimes[i].id
                }
            });

            filteredAnimes.forEach(function(show, index) {
                if (show.name === filteredAnimes[i].name) {
                    filteredAnimes.splice(index, 1);
                }
                displayPicked();
            });
        });

        tr.querySelector('.brpAnisongSearch').addEventListener('click', function() {
            brpAnisongdbWindow.open();
            getAnisongdbData(filteredAnimes[i].name);
        });

        tr.querySelector('p').addEventListener('click', function() {
            $("#qpAnswerInput").val(filteredAnimes[i].name);
            quiz.answerInput.submitAnswer(true);
        });

        tr.querySelector('.brpPickedANNID').addEventListener('click', function() {
            window.open(`https://www.animenewsnetwork.com/encyclopedia/anime.php?id=${filteredAnimes[i].id}`, '_blank');
        });
    }
}

function displayTile() {
    const brpTileSongs = document.querySelectorAll('.brpTileSong');
    brpTileSongs.forEach(function(brpTileSong) {
        brpTileSong.remove();
    });

    for (let i = 0; i < tileShow.length; i++) {
        const brpTable = document.getElementById('brpTileListTable');
        const tr = document.createElement('tr');
        tr.classList.add('brpTileSong');
        tr.innerHTML = `<td class="brpTileName">${tileShow[i].name}</td><td class="brpTileANNID" style="text-align: center;">${tileShow[i].id}</td>`;
        brpTable.appendChild(tr);
        tr.querySelector(".brpTileName").addEventListener("click", function() {
            findName(tileShow[i].name);
        });
        tr.querySelector(".brpTileANNID").addEventListener("click", function() {
            window.open(`https://www.animenewsnetwork.com/encyclopedia/anime.php?id=${tileShow[i].id}`);
        });
    }
}

function findName(name){

    document.querySelectorAll('.brShowEntry.brMapObject').forEach((element) => {
        element.dispatchEvent(new MouseEvent('mouseover'));
    });

    setTimeout(() => {
        let popovers = document.getElementsByClassName('popover');
        for (let i = 0; i < popovers.length; i++) {
            if (popovers[i].textContent === name) {
                let targetPopoverId = popovers[i].id;

                let elements = document.getElementsByClassName('brMapObject');
                for (let j = 0; j < elements.length; j++) {
                    if (elements[j].getAttribute('aria-describedby') !== targetPopoverId) {
                        elements[j].dispatchEvent(new MouseEvent('mouseout'));
                    }
                }
            }
        }
    }, 100);
}

function hideName(){

    document.querySelectorAll('.brShowEntry.brMapObject').forEach((element) => {
        element.dispatchEvent(new MouseEvent('mouseout'));
    });

}

function showName(){

    document.querySelectorAll('.brShowEntry.brMapObject').forEach((element) => {
        element.dispatchEvent(new MouseEvent('mouseover'));
    });

}

function sendChatMessage(message) {
    gameChat.$chatInputField.val(message);
    //gameChat.sendMessage();
}

function share(){

    if (pickedShow.length === 0) return;

    const file = new File([JSON.stringify(pickedShow)], "pickedShow.json", {type: "application/json"});

    const formData = new FormData();

    formData.append('fileToUpload', file);
    formData.append('reqtype', 'fileupload');
    formData.append('time', '1h');

    fetch('https://litterbox.catbox.moe/resources/internals/api.php', {
        method: 'POST',
        body: formData
    }).then((response) => {
        return response.text();
    }).then((data) => {
        sendChatMessage(data);
    });
}

function getArrayFromCatboxFile(link) {
    fetch(link)
      .then(response => response.json())
      .then(array => {
        for (let i = 0; i < array.length; i++) {
            pickedShow.push(array[i]);
        }
        displayPicked();
      })
      .catch(error => {
        console.error("Failed to retrieve array from Catbox file:", error);
      });
}

function processCommand(text){
    if (text.startsWith("/brpload")){

        document.querySelector('#gcInput').value = "";

        let link = text.split(" ")[1];
        if(regex.test(link)){
            getArrayFromCatboxFile(link);
        }
    }
    else if (text.startsWith("/brpclean")){

        document.querySelector('#gcInput').value = "";

        pickedShow = [];
        displayPicked();
    }
}

function toggleButton(showSelection){

    if(showSelection === undefined) return;

    if(showSelection == 2 && $('#qpBRPlus').hasClass('hidden')){
        let currentWidth = $("#qpOptionContainer").width();
        $("#qpOptionContainer").width(currentWidth + 35);
        $('#qpBRPlus').removeClass('hidden');
    }
    else if(showSelection != 2){
        let currentWidth = $("#qpOptionContainer").width();
        $("#qpOptionContainer").width(currentWidth - 35);
        $('#qpBRPlus').addClass('hidden');
    }

}

function getAnisongdbData(query) {
    brpAnisongdbWindow.panels[0].clear();
    brpAnisongdbWindow.panels[0].panel.append(`<p>loading...</p>`);
    let json = {};
    json.and_logic = false;
    json.ignore_duplicate = false;
    json.opening_filter = true;
    json.ending_filter = true;
    json.insert_filter = true;
    json.anime_search_filter = {search: query, partial_match: false};
    return fetch("https://anisongdb.com/api/search_request", {
        method: "POST",
        headers: {"Accept": "application/json", "Content-Type": "application/json"},
        body: JSON.stringify(json)
    }).then(res => (res.json())).then(json => {
        brpAnisongdbWindow.panels[0].clear();
        let $table = $(`
            <table id="brpAnisongdbTable" style="width: 95%; table-layout: fixed; margin: 0 auto; margin-top: 10px;">
                <tr class="brptbfirstRow">
                    <th class="brpAnime" style="border: 1px solid black;">Anime</th>
                    <th class="brpArtist" style="border: 1px solid black;">Artist</th>
                    <th class="brpSong" style="border: 1px solid black;">Song</th>
                    <th class="brpType" style="border: 1px solid black;">Type</th>
                    <th class="brpVintage" style="border: 1px solid black;">Vintage</th>
                </tr>
            </table>
        `);
        for (let result of json) {
            let $row = $(`
                <tr>
                    <td class="brptbAnime">${options.useRomajiNames ? result.animeJPName : result.animeENName}</td>
                    <td class="brptbArtist">${result.songArtist}</td>
                    <td class="brptbSong">${result.songName}</td>
                    <td>${shortenType(result.songType)}</td>
                    <td>${result.animeVintage}</td>
                </tr>
            `)
            $table.append($row);
        }
        brpAnisongdbWindow.panels[0].panel.append($table);
    });
}

function shortenType(type) {
    return type.replace("Opening ", "OP").replace("Ending ", "ED").replace("Insert Song", "IN");
}

function setup(){

    language = document.querySelector('#smShowName').value;

    let oldWidth = $("#qpOptionContainer").width();
    $("#qpOptionContainer").width(oldWidth + 35);

    $("#qpOptionContainer > div").append($(`<div id="qpBRPlus" class="clickAble qpOption"><i aria-hidden="true" class="fa fa-list-alt qpMenuItem" style="margin-right: 5px; width: 27px;"></i></div>`)
        .click(() => {
            if (brpWindow.isVisible()) {
                brpWindow.close();
            }
            else {
                brpWindow.open();
            }
        })
        .popover({
            content: "BR Plus",
            trigger: "hover",
            placement: "bottom"
        })
    );

    brpWindow = new AMQWindow({
        title: "BR Plus",
        width: 700,
        height: 450,
        minWidth: 440,
        minHeight: 250,
        zIndex: 999,
        draggable: true,
        resizable: true,
    });

    brpWindow.addPanel({
        width: 1.0,
        height: 40,
        position: {
            x: 0,
            y: 20
        },
        id: "brpOption"
    });

    brpWindow.addPanel({
        width: 1.0,
        height: "calc(100% - 75px)",
        position: {
            x: 0,
            y: 70
        },
        id: "brpPickedList"
    });

    brpWindow.panels[0].panel.append(

        $(`<input type="text" id="brpSearch" class="brpLeft brpTextBox brpOptionPanel" placeholder="Search Anime"></input>`),

        $(`<button class="btn btn-primary brpRight brpButton">Display</button>`).click(function () {
            isDisplayed = !isDisplayed
            isDisplayed ? showName() : hideName();
        }),
        $(`<button class="btn btn-primary brpRight brpButton">Share</button>`).click(function () {
            share();
        }),
        $(`<button class="btn btn-primary brpRight brpButton">Tile List</button>`).click(function () {
            if (brpTileListWindow.isVisible()) {
                brpTileListWindow.close();
            }
            else {
                brpTileListWindow.open();
            }
        })

    );

    brpWindow.panels[1].panel.append(

        $(`
            <table id="brpTable">
                <tr id="brpTableTop">
                    <th id="brpTableName">Anime Name</th>
                    <th id="brpTableANN">ANN ID</th>
                </tr>
            </table>
        `),
    );


    brpTileListWindow = new AMQWindow({
        title: "Tile List",
        width: 500,
        height: 350,
        minWidth: 440,
        minHeight: 250,
        zIndex: 1000,
        draggable: true,
        resizable: true,
    });

    brpTileListWindow.addPanel({
        width: 1.0,
        height: "calc(100% - 25px)",
        position: {
            x: 0,
            y: 20
        },
        id: "brpTileList"
    });

    brpTileListWindow.panels[0].panel.append(
        $(`
            <table id="brpTileListTable">
                <tr id="brpTileListTableTop">
                    <th id="brpTileListTableName">Anime Name</th>
                    <th id="brpTileListTableANN">ANN ID</th>
                </tr>
            </table>
        `),
    );

    brpAnisongdbWindow = new AMQWindow({
        id: "brpAnisongdbWindow",
        title: "AnisongDB Search",
        width: 450,
        height: 250,
        minWidth: 450,
        minHeight: 250,
        zIndex: 1100,
        resizable: true,
        draggable: true
    });
    brpAnisongdbWindow.addPanel({
        id: "brpAnisongdbPanel",
        width: 1.0,
        height: "100%",
        scrollable: {x: false, y: true}
    });

    document.getElementById("brpPickedList").style.overflow = "auto";
    document.getElementById("brpTileList").style.overflow = "auto";

    let searchInput = document.getElementById("brpSearch");

    searchInput.addEventListener("input", function() {
        let searchTerm = searchInput.value.toLowerCase();

        filteredAnimes = pickedShow.filter(function(anime) {
            return anime.name.toLowerCase().indexOf(searchTerm) !== -1;
        });
        displayFiltered()
    });

    document.getElementById('brpTableName').addEventListener('click', function() {
        pickedShow.sort((a, b) => a.name.localeCompare(b.name));
        displayPicked();
    });

    document.getElementById('brpTableANN').addEventListener('click', function() {
        pickedShow.sort((a, b) => a.id - b.id);
        displayPicked();
    });


    document.getElementById('brpTileListTableName').addEventListener('click', function() {
        tileShow.sort((a, b) => a.name.localeCompare(b.name));
        displayTile();
    });

    document.getElementById('brpTileListTableANN').addEventListener('click', function() {
        tileShow.sort((a, b) => a.id - b.id);
        displayTile();
    });

    AMQ_addStyle(`
        // Option Panel
        .brpButton {
            width: 75px;
            height: 40px;
            font-size: 15px;
        }
        .brpLeft {
            margin-left: 10px;
        }
        .brpRight {
            float: right;
            margin-right: 10px;
            background-color: #8d8cdd;
            border-color: #4d366a;
        }
        .brpRight:hover {
            background-color: #7C7CC1;
            border-color: #4d366a;
            box-shadow: none;
        }
        .brpOptionPanel {
            margin-top: 10px;
        }
        #brpSearch {
            color: #000;
        }
        // Picked Anime List
        #brpPickedList {
            width: 100%;
            height: 100px;
            position: absolute;
            left: 0%;
            top: 70px;
            overflow: scroll;
        }
        #brpTable {
            width: 95%;
            table-layout: fixed;
            margin: 0 auto;
        }
        #brpTable th {
            border: 1px solid black;
            text-align: center;
            background-color: #212121;
            color: white;
        }
        #brpTableName {
            width: 85%;
            margin-left: 10px;
        }
        #brpTableANN {
            width: 15%;
        }
        #brpPickedList::-webkit-scrollbar {
            width: 12px;
            background-color: rgba(0,0,0,0);
        }
        #brpPickedList::-webkit-scrollbar-thumb {
            background-color: #212121;
            border-radius: 12px;
        }
        .brpPickedSong:nth-child(even) {
            background-color: #313131;
        }
        .brpPickedName {
            padding-left: 10px;
            font-size: 15.23px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-direction: row;
        }
        .brpPickedName p {
            margin: 0;
            margin-right: auto;
        }
        .brpPickedANNID {
            font-size: 15.23px;
        }
        #brpTableName, #brpTableANN {
            font-size: 16px;
        }
        #brpTableName:hover {
            cursor: pointer;
        }
        #brpTableANN:hover {
            cursor: pointer;
        }
        .brpRemove {
            margin-right: 10px;
            margin-top: 3.5px;
        }
        .brpAnisongSearch {
            margin-left: 10px;
            margin-right: 10px;
        }


        // Tile List
        #brpTileList {
            width: 100%;
            height: 100px;
            position: absolute;
            left: 0%;
            top: 70px;
            overflow: scroll;
        }
        #brpTileListTable {
            width: 95%;
            table-layout: fixed;
            margin: 0 auto;
        }
        #brpTileListTable th {
            border: 1px solid black;
            text-align: center;
            background-color: #212121;
            color: white;
        }
        #brpTileListTableName {
            width: 85%;
            margin-left: 10px;
        }
        #brpTileListTableANN {
            width: 15%;
        }
        #brpTileList::-webkit-scrollbar {
            width: 12px;
            background-color: rgba(0,0,0,0);
        }
        #brpTileList::-webkit-scrollbar-thumb {
            background-color: #212121;
            border-radius: 12px;
        }
        .brpTileSong:nth-child(even) {
            background-color: #313131;
        }
        .brpTileName {
            padding-left: 10px;
            font-size: 15.23px;
        }
        .brpTileANNID {
            font-size: 15.23px;
        }
        #brpTileListTableName, #brpTileListTableANN {
            font-size: 16px;
        }
        #brpTileListTableName:hover, #brpTileListTableANN:hover, .brpTileSong:hover, .brpPickedName:hover, .brpPickedANNID:hover {
            cursor: pointer;
        }

        // Anisong Window

        #brpAnisongdbTable {
            width: 100%;
        }
        #brpAnisongdbTable th {
            font-weight: bold;
        }
        #brpAnisongdbTable th.brpAnime {
            width: 25%;
        }
        #barpAnisongdbTable th.brpArtist {
            width: 25%;
        }
        #brpAnisongdbTable th.brpSong {
            width: 25%;
        }
        #brpAnisongdbTable th.brpType {
            width: 10%;
        }
        #brpAnisongdbTable th.brpVintage {
            width: 15%;
        }
        #brpAnisongdbTable tr:nth-child(even) {
            background-color: #313131;
        }
        .brptbfirstRow {
            background-color: #212121;
            padding: 10px;
        }
        #brpAnisongdbPanel::-webkit-scrollbar {
            width: 12px;
            background-color: rgba(0,0,0,0);
        }
        #brpAnisongdbPanel::-webkit-scrollbar-thumb {
            background-color: #212121;
            border-radius: 12px;
        }
    `);

}

new Listener("new collected name entry", (payload) => {
    if(language == 0){
        if(payload.eng){
            pickedShow.push({id: payload.id, name: payload.eng});
        }
        else if(payload.jap){
            pickedShow.push({id: payload.id, name: payload.jap});
        }
    }
    else{
        if(payload.jap){
            pickedShow.push({id: payload.id, name: payload.jap});
        }
        else if(payload.eng){
            pickedShow.push({id: payload.id, name: payload.eng});
        }
    }
    displayPicked();
}).bindListener();

new Listener("drop name entry", (payload) => {
    pickedShow = pickedShow.filter(anime => anime.id !== payload.id);
    displayPicked();
}).bindListener();

new Listener("Game Starting", (payload) =>{
    pickedShow = [];
    const brpPickedSongs = document.querySelectorAll('.brpPickedSong');
    brpPickedSongs.forEach(function(brpPickedSong) {
        brpPickedSong.remove();
    });
}).bindListener();

new Listener("battle royal spawn", (payload) => {

    tileShow = [];

    setTimeout(function() {
        isDisplayed ? showName() : hideName();
    }, 100);

    payload.objects.forEach((object) => {
        if (object.info.type == "NameEntry") {
            if(language == 0){
                if (object.info.eng) {
                    tileShow.push({ id: object.info.id, name: object.info.eng });
                } else {
                    tileShow.push({ id: object.info.id, name: object.info.jap });
                }
            }
            else{
                if (object.info.jap) {
                    tileShow.push({ id: object.info.id, name: object.info.jap });
                } else {
                    tileShow.push({ id: object.info.id, name: object.info.eng });
                }
            }
        }
        displayTile();
    });

}).bindListener();

new Listener("Host Game", (payload) => {
    setTimeout(function() {
        toggleButton(payload.settings.showSelection);
    }, 100);
}).bindListener();

new Listener("Room Settings Changed", (payload) => {
    setTimeout(function() {
        toggleButton(payload.showSelection);
    }, 100);
}).bindListener();

new Listener("Join Game", (payload) => {
    setTimeout(function() {
        toggleButton(payload.settings.showSelection);
    }, 100);
}).bindListener();

new Listener("Spectate Game", (payload) => {
    setTimeout(function() {
        toggleButton(payload.settings.showSelection);
    }, 100);
}).bindListener();
