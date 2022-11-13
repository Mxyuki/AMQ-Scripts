// ==UserScript==
// @name         AMQ Favorite Friends
// @namespace    https://github.com/Mxyuki/AMQ-Scripts
// @namespace    https://github.com/kempanator/amq-scripts
// @version      0.8
// @description  If you want to add favorite friend to get notified about what they do on amq
// @author       Mxyuki & kempanator
// @match        https://animemusicquiz.com/
// @require      https://raw.githubusercontent.com/TheJoseph98/AMQ-Scripts/master/common/amqScriptInfo.js
// ==/UserScript==

if (document.getElementById('startPage')) {
    return;
}

let favoriteFriends = 0;
let favoriteList = [];


// Add Favorite Button and page

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
                                <p>(The name must contain the LowerCase and upperCase at the same place in the name)</p>
                                <ul id="listOfFavorite"></ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `));


$("#optionsContainer > ul").prepend($(`
            <li class="clickAble" data-toggle="modal" data-target="#friendFavorite">Favorite</li>
        `));


// Add the info about the script

AMQ_addScriptData({
        name: "Favorite Friends",
        author: "Mxyuki & kempanator",
        description: `
            <p>This script is made to put your favorite friends at the top of the friend list and highlight them</p>
            <p>--- How to use ---</p>
            <p>Click at the gear at the bottom right of your screen</p>
            <img src="https://i.imgur.com/MdrC5Pu.png" />
            <p>Then Click the Favorite button</p>
            <p>Now just write the name of your friend in the text box and click Add to add him or Remove to remove him</p>
            <p>the player must already be in your friends otherwise it won't show him</p>
            <br>
            <p>When adding a friend that is already online just refresh the page to update him then your friendlist will look like this</p>
            <img src="https://i.imgur.com/YhrzSjN.png" />
        `

    });


// Load saved Favorite Friends list

let saveFavoriteFriends = localStorage.getItem("favoriteFriends");

let saveFavoriteList = JSON.parse(localStorage.getItem('favoriteList'));

favoriteFriends = saveFavoriteFriends;

favoriteList = saveFavoriteList;

if(favoriteFriends==undefined) favoriteFriends = 0;
if(favoriteList==undefined) favoriteList = [];


// Put color ro Favorite Friends

let update = new Listener("online player count change", (payload) => {

        for (let li of document.querySelectorAll("#friendOnlineList li")) {
            let name = li.querySelector("h4").innerText;
            if (favoriteList.includes(name)) {
                li.querySelector("h4").style.color = "#fad681";
    }
}
});
update.bindListener();


// List all Favorite Friends

const ul = document.getElementById('listOfFavorite');

    ul.innerText = "";

    for (let friend of favoriteList) {
    const li = document.createElement("li");
        li.innerText = friend;
        ul.appendChild(li);
    }


// When Add button pressed Add the new Favorite Friend

document.getElementById('favoriteAdd').addEventListener('click', function handleClick() {
    var textBoxValue = document.getElementById("favoriteTextBox").value;
    console.log("test");
    if(textBoxValue != ""){
        favoriteList[favoriteFriends] = textBoxValue;
        favoriteFriends++;

        saveSettings();
    }

    const ul = document.getElementById('listOfFavorite');

    ul.innerText = "";

    for (let friend of favoriteList) {
    const li = document.createElement("li");
        li.innerText = friend;
        ul.appendChild(li);
    }

});


// When Remove button pressed remove friend from Favorite

document.getElementById('favoriteRemove').addEventListener('click', function handleClick() {
    var textBoxValue = document.getElementById("favoriteTextBox").value;
    if(textBoxValue != ""){

        for (var j = 1; j <= favoriteList.length; j++) {

            if(favoriteList[j] == textBoxValue) favoriteList[j] = "";
            console.log(j);

        }
        saveSettings();
    }

    const ul = document.getElementById('listOfFavorite');

    ul.innerText = "";

    for (let friend of favoriteList) {
        const li = document.createElement("li");
        li.innerText = friend;
        ul.appendChild(li);
    }

});


// Put favorite friends to the top of your Friend List

SocialTab.prototype.updateFriendList = function (friendMap, type, $list) {
    let sortedFriends = Object.values(friendMap).sort((a, b) => a.name.localeCompare(b.name));
    if (type === "online") {
        let tempFriends = [];
        let tempFavoriteFriends = [];
        sortedFriends.forEach((entry) => {
            if (favoriteList.includes(entry.name)) {
                tempFavoriteFriends.push(entry);
            }
            else {
                tempFriends.push(entry);
            }
        });
        sortedFriends = tempFavoriteFriends.concat(tempFriends);
    }
    sortedFriends.forEach((entry, index) => {
        if (entry.inList !== type) {
            entry.inList = type;
            if (index === 0) {
                $list.prepend(entry.$html);
            } else {
                entry.$html.insertAfter(sortedFriends[index - 1].$html);
            }
            entry.updateTextSize();
        }
    });
    sortedFriends.forEach(entry => {
        entry.checkLazyLoad();
    });
};


// When favorite friend join

let commandListener = new Listener("friend state change", (friend) => {
    if (friend.online && favoriteList.includes(friend.name)) {
        popoutMessages.displayStandardMessage("",friend.name+" is online");

    }

    else if (favoriteList.includes(friend.name)) {
        console.log(friend.online);
        popoutMessages.displayStandardMessage("",friend.name+" is offline");
    }
});
commandListener.bindListener();


// Save Favorite Friends list

function saveSettings() {
	localStorage.setItem("favoriteList", JSON.stringify(favoriteList));
    localStorage.setItem("favoriteFriends", JSON.stringify(favoriteFriends));
}
