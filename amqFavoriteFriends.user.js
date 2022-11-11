// ==UserScript==
// @name         AMQ Favorite Friends
// @namespace    https://github.com/Mxyuki/AMQ-Scripts
// @version      0.1
// @description  If you want to add favorite friend to get notified about what they do on amq
// @author       Mxyuki
// @match        https://animemusicquiz.com/
// ==/UserScript==

if (document.getElementById('startPage')) {
    return;
}

let favoriteFriends = 0;
let favoriteList = [];

$("#gameContainer").append($(`
            <div class="modal fade" id="friendFavorite" tabindex="-1" role="dialog">
                <div class="modal-dialog" role="document">
                    <div class="modal-content">
                        <div class="modal-header">
                            <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                                <span aria-hidden="true">×</span>
                            </button>
                            <h2 class="modal-title">Favorite Friends</h2>
                        </div>
                        <div class="modal-body" style="overflow-y: auto;max-height: calc(100vh - 150px);">
                            <div id="addFavorite">
                            <input id="favoriteTextBox" type="text" placeholder="Add Favorite">
                            <button id="favoriteAdd" class="btn btn-primary">Add</button>
                            <button id="favoriteRemove" class="btn btn-primary">Remove</button>
                                Ceci est un test de text

                                <ul id="wowTest"></ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `));


$("#optionsContainer > ul").prepend($(`
            <li class="clickAble" data-toggle="modal" data-target="#friendFavorite">Favorite</li>
        `));

//loadSettings();

let saveFavoriteFriends = localStorage.getItem("favoriteFriends");

let saveFavoriteList = JSON.parse(localStorage.getItem('favoriteList')); //localStorage.getItem("favoriteList");

favoriteFriends = saveFavoriteFriends;

favoriteList = saveFavoriteList;

const ul = document.getElementById('wowTest');

    ul.innerHTML = "";

    for (var i = 1; i+1 <= favoriteList.length; i++) {
    const li = document.createElement("li");
        li.innerHTML = favoriteList[i];
        ul.appendChild(li);
    }

document.getElementById('favoriteAdd').addEventListener('click', function handleClick() {
    var textBoxValue = document.getElementById("favoriteTextBox").value;
    if(textBoxValue != ""){
        favoriteFriends++;
        favoriteList[favoriteFriends] = textBoxValue;

        saveSettings();
    }

    const ul = document.getElementById('wowTest');

    ul.innerHTML = "";

    for (var i = 1; i+1 <= favoriteList.length; i++) {
    const li = document.createElement("li");
        li.innerHTML = favoriteList[i];
        ul.appendChild(li);
    }

});


function saveSettings() {
	localStorage.setItem("favoriteList", JSON.stringify(favoriteList));
    localStorage.setItem("favoriteFriends", JSON.stringify(favoriteFriends));
}

/*function loadSettings() {
// load settings, if nothing is loaded, use default settings
	let saveFavoriteFriends = localStorage.getItem("favoriteFriends");

    let saveFavoriteList = localStorage.getItem("favoriteList");
}*/
