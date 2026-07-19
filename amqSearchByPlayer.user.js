// ==UserScript==
// @name         AMQ Search By Player
// @namespace    https://github.com/yourname
// @version      0.1
// @description  Make the room browser search bar also match players inside the room, not just the host.
// @author       Myuki
// @match        https://*.animemusicquiz.com/*
// @downloadURL  https://github.com/Mxyuki/AMQ-Scripts/raw/main/amqSearchByPlayer.user.js
// @updateURL    https://github.com/Mxyuki/AMQ-Scripts/raw/main/amqSearchByPlayer.user.js
// @grant        none
// ==/UserScript==

"use strict";

const asbpInterval = setInterval(() => {
    if (document.querySelector("#loadingScreen.hidden")) {
        clearInterval(asbpInterval);
        setup();
    }
}, 500);

function setup() {
    if (typeof RoomFilter === "undefined") {
        console.warn("[AMQ Search By Player] RoomFilter not found, script not applied");
        return;
    }

    const originalTestRoom = RoomFilter.prototype.testRoom;

    RoomFilter.prototype.testRoom = function (room) {
        const $input = this.$FILTER_SEARCH_INPUT;
        const searchValue = $input.val();

        if (searchValue && room._players) {
            const regex = new RegExp(escapeRegExp(searchValue), "i");
            const playerMatch = [...room._players].some((name) => regex.test(name));

            if (playerMatch) {
                $input.val(room.host);
                const result = originalTestRoom.call(this, room);
                $input.val(searchValue);
                return result;
            }
        }

        return originalTestRoom.call(this, room);
    };

    // re-run the filter immediately so the patch takes effect right away
    if (typeof roomBrowser !== "undefined" && roomBrowser.applyTileFilter) {
        roomBrowser.applyTileFilter();
    }
}
