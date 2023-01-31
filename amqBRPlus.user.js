// ==UserScript==
// @name         AMQ BR Plus
// @namespace    https://github.com/Mxyuki/AMQ-Scripts
// @version      1.0
// @description  Upgrade Battle Royal QOL
// @description  Alt + O to open the window or when in game click on the icon in the top right.
// @description  ----- Main Page : -----
// @description  Display all the animes you picked.
// @description  The search bar filter the anime you picked.
// @description  Clicking on Anime Name or ANN ID at the top Organize your picks.
// @description  Clicking on a Name will write it automatically into the answer box.
// @description  Clicking on an ANN ID will send you to the anime ANN Page.
// @description  Display button : when clicked in the looting page, will show every item names (doesn't show datastore items).
// @description  Hide  button : does the oposite of Display button and hide every shown item names.
// @description  Tile List button : Open the Tile List Page.
// @description  ----- Tile List Page : -----
// @description  When in Looting phase, display all the animes that are in your Tile (doesn't show datastore items), it change automatically at each time you change tile.
// @description  Clicking on Anime Name or ANN ID at the top Organize the Tile Animes.
// @description  Clicking on an Anime name, it will show you were it is in the Tile.
// @description  Clicking on an ANN ID will send you to the anime ANN Page.
// @description  The pages are resizable.
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


let filteredAnimes = [];

let brpWindow;
let brpTileListWindow;

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

function displayPicked(){

    const brpPickedSongs = document.querySelectorAll('.brpPickedSong');
    brpPickedSongs.forEach(function(brpPickedSong) {
        brpPickedSong.remove();
    });

    for (let i = 0; i < pickedShow.length; i++) {
        const brpTable = document.getElementById('brpTable');
        const tr = document.createElement('tr');
        tr.classList.add('brpPickedSong');
        tr.innerHTML = `<td class="brpPickedName">${pickedShow[i].name}</td><td class="brpPickedANNID" style="text-align: center;">${pickedShow[i].id}</td>`;
        brpTable.appendChild(tr);

        const brpPickedName = tr.querySelector('.brpPickedName');
        brpPickedName.addEventListener('click', function() {
            $("#qpAnswerInput").val(pickedShow[i].name);
            quiz.answerInput.submitAnswer(true);
        });

        const brpPickedANNID = tr.querySelector('.brpPickedANNID');
        brpPickedANNID.addEventListener('click', function() {
            window.open(`https://www.animenewsnetwork.com/encyclopedia/anime.php?id=${pickedShow[i].id}`, '_blank');
        });
    }
}

function displayFiltered(){

    const brpPickedSongs = document.querySelectorAll('.brpPickedSong');
    brpPickedSongs.forEach(function(brpPickedSong) {
        brpPickedSong.remove();
    });

    for (let i = 0; i < pickedShow.length; i++) {
        const brpTable = document.getElementById('brpTable');
        const tr = document.createElement('tr');
        tr.classList.add('brpPickedSong');
        tr.innerHTML = `<td class="brpPickedName">${pickedShow[i].name}</td><td class="brpPickedANNID" style="text-align: center;">${pickedShow[i].id}</td>`;
        brpTable.appendChild(tr);

        const brpPickedName = tr.querySelector('.brpPickedName');
        brpPickedName.addEventListener('click', function() {
            $("#qpAnswerInput").val(pickedShow[i].name);
            quiz.answerInput.submitAnswer(true);
        });

        const brpPickedANNID = tr.querySelector('.brpPickedANNID');
        brpPickedANNID.addEventListener('click', function() {
            window.open(`https://www.animenewsnetwork.com/encyclopedia/anime.php?id=${pickedShow[i].id}`, '_blank');
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

    console.log(name);

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

function setup(){

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

        $(`<button class="btn btn-primary brpRight brpButton">Hide</button>`).click(function () {
            hideName();
        }),
        $(`<button class="btn btn-primary brpRight brpButton">Display</button>`).click(function () {
            showName();
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

    const brpOption = document.getElementById("brpPickedList");
    brpOption.style.overflow = "auto";

    const brpTileOption = document.getElementById("brpTileList");
    brpTileOption.style.overflow = "auto";

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

    `);

}

new Listener("new collected name entry", (payload) => {
    if(payload.jap){
        pickedShow.push({id: payload.id, name: payload.jap});
    }
    else if(payload.eng){
        pickedShow.push({id: payload.id, name: payload.eng});
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

    payload.objects.forEach((object) => {
        if (object.info.type == "NameEntry") {
            if (object.info.jap) {
                tileShow.push({ id: object.info.id, name: object.info.jap });
            } else {
                tileShow.push({ id: object.info.id, name: object.info.eng });
            }
        }
        displayTile();
    });
}).bindListener();
