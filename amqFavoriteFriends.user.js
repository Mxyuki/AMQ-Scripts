// ==UserScript==
// @name         AMQ Favorite Friends
// @namespace    https://github.com/Mxyuki/AMQ-Scripts
// @namespace    https://github.com/kempanator/amq-scripts
// @version      1.3
// @description  If you want to add favorite friend to get notified about what they do on amq
// @author       Mxyuki & kempanator
// @match        https://animemusicquiz.com/
// @require      https://raw.githubusercontent.com/TheJoseph98/AMQ-Scripts/master/common/amqScriptInfo.js
// @downloadURL  https://github.com/Mxyuki/AMQ-Scripts/raw/main/amqFavoriteFriends.user.js
// @updateURL    https://github.com/Mxyuki/AMQ-Scripts/raw/main/amqFavoriteFriends.user.js
// ==/UserScript==

if (document.getElementById("startPage")) return;

let loadInterval = setInterval(() => {
    if (document.getElementById("loadingScreen").classList.contains("hidden")) {
        setup();
        clearInterval(loadInterval);
    }
}, 500);

let favoriteList = JSON.parse(localStorage.getItem("favoriteList")) || [];


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
                        <p>(The name must contain the LowerCase and UpperCase at the same place in the name)</p>
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
        <img src="https://i.imgur.com/MdrC5Pu.png">
        <p>Then click the favorite button</p>
        <p>Now just write the name of your friend in the text box and click Add to add him or Remove to remove him</p>
        <p>the player must already be in your friends otherwise it won't show him</p>
        <img src="https://i.imgur.com/YhrzSjN.png">
    `
});

AMQ_addStyle(`
    #friendOnlineList li.favoriteFriend h4 {
        color: #fad681;
    }
    #friendOfflineList li.favoriteFriend h4 {
        color: #ccad63;
    }
`);



// Put color to Favorite Friends

function setup() {
    for (let li of document.querySelectorAll("#friendOnlineList li, #friendOfflineList li")) {
        if (favoriteList.includes(li.querySelector("h4").innerText)) {
            li.classList.add("favoriteFriend");
        }
    }
}


// List all Favorite Friends

favoriteList.forEach((friend) => $("#listOfFavorite").append($(`<li>${friend}</li>`)));


// When Add/Remove button pressed

$("#favoriteAdd").click(() => {
    let name = $("#favoriteTextBox").val();
    if (name !== "" && !favoriteList.includes(name) && getAllFriends().includes(name)) {
        favoriteList.push(name);
        updateList();
        setup();
    }
});

$("#favoriteRemove").click(() => {
    let name = $("#favoriteTextBox").val();
    if (name !== "") {
        favoriteList = favoriteList.filter((item) => item !== name);
        updateList();
    }
});


function updateList() {
    favoriteList.sort((a, b) => a.localeCompare(b));
    $("#listOfFavorite").empty();
    favoriteList.forEach((friend) => $("#listOfFavorite").append($(`<li>${friend}</li>`)));
    localStorage.setItem("favoriteList", JSON.stringify(favoriteList));
    for (let li of document.querySelectorAll("#friendOnlineList li, #friendOfflineList li")) {
        if (favoriteList.includes(li.querySelector("h4").innerText)) {
            li.classList.add("favoriteFriend");
        }
        else {
            li.classList.remove("favoriteFriend");
        }
    }
    socialTab.updateFriendList(socialTab.onlineFriends, "online", socialTab.$onlineFriendList);
    socialTab.updateFriendList(socialTab.offlineFriends, "offline", socialTab.$offlineFriendList);
}

function getAllFriends() {
    return Object.keys(socialTab.onlineFriends).concat(Object.keys(socialTab.offlineFriends));
}


// Put favorite friends to the top of your Friend List

SocialTab.prototype.updateFriendList = function (friendMap, type, $list) {
    let sortedFriends = Object.values(friendMap).sort((a, b) => a.name.localeCompare(b.name));
    if (type === "online" || type === "offline") {
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
        entry.inList = type;
        if (index === 0) {
            $list.prepend(entry.$html);
        } else {
            entry.$html.insertAfter(sortedFriends[index - 1].$html);
        }
        entry.updateTextSize();
    });
    sortedFriends.forEach(entry => {
        entry.checkLazyLoad();
    });
};


// When favorite friend join

new Listener("friend state change", (payload) => {
    if (favoriteList.includes(payload.name)) {
        popoutMessages.displayStandardMessage("", `${payload.name} is ${payload.online ? "online" : "offline"}`);
    }
}).bindListener();
