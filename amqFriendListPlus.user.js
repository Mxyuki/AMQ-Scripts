// ==UserScript==
// @name         AMQ Friend List Plus
// @namespace    https://github.com/Mxyuki/AMQ-Scripts
// @version      1.2
// @description  Update the Friends List to provide more information and make friend interactions more accessible.
// @author       Myuki
// @match        https://animemusicquiz.com/*
// @downloadURL  https://github.com/Mxyuki/AMQ-Scripts/raw/main/amqFriendListPlus.user.js
// @updateURL	 https://github.com/Mxyuki/AMQ-Scripts/raw/main/amqFriendListPlus.user.js
// ==/UserScript==

(function () {
    "use strict";

    if (typeof Listener === "undefined") return;

    const loadInterval = setInterval(() => {
        if (document.querySelector("#loadingScreen.hidden")) {
            clearInterval(loadInterval);
            setup();
        }
    }, 500);

    // closeView without the "remove roombrowser listners" socket command
    RoomBrowser.prototype.closeView = function () {
        this.$view.addClass("hidden");
        roomFilter.reset();
        //Remove all listnters
        this._roomListner.unbindListener();
        //Remove all tiles
        Object.values(this.activeRooms).forEach((room) => {
            room.delete();
        });
        this.nexusRoomBrowser.reset();
        this.nexusRoomBrowser.stopListening();
        this.updateNumberOfRoomsText();
    };

    const SOCIAL_TAB_SIZE_STORAGE_KEY = "amqFriendListPlus.socialTabSize";

    const clampSocialTabSize = (width = 400, height = 550) => {
        const $socialTab = $("#socialTab");
        const tabBottom = parseFloat($socialTab.css("bottom")) || 45;
        const minWidth = 260;
        const minHeight = 220;
        const maxWidth = Math.max(minWidth, window.innerWidth - 30);
        const maxHeight = Math.max(minHeight, window.innerHeight - tabBottom - 12);

        return {
            width: Math.min(Math.max(Number(width) || 400, minWidth), maxWidth),
            height: Math.min(Math.max(Number(height) || 550, minHeight), maxHeight),
        };
    };

    const saveSocialTabSize = () => {
        const $socialTab = $("#socialTab");
        if (!$socialTab.length) return;

        const size = clampSocialTabSize(
            $socialTab.outerWidth() || 400,
            $socialTab.outerHeight() || 550,
        );

        try {
            localStorage.setItem(SOCIAL_TAB_SIZE_STORAGE_KEY, JSON.stringify(size));
        } catch (err) {
            // Ignore storage failures.
        }
    };

    const restoreSocialTabSize = () => {
        const $socialTab = $("#socialTab");
        if (!$socialTab.length) return;

        let saved = { width: 400, height: 550 };
        try {
            const raw = localStorage.getItem(SOCIAL_TAB_SIZE_STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed === "object") {
                    saved = {
                        width: Number(parsed.width) || 400,
                        height: Number(parsed.height) || 550,
                    };
                }
            }
        } catch (err) {
            saved = { width: 400, height: 550 };
        }

        const clamped = clampSocialTabSize(saved.width, saved.height);
        $socialTab.css({
            width: `${clamped.width}px`,
            height: `${clamped.height}px`,
        });
    };

    const setupSocialTabResizeHandle = () => {
        const $socialTab = $("#socialTab");
        if (!$socialTab.length) return;

        if ($socialTab.find(".amqFriendPlusResizeHandle").length) return;

        const $handle = $("<div>", {
            class: "amqFriendPlusResizeHandle",
            title: "Resize friends list",
            attr: { "aria-label": "Resize social tab" },
        });

        $handle.on("mousedown", (event) => {
            if (event.button !== 0) return;

            const startY = event.clientY;
            const startHeight = $socialTab.outerHeight() || 550;
            const tabBottom = parseFloat($socialTab.css("bottom")) || 45;
            const minHeight = 220;
            const maxHeight = Math.max(minHeight, window.innerHeight - tabBottom - 12);

            const handleMouseMove = (moveEvent) => {
                const deltaY = startY - moveEvent.clientY;
                const nextHeight = Math.min(Math.max(startHeight + deltaY, minHeight), maxHeight);
                $socialTab.css({ height: `${nextHeight}px` });
                saveSocialTabSize();
            };

            const handleMouseUp = () => {
                $(window).off("mousemove.amqFriendPlusResize");
                $(window).off("mouseup.amqFriendPlusResize");
                saveSocialTabSize();
            };

            $(window).on("mousemove.amqFriendPlusResize", handleMouseMove);
            $(window).on("mouseup.amqFriendPlusResize", handleMouseUp);
            event.preventDefault();
        });

        $socialTab.append($handle);
    };

    const ensureSocialTabSize = () => {
        const $socialTab = $("#socialTab");
        if (!$socialTab.length) return;

        restoreSocialTabSize();

        const $friendList = $("#friendlist");
        if ($friendList.length) {
            $friendList.css({
                width: "100%",
                height: "100%",
                overflow: "auto",
            });
        }

        const $allUserList = $("#allUserList");
        if ($allUserList.length) {
            const $searchWrap = $allUserList.find(".amqFriendPlusAllUsersSearchWrap");
            if (!$searchWrap.length) {
                const $newSearchWrap = $("<div>", { class: "amqFriendPlusAllUsersSearchWrap" });
                const $searchInput = $("<input>", {
                    type: "text",
                    class: "amqFriendPlusAllUsersSearchInput",
                    placeholder: "Search players...",
                    value: allUsersSearch,
                });
                $searchInput.on("input", (event) => {
                    allUsersSearch = $(event.currentTarget).val() || "";
                    applyAllUsersSearchFilter();
                });
                $newSearchWrap.append($searchInput);
                const $list = $allUserList.find("ul").first();
                if ($list.length) {
                    $list.before($newSearchWrap);
                } else {
                    $allUserList.prepend($newSearchWrap);
                }
            }

            const $input = $allUserList.find(".amqFriendPlusAllUsersSearchInput");
            if ($input.length) {
                $input.val(allUsersSearch);
            }
        }

        setupSocialTabResizeHandle();
    };

    const addFriendListStyles = () => {
        if (document.getElementById("amqFriendListPlusStyles")) return;

        const style = document.createElement("style");
        style.id = "amqFriendListPlusStyles";
        style.textContent = `
            #socialTab {
                overflow: hidden;
            }
            #socialTabStatusOuterCircle {
                margin-left: 67px;
            }
            .socialTabPlayerEntry {
                width: 135%;
            }
            .socialTabPlayerEntry:hover > .stPlayerProfileButton,
            .socialTabPlayerEntry.profileOpen > .stPlayerProfileButton {
                transform: translateX(-48px);
                margin-left: -18px;
            }
            #socialTabContainer {
                position: absolute;
                top: 0;
                bottom: 29px;
                left: 0;
                right: 0;
                height: calc(100% - 29px);
                width: 100%;
                display: flex;
                flex-direction: column;
                overflow: hidden;
            }
            #friendlist {
                display: block;
                padding: 8px;
                box-sizing: border-box;
                overflow-y: auto !important;
                overflow-x: hidden;
                min-height: 0;
                height: 100%;
                max-height: 100%;
                position: relative;
                scrollbar-gutter: stable;
                scrollbar-color: rgba(121, 146, 210, 0.7) rgba(15, 18, 26, 0.42);
            }
            #friendlist::-webkit-scrollbar {
                width: 9px;
                height: 9px;
            }
            #friendlist::-webkit-scrollbar-track {
                background: rgba(15, 18, 26, 0.5);
                border-radius: 999px;
            }
            #friendlist::-webkit-scrollbar-thumb {
                background: linear-gradient(180deg, rgba(152, 177, 255, 0.85), rgba(101, 120, 177, 0.62));
                border: 2px solid rgba(15, 18, 26, 0.8);
                border-radius: 999px;
            }
            #friendlist::-webkit-scrollbar-thumb:hover {
                background: linear-gradient(180deg, rgba(170, 191, 255, 0.95), rgba(116, 135, 200, 0.76));
            }
            .amqFriendPlusResizeHandle {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 12px;
                cursor: ns-resize;
                z-index: 20;
                background: linear-gradient(to bottom, rgba(255,255,255,0.12), rgba(255,255,255,0));
                border-bottom: 1px solid rgba(255,255,255,0.08);
            }
            .amqFriendPlusResizeHandle:hover {
                background: linear-gradient(to bottom, rgba(85, 156, 255, 0.28), rgba(85, 156, 255, 0));
            }
            .amqFriendPlusSearchWrap {
                position: sticky;
                top: 0;
                z-index: 10;
                display: flex;
                align-items: center;
                gap: 6px;
                padding: 6px 8px 6px 8px;
                background: rgb(59, 59, 59);
                border: 1px solid rgba(255,255,255,0.08);
                border-radius: 8px;
                overflow: hidden;
                margin-bottom: 10px;
                box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
            }
            .amqFriendPlusSearchInput {
                flex: 1 1 auto;
                width: 100%;
                box-sizing: border-box;
                border: none;
                border-radius: 6px;
                background: rgba(255,255,255,0.05);
                color: #dfe7ff;
                padding: 8px 10px;
                font-size: 12px;
                font-weight: 700;
                letter-spacing: 0.04em;
                text-transform: uppercase;
                outline: none;
                box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
            }
            .amqFriendPlusSearchInput:focus {
                background: rgba(255,255,255,0.07);
                box-shadow: inset 0 1px 0 rgba(255,255,255,0.05);
            }
            .amqFriendPlusSearchInput::placeholder {
                color: rgba(196, 206, 235, 0.8);
                text-transform: uppercase;
            }
            .amqFriendPlusSearchGearButton {
                flex: 0 0 auto;
                width: 30px;
                height: 30px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                border: 1px solid rgba(255,255,255,0.08);
                border-radius: 6px;
                background: rgba(255,255,255,0.05);
                color: #dfe7ff;
                cursor: pointer;
                padding: 0;
                transition: background 0.15s ease, transform 0.15s ease;
            }
            .amqFriendPlusSearchGearButton:hover {
                background: rgba(255,255,255,0.08);
            }
            .amqFriendPlusSearchGearButton.is-active {
                background: rgba(255,255,255,0.1);
                box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
            }
            .amqFriendPlusSettingsPanel {
                display: none;
                margin: 0 0 10px 0;
                border: 1px solid rgba(255,255,255,0.08);
                border-radius: 8px;
                background: rgba(255,255,255,0.04);
                box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
                overflow: hidden;
            }
            .amqFriendPlusSettingsPanel.is-open {
                display: block;
            }
            .amqFriendPlusSettingsHeader {
                padding: 8px 10px 7px 10px;
                font-size: 12px;
                font-weight: 700;
                letter-spacing: 0.08em;
                text-transform: uppercase;
                color: #dfe7ff;
                background: rgba(0,0,0,0.18);
                border-bottom: 1px solid rgba(255,255,255,0.08);
            }
            .amqFriendPlusSettingsBody {
                display: flex;
                flex-direction: column;
                gap: 6px;
                padding: 8px;
            }
            .amqFriendPlusAlertRow {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 8px;
                padding: 6px 6px;
                background: rgba(255,255,255,0.02);
                border-radius: 6px;
                border: 1px solid rgba(255,255,255,0.04);
            }
            .amqFriendPlusAlertLabel {
                flex: 1 1 auto;
                min-width: 0;
                font-size: 11px;
                line-height: 1.3;
                color: #dfe7ff;
                font-weight: 600;
                letter-spacing: 0.02em;
            }
            .amqFriendPlusAlertModeGroup {
                display: inline-flex;
                align-items: center;
                justify-content: flex-end;
                min-width: 150px;
            }
            .amqFriendPlusAlertModeSelect {
                width: 100%;
                appearance: none;
                -webkit-appearance: none;
                -moz-appearance: none;
                border: 1px solid rgba(255,255,255,0.08);
                background: rgba(255,255,255,0.04);
                color: #dfe7ff;
                border-radius: 5px;
                padding: 5px 28px 5px 8px;
                font-size: 10px;
                font-weight: 700;
                letter-spacing: 0.02em;
                cursor: pointer;
                outline: none;
                background-image: linear-gradient(45deg, transparent 50%, #dfe7ff 50%), linear-gradient(135deg, #dfe7ff 50%, transparent 50%);
                background-position: calc(100% - 14px) calc(50% - 2px), calc(100% - 9px) calc(50% - 2px);
                background-size: 5px 5px, 5px 5px;
                background-repeat: no-repeat;
            }
            .amqFriendPlusAlertModeSelect:focus {
                border-color: rgba(255,255,255,0.18);
                background-color: rgba(255,255,255,0.06);
            }
            .amqFriendPlusAlertModeSelect option {
                /* Chrome renders the native option list with a solid, flattened version of the
                   select's background instead of respecting its transparency, which can end up
                   light instead of dark — so give options an explicit solid dark background here
                   rather than relying on the translucent one above. */
                background-color: #1b1f29;
                color: #dfe7ff;
            }
            .amqFriendPlusAvatarWrap {
                width: 68px;
                height: 68px;
                flex: 0 0 68px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 6px;
                border: 2px solid #7d7d7d;
                background: rgba(0,0,0,0.2);
                overflow: hidden;
                cursor: pointer;
                pointer-events: auto;
            }
            .amqFriendPlusAvatarWrap .avatarDisplay,
            .amqFriendPlusAvatarWrap .avatarDisplay *,
            .amqFriendPlusAvatarWrap .avatarImage,
            .amqFriendPlusAvatarWrap .avatarSpineContainer,
            .amqFriendPlusAvatarWrap .avatarSpine,
            .amqFriendPlusAvatarWrap .avatarDecoration {
                pointer-events: none;
            }
            .amqFriendPlusAllUsersSearchWrap {
                position: sticky;
                top: 0;
                z-index: 12;
                padding: 0 0 8px 0;
                background: rgb(59, 59, 59);
                border: 1px solid rgba(255,255,255,0.08);
                border-radius: 8px;
                overflow: hidden;
                margin-bottom: 8px;
                box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
            }
            .amqFriendPlusAllUsersSearchInput {
                width: 100%;
                box-sizing: border-box;
                border: none;
                border-radius: 0;
                background: rgba(255,255,255,0.05);
                color: #dfe7ff;
                padding: 8px 10px;
                font-size: 12px;
                font-weight: 700;
                letter-spacing: 0.04em;
                text-transform: uppercase;
                outline: none;
                box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
            }
            .amqFriendPlusAllUsersSearchInput:focus {
                background: rgba(255,255,255,0.07);
                box-shadow: inset 0 1px 0 rgba(255,255,255,0.05);
            }
            .amqFriendPlusAllUsersSearchInput::placeholder {
                color: rgba(196, 206, 235, 0.8);
                text-transform: uppercase;
            }
            .amqFriendPlusSection {
                display: block;
                flex: 0 0 auto;
                margin-bottom: 10px;
                background: rgba(255,255,255,0.04);
                border: 1px solid rgba(255,255,255,0.08);
                border-radius: 8px;
                overflow: hidden;
            }
            .amqFriendPlusSectionTitle {
                padding: 7px 10px;
                font-size: 12px;
                font-weight: 700;
                letter-spacing: 0.04em;
                text-transform: uppercase;
                color: #dfe7ff;
                background: rgba(0,0,0,0.18);
                border-bottom: 1px solid rgba(255,255,255,0.08);
            }
            .amqFriendPlusList {
                display: block;
                gap: 6px;
                padding: 6px;
            }
            .amqFriendPlusRow {
                position: relative;
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 2px 8px 4px 8px;
                border-radius: 6px;
                background: rgba(255,255,255,0.025);
                margin-bottom: 4px;
                min-height: 84px;
            }
            .amqFriendPlusRow:last-child {
                margin-bottom: 0;
            }
            .amqFriendPlusAvatarWrap {
                width: 68px;
                height: 68px;
                flex: 0 0 68px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 6px;
                border: 2px solid #7d7d7d;
                background: rgba(0,0,0,0.2);
                overflow: hidden;
                cursor: pointer;
            }
            .amqFriendPlusAvatarWrap img {
                width: 100%;
                height: 100%;
                display: block;
                object-fit: cover;
            }
            .amqFriendPlusMeta {
                flex: 1;
                min-width: 0;
                display: flex;
                flex-direction: column;
                justify-content: flex-start;
                padding-right: 18px;
                min-height: 60px;
                height: 100%;
                gap: 2px;
            }
            .amqFriendPlusNameRow {
                display: flex;
                align-items: flex-start;
                gap: 6px;
                min-width: 0;
                padding-right: 18px;
                min-height: 18px;
                margin: 0;
            }
            .amqFriendPlusFavoriteToggle {
                position: absolute;
                top: 6px;
                right: 8px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 16px;
                height: 16px;
                padding: 0;
                margin: 0;
                border: none;
                background: transparent;
                color: rgba(247, 214, 109, 0.7);
                cursor: pointer;
                line-height: 1;
                flex: 0 0 auto;
                z-index: 1;
            }
            .amqFriendPlusFavoriteToggle.is-favorite {
                color: #f7d66d;
                text-shadow: 0 0 6px rgba(247, 214, 109, 0.8);
            }
            .amqFriendPlusFavoriteToggle .fa {
                font-size: 14px;
            }
            .amqFriendPlusRemoveButton {
                position: absolute;
                right: 6px;
                bottom: 6px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 18px;
                height: 18px;
                border: none;
                border-radius: 50%;
                background: rgba(255, 99, 99, 0.18);
                color: #ff9a9a;
                cursor: pointer;
                padding: 0;
                z-index: 1;
            }
            .amqFriendPlusRemoveButton:hover {
                background: rgba(255, 99, 99, 0.3);
            }
            .amqFriendPlusRemoveButton .fa {
                font-size: 11px;
            }
            .amqFriendPlusName {
                display: block;
                font-size: 15px;
                font-weight: 700;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                line-height: 1.2;
                margin-top: 0;
                padding-top: 0;
                align-self: flex-start;
            }
            .amqFriendPlusRoomName {
                font-size: 13px;
                color: #b9c1d4;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                margin-top: 2px;
                margin-bottom: 2px;
                line-height: 1.3;
                min-height: 18px;
            }
            .amqFriendPlusRoomLabel {
                color: #dfe7ff;
            }
            .amqFriendPlusRoomValue {
                color: #ffffff;
                font-weight: 800;
            }
            .amqFriendPlusActions {
                display: flex;
                align-items: flex-end;
                justify-content: flex-start;
                gap: 6px;
                margin-bottom: 2px;
                flex-wrap: wrap;
                align-self: flex-start;
                width: auto;
                max-width: 100%;
                padding-top: 2px;
            }
            .amqFriendPlusRoomId {
                color: rgba(255,255,255,0.55);
                font-size: 11px;
                font-weight: 700;
                letter-spacing: 0.04em;
                line-height: 1.2;
                margin-left: 2px;
            }
            .amqFriendPlusActionButton,
            .amqFriendPlusButton {
                border: none;
                border-radius: 4px;
                cursor: pointer;
                color: white;
                transition: opacity 0.15s ease, transform 0.15s ease;
            }
            .amqFriendPlusActionButton {
                width: 24px;
                height: 24px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                font-size: 14px;
                background: rgba(79, 124, 255, 0.2);
                border: 1px solid rgba(255,255,255,0.1);
            }
            .amqFriendPlusActionButton .fa {
                font-size: 14px;
                line-height: 1;
            }
            .amqFriendPlusActionButton:hover,
            .amqFriendPlusButton:hover {
                opacity: 0.95;
                transform: translateY(-1px);
            }
            .amqFriendPlusActionButton.dm {
                background: rgba(67, 154, 255, 0.22);
            }
            .amqFriendPlusActionButton.invite {
                background: rgba(28, 180, 114, 0.22);
            }
            .amqFriendPlusLock {
                color: #d0d6f6;
                font-size: 18px;
                width: 18px;
                text-align: center;
            }
            .amqFriendPlusButton {
                padding: 4px 8px;
                font-size: 11px;
                font-weight: 700;
                background: #4f7cff;
            }
            .amqFriendPlusButton:disabled {
                cursor: not-allowed;
                opacity: 0.45;
                filter: grayscale(0.3);
            }
            .amqFriendPlusButton.spectate {
                background: #3a8d68;
            }
            .amqFriendPlusButton.join {
                background: #6f7ef8;
            }
            .amqFriendPlusEmpty {
                color: #aeb9d8;
                font-size: 11px;
                padding: 8px 10px;
            }
        `;
        document.head.appendChild(style);
    };

    const statusColorByStatus = {
        1: "#38d269",
        2: "#ff5a5a",
        3: "#f2c94c",
        0: "#8d9098",
    };

    const FAVORITE_STORAGE_KEY = "amqFriendListPlus.favorites";

    const getFavoriteFriendNames = () => {
        if (typeof localStorage === "undefined") return [];

        try {
            const parsed = JSON.parse(localStorage.getItem(FAVORITE_STORAGE_KEY) || "[]");
            return Array.isArray(parsed) ? parsed.filter((value) => typeof value === "string").map((value) => value.trim()).filter(Boolean) : [];
        } catch (err) {
            return [];
        }
    };

    const setFavoriteFriendNames = (names) => {
        if (typeof localStorage === "undefined") return;
        const uniqueNames = [...new Set((names || []).filter((value) => typeof value === "string" && value.trim()))].map((value) => value.trim());
        localStorage.setItem(FAVORITE_STORAGE_KEY, JSON.stringify(uniqueNames));
    };

    const isFavoriteFriend = (name) => {
        if (!name) return false;
        return getFavoriteFriendNames().includes(name);
    };

    const toggleFavoriteFriend = (name) => {
        if (!name) return;

        const favorites = getFavoriteFriendNames();
        const nextFavorites = favorites.includes(name)
            ? favorites.filter((friendName) => friendName !== name)
            : [...favorites, name];

        setFavoriteFriendNames(nextFavorites);
        updateFriendRow(name);
    };

    const renameFavoriteFriend = (oldName, newName) => {
        if (!oldName || !newName || oldName === newName) return;

        const favorites = getFavoriteFriendNames();
        const renamed = favorites
            .filter((friendName) => friendName !== oldName)
            .concat(favorites.includes(oldName) ? [newName] : []);

        setFavoriteFriendNames(renamed);
    };

    const confirmRemoveFriend = (name) => {
        if (!name) return;

        Swal.fire({
            title: `Do you want to remove ${name} from your friendlist ?`,
            showCancelButton: true,
            confirmButtonText: "Remove",
            cancelButtonText: "Cancel",
            reverseButtons: true,
            confirmButtonColor: "#d9534f",
            cancelButtonColor: "#595959",
        }).then((result) => {
            if (!result.isConfirmed) return;

            socket.sendCommand({
                type: "social",
                command: "remove friend",
                data: { target: name },
            });

            if (typeof socialTab?.removeFriend === "function") {
                socialTab.removeFriend(name);
            }
            updateFriendRow(name);
        });
    };

    const FRIEND_ALERT_SETTINGS_STORAGE_KEY = "amqFriendListPlus.friendAlerts";
    const DEFAULT_FRIEND_ALERT_SETTINGS = {
        friendConnect: "none",
        friendDisconnect: "none",
        friendJoinRoom: "none",
        friendSpectate: "none",
        friendLeaveRoom: "none",
        friendPlayingToLobby: "none",
        friendLobbyToPlaying: "none",
    };
    const FRIEND_ALERT_MESSAGES = {
        friendConnect: "connected",
        friendDisconnect: "disconnected",
        friendJoinRoom: "joined the game",
        friendSpectate: "is spectating",
        friendLeaveRoom: "left the room",
        friendPlayingToLobby: "went to the lobby",
        friendLobbyToPlaying: "started playing",
    };
    const FRIEND_ALERT_LABELS = {
        friendConnect: "Alert when friend connect",
        friendDisconnect: "Alert when friend disconnect",
        friendJoinRoom: "Alert when friend join a game",
        friendSpectate: "Alert when a friend spectate a game",
        friendLeaveRoom: "Alert when a friend leave a room",
        friendPlayingToLobby: "Alert when friend goes from playing to lobby",
        friendLobbyToPlaying: "Alert when friend goes from lobby to playing",
    };
    let friendAlertSettingsOpen = false;
    let friendAlertStateSnapshot = new Map();
    let friendAlertBaselineReady = false;

    const getFriendAlertSettings = () => {
        if (typeof localStorage === "undefined") return { ...DEFAULT_FRIEND_ALERT_SETTINGS };

        try {
            const raw = JSON.parse(localStorage.getItem(FRIEND_ALERT_SETTINGS_STORAGE_KEY) || "{}") || {};
            return {
                ...DEFAULT_FRIEND_ALERT_SETTINGS,
                ...Object.fromEntries(Object.entries(DEFAULT_FRIEND_ALERT_SETTINGS).map(([key, defaultValue]) => [key, raw[key] ?? defaultValue])),
            };
        } catch (err) {
            return { ...DEFAULT_FRIEND_ALERT_SETTINGS };
        }
    };

    const setFriendAlertSettings = (settings) => {
        if (typeof localStorage === "undefined") return;

        const normalized = {
            ...DEFAULT_FRIEND_ALERT_SETTINGS,
            ...settings,
        };

        const next = Object.fromEntries(Object.entries(DEFAULT_FRIEND_ALERT_SETTINGS).map(([key, defaultValue]) => {
            const value = normalized[key];
            return [key, value === "favorite" || value === "all" || value === "none" ? value : defaultValue];
        }));

        try {
            localStorage.setItem(FRIEND_ALERT_SETTINGS_STORAGE_KEY, JSON.stringify(next));
        } catch (err) {
            // Ignore storage failures.
        }
    };

    const getFriendAlertModeForFriend = (alertKey, friendName) => {
        if (!friendName) return "none";
        const setting = getFriendAlertSettings()[alertKey] ?? "none";
        if (setting === "favorite") return isFavoriteFriend(friendName) ? "favorite" : "none";
        if (setting === "all") return "all";
        return "none";
    };

    const popoutMessage = (head, body) => {
        if (typeof popoutMessages?.displayPopoutMessage !== "function" || typeof format !== "function" || typeof escapeHtml !== "function") {
            return false;
        }
        const htmlBody = format(popoutMessages.STANDARD_TEMPLATE, escapeHtml(head), escapeHtml(body));
        popoutMessages.displayPopoutMessage(htmlBody);
        return true;
    };

    // "joined the game in X" / "left the room in X" read as if the room name were a place
    // inside the room, so these two skip the "in" connector entirely.
    const FRIEND_ALERT_NO_PREPOSITION = new Set(["friendJoinRoom", "friendLeaveRoom"]);

    const triggerFriendAlert = (alertKey, friendName, roomName = "") => {
        if (!friendName) return;
        if (getFriendAlertModeForFriend(alertKey, friendName) === "none") return;

        const action = FRIEND_ALERT_MESSAGES[alertKey] || "updated";
        const body = !roomName
            ? action
            : FRIEND_ALERT_NO_PREPOSITION.has(alertKey)
                ? `${action} ${roomName}`
                : `${action} in ${roomName}`;

        popoutMessage(friendName, body);
    };

    const buildFriendAlertSnapshot = (entry) => {
        if (!entry || !entry.name) return null;

        const playingState = getFriendPlayingState(entry);
        return {
            roomId: playingState?.roomId ?? null,
            roomName: playingState?.roomName ?? "",
            inLobby: !!playingState?.inLobby,
            isSpectator: !!playingState?.isSpectator,
            offline: !!(entry.offline === true || Number(entry.status ?? 1) === 0),
        };
    };

    const updateFriendAlertStateSnapshot = () => {
        const current = new Map();
        const entries = getFriendEntries();

        entries.forEach((entry) => {
            const snapshot = buildFriendAlertSnapshot(entry);
            if (snapshot) {
                current.set(entry.name, snapshot);
            }
        });

        // Connect/disconnect are fired directly off the "friend state change" event instead of
        // being inferred here (see that listener) — that event is AMQ's own authoritative
        // offline<->online signal, whereas diffing this snapshot was prone to false positives
        // for friends who were already online/playing (e.g. right after login).
        if (friendAlertBaselineReady) {
            const previousEntries = new Map(friendAlertStateSnapshot.entries());

            previousEntries.forEach((previous, name) => {
                const currentState = current.get(name);
                if (!currentState || currentState.offline) return;

                if (previous.roomId == null && currentState.roomId != null) {
                    triggerFriendAlert("friendJoinRoom", name, currentState.roomName);
                }

                if (previous.roomId != null && currentState.roomId == null) {
                    triggerFriendAlert("friendLeaveRoom", name, previous.roomName || "a room");
                }

                if (currentState.isSpectator && !previous.isSpectator) {
                    triggerFriendAlert("friendSpectate", name, currentState.roomName);
                }

                if (previous.roomId != null && !previous.inLobby && currentState.inLobby && !currentState.isSpectator && currentState.roomId != null) {
                    triggerFriendAlert("friendPlayingToLobby", name, currentState.roomName);
                }

                if (previous.roomId != null && previous.inLobby && !currentState.inLobby && !currentState.isSpectator && currentState.roomId != null) {
                    triggerFriendAlert("friendLobbyToPlaying", name, currentState.roomName);
                }
            });
        }

        friendAlertStateSnapshot = current;
    };

    const renderFriendAlertSettingsPanel = ($friendList) => {
        if (!$friendList || !$friendList.length) return;

        let $panel = $friendList.find(".amqFriendPlusSettingsPanel");
        if (!$panel.length) {
            $panel = $("<div>", { class: "amqFriendPlusSettingsPanel" });
            const $header = $("<div>", { class: "amqFriendPlusSettingsHeader" }).text("Friend Alerts");
            const $body = $("<div>", { class: "amqFriendPlusSettingsBody" });
            $panel.append($header, $body);
            const $searchWrap = $friendList.find(".amqFriendPlusSearchWrap");
            if ($searchWrap.length) {
                $searchWrap.after($panel);
            } else {
                $friendList.prepend($panel);
            }
        }

        const $body = $panel.find(".amqFriendPlusSettingsBody");
        $body.empty();

        Object.entries(FRIEND_ALERT_LABELS).forEach(([key, label]) => {
            const settings = getFriendAlertSettings();
            const $row = $("<div>", { class: "amqFriendPlusAlertRow" });
            const $label = $("<div>", { class: "amqFriendPlusAlertLabel" }).text(label);
            const $group = $("<div>", { class: "amqFriendPlusAlertModeGroup" });
            const $select = $("<select>", {
                class: "amqFriendPlusAlertModeSelect",
                value: settings[key] || "none",
            });

            [
                { value: "none", label: "None" },
                { value: "favorite", label: "Favorite only" },
                { value: "all", label: "All Friends" },
            ].forEach(({ value, label: optionLabel }) => {
                const $option = $("<option>", {
                    value,
                    text: optionLabel,
                    selected: settings[key] === value,
                });
                $select.append($option);
            });

            $select.on("change", (event) => {
                const nextSettings = getFriendAlertSettings();
                nextSettings[key] = $(event.currentTarget).val() || "none";
                setFriendAlertSettings(nextSettings);
            });

            $group.append($select);
            $row.append($label, $group);
            $body.append($row);
        });

        $panel.toggleClass("is-open", friendAlertSettingsOpen);
    };

    const getFriendEntries = () => {
        if (typeof socialTab === "undefined") return [];

        const merged = {};
        const online = socialTab.onlineFriends ?? {};
        const offline = socialTab.offlineFriends ?? {};

        Object.keys(online).forEach((name) => {
            merged[name] = online[name];
        });
        Object.keys(offline).forEach((name) => {
            merged[name] = merged[name] || offline[name];
        });

        return Object.values(merged).filter(Boolean).sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    };

    const forceFriendListLayout = () => {
        const $socialTab = $("#socialTab");
        const $socialTabContainer = $("#socialTabContainer");
        const $friendList = $("#friendlist");

        if (!$socialTab.length || !$socialTabContainer.length || !$friendList.length) {
            return;
        }

        $socialTab.css({ overflow: "hidden" });
        $socialTabContainer.css({
            position: "absolute",
            top: 0,
            bottom: "29px",
            left: 0,
            right: 0,
            height: "calc(100% - 29px)",
            width: "100%",
            overflow: "hidden",
        });
        $friendList.css({
            position: "relative",
            display: "block",
            height: "100%",
            maxHeight: "100%",
            overflowY: "auto",
            overflowX: "hidden",
            width: "100%",
        });
    };

    const getFriendRoomInfo = (friendName, fallbackGameState = null) => {
        if (!friendName || !Array.isArray(rooms)) {
            if (!friendName || !fallbackGameState) return null;
        }

        const match = rooms.find((room) => {
            if (!room) return false;
            if (room.host === friendName) return true;
            if ((room.players ?? []).map((name) => String(name).trim().toLowerCase()).includes(String(friendName).trim().toLowerCase())) return true;
            if ((room.spectators ?? []).map((name) => String(name).trim().toLowerCase()).includes(String(friendName).trim().toLowerCase())) return true;
            if ((room.friendNames ?? []).map((name) => String(name).trim().toLowerCase()).includes(String(friendName).trim().toLowerCase())) return true;
            return false;
        });

        if (match) {
            return {
                roomId: match.roomId,
                // Leave this empty rather than defaulting here: getFriendPlayingState falls back
                // to the friend's own gameState.roomName next, and a truthy placeholder here would
                // block that fallback from ever being used.
                roomName: match.roomName || "",
                inLobby: !!match.inLobby,
                privateRoom: !!match.privateRoom,
                soloRoom: !!match.soloRoom,
                isSpectator: !!((match.spectators ?? []).some((name) => String(name).trim().toLowerCase() === String(friendName).trim().toLowerCase())),
            };
        }

        if (!fallbackGameState) return null;

        const roomName = fallbackGameState.roomName || fallbackGameState.room?.roomName || "";
        const roomId = fallbackGameState.roomId ?? fallbackGameState.gameId ?? null;

        return {
            roomId,
            roomName,
            inLobby: !!fallbackGameState.inLobby,
            privateRoom: !!fallbackGameState.private,
            soloRoom: !!fallbackGameState.soloGame,
            isSpectator: !!fallbackGameState.isSpectator,
        };
    };

    const findRoomFromRoomIdOrBrowser = (roomId) => {
        if (!roomId) return null;

        const fromRooms = rooms.find((room) => room && room.roomId === roomId);
        if (fromRooms) return fromRooms;

        const browserRoom = roomBrowser?.activeRooms?.[roomId] ?? Object.values(roomBrowser?.activeRooms ?? {}).find((room) => room?.id === roomId);
        if (!browserRoom) return null;

        const browserSettings = browserRoom.settings ?? {};
        const fallbackRoom = {
            roomId: browserRoom.id ?? roomId,
            host: browserRoom.host ?? selfName ?? null,
            roomName: browserSettings.roomName || "",
            players: (browserRoom.allPlayers?.players ?? []).map((player) => player.name ?? player),
            spectators: (browserRoom.allPlayers?.spectators ?? []).map((player) => player.name ?? player),
            friendNames: Array.isArray(browserRoom._friendNames) ? browserRoom._friendNames.slice() : [],
            inLobby: !!browserRoom._inLobby,
            privateRoom: !!browserRoom._private,
            soloRoom: !!browserSettings.soloMode || browserSettings.gameMode === "Solo" || (typeof browserSettings.roomName === "string" && browserSettings.roomName.toLowerCase() === "solo"),
        };

        rooms = rooms.filter((room) => room && room.roomId !== roomId).concat(fallbackRoom);
        return fallbackRoom;
    };

    const getFriendPlayingState = (entry) => {
        if (!entry || !entry.name) return null;

        const gameState = entry.gameState ?? null;
        const roomInfo = getFriendRoomInfo(entry.name, gameState);

        if (gameState) {
            const soloRoom = !!gameState.soloGame || !!roomInfo?.soloRoom || (gameState.roomName === "Solo");
            const roomName = roomInfo?.roomName || gameState.roomName || "Unknown room";
            const isSpectator = roomInfo ? !!roomInfo.isSpectator : !!gameState.isSpectator;
            const isInLobby = roomInfo ? (!!roomInfo.inLobby && !isSpectator) : (!!gameState.inLobby && !isSpectator);

            return {
                roomId: roomInfo?.roomId ?? gameState.gameId ?? null,
                roomName: soloRoom ? "Solo" : roomName,
                inLobby: isInLobby,
                privateRoom: roomInfo?.privateRoom ?? !!gameState.private,
                soloRoom,
                isSpectator,
            };
        }

        return roomInfo ? { ...roomInfo, soloRoom: !!roomInfo.soloRoom } : null;
    };

    const getSpecialRoomModeName = (entry, roomInfo = null) => {
        const gameState = entry?.gameState ?? null;
        if (!gameState) return null;

        if (gameState.inNexusLobby) return "Nexus";
        if (gameState.isQuizOfTheDay) return "Quiz of The Day";
        if (gameState.isJam) return "Jam";

        if (roomInfo && roomInfo.isSpectator && gameState.isSpectator) {
            if (gameState.inNexusLobby) return "Nexus";
        }

        return null;
    };

    const getFriendProfileImageSrc = (avatarInfo) => {
        if (!avatarInfo) return "";

        if (avatarInfo.profileEmoteId != null && storeWindow?.getEmote) {
            const emote = storeWindow.getEmote(avatarInfo.profileEmoteId);
            return emote?.src || "";
        }

        if (!avatarInfo.avatarName) return "";

        return cdnFormater.newAvatarHeadSrc(
            avatarInfo.avatarName,
            avatarInfo.outfitName,
            avatarInfo.optionName,
            avatarInfo.optionActive,
            avatarInfo.colorName,
        );
    };

    const hexToRgba = (color, alpha = 1) => {
        if (!color) return `rgba(255, 255, 255, ${alpha})`;

        const trimmed = String(color).trim();
        const hexMatch = trimmed.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
        if (hexMatch) {
            const normalized = hexMatch[1].length === 3
                ? hexMatch[1].split("").map((char) => char + char).join("")
                : hexMatch[1];

            const value = Number.parseInt(normalized, 16);
            const r = (value >> 16) & 255;
            const g = (value >> 8) & 255;
            const b = value & 255;
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }

        const rgbMatch = trimmed.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*([0-9.]+))?\s*\)$/i);
        if (rgbMatch) {
            const r = Number(rgbMatch[1]);
            const g = Number(rgbMatch[2]);
            const b = Number(rgbMatch[3]);
            const baseAlpha = rgbMatch[4] != null ? Number(rgbMatch[4]) : 1;
            const nextAlpha = Math.min(1, Math.max(0, alpha * baseAlpha));
            return `rgba(${r}, ${g}, ${b}, ${nextAlpha})`;
        }

        const hslMatch = trimmed.match(/^hsla?\(\s*(\d{1,3})\s*,\s*(\d{1,3})%\s*,\s*(\d{1,3})%(?:\s*,\s*([0-9.]+))?\s*\)$/i);
        if (hslMatch) {
            const h = Number(hslMatch[1]) / 360;
            const s = Number(hslMatch[2]) / 100;
            const l = Number(hslMatch[3]) / 100;
            const baseAlpha = hslMatch[4] != null ? Number(hslMatch[4]) : 1;
            const nextAlpha = Math.min(1, Math.max(0, alpha * baseAlpha));

            const hueToRgb = (p, q, t) => {
                let temp = t;
                if (temp < 0) temp += 1;
                if (temp > 1) temp -= 1;
                if (temp < 1 / 6) return p + (q - p) * 6 * temp;
                if (temp < 1 / 2) return q;
                if (temp < 2 / 3) return p + (q - p) * (2 / 3 - temp) * 6;
                return p;
            };

            let r;
            let g;
            let b;
            if (s === 0) {
                r = g = b = l;
            } else {
                const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
                const p = 2 * l - q;
                r = hueToRgb(p, q, h + 1 / 3);
                g = hueToRgb(p, q, h);
                b = hueToRgb(p, q, h - 1 / 3);
            }

            return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${nextAlpha})`;
        }

        return `rgba(255, 255, 255, ${alpha})`;
    };

    const getMostCommonOpaqueColor = (imageUrl) => new Promise((resolve) => {
        if (!imageUrl) {
            resolve(null);
            return;
        }

        const image = new Image();
        image.crossOrigin = "anonymous";

        image.onload = () => {
            const maxSide = 32;
            const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
            const width = Math.max(1, Math.round(image.width * scale));
            const height = Math.max(1, Math.round(image.height * scale));
            const canvas = document.createElement("canvas");
            const context = canvas.getContext("2d");

            if (!context) {
                resolve(null);
                return;
            }

            canvas.width = width;
            canvas.height = height;
            context.clearRect(0, 0, width, height);
            context.drawImage(image, 0, 0, width, height);

            const { data } = context.getImageData(0, 0, width, height);
            const counts = new Map();
            let bestColor = null;
            let bestCount = 0;
            const bucketStep = 24;

            for (let i = 0; i < data.length; i += 4) {
                const alpha = data[i + 3];
                if (alpha <= 25) continue;

                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                const maxChannel = Math.max(r, g, b);
                const minChannel = Math.min(r, g, b);
                const brightness = (r + g + b) / 3;
                const saturation = maxChannel === 0 ? 0 : (maxChannel - minChannel) / maxChannel;
                const isNearWhite = brightness > 240 && saturation < 0.12;
                if (isNearWhite) continue;

                const qR = Math.round(r / bucketStep) * bucketStep;
                const qG = Math.round(g / bucketStep) * bucketStep;
                const qB = Math.round(b / bucketStep) * bucketStep;
                const key = `${qR},${qG},${qB}`;
                const nextCount = (counts.get(key) || 0) + 1;
                counts.set(key, nextCount);

                if (nextCount > bestCount) {
                    bestCount = nextCount;
                    bestColor = { r: qR, g: qG, b: qB };
                }
            }

            resolve(bestColor ? `rgb(${bestColor.r}, ${bestColor.g}, ${bestColor.b})` : null);
        };

        image.onerror = () => resolve(null);
        image.src = imageUrl;
    });

    const getProfileTintColor = async (entry) => {
        const avatarInfo = entry?.avatarInfo ?? {};

        const namedColors = {
            black: "#15181d",
            white: "#f4f7ff",
            red: "#d64a4a",
            pink: "#ea6fb4",
            orange: "#ef8f4f",
            yellow: "#f0d767",
            green: "#4dc97d",
            cyan: "#51c8df",
            blue: "#5b8cff",
            purple: "#8a73ff",
            gray: "#9aa5b8",
            silver: "#c3cfe5",
            gold: "#e7be5d",
        };

        const direct = String(avatarInfo.colorName || "").trim().toLowerCase();
        if (direct && namedColors[direct] && direct !== "white" && direct !== "silver" && direct !== "gray") {
            return namedColors[direct];
        }

        const imageSrc = getFriendProfileImageSrc(avatarInfo);
        if (imageSrc) {
            const fromImage = await getMostCommonOpaqueColor(imageSrc);
            if (fromImage) {
                return fromImage;
            }
        }

        const fallback = String(entry?.name || "").split("").reduce((hash, char) => {
            return (hash * 31 + char.charCodeAt(0)) >>> 0;
        }, 0);

        const hue = fallback % 360;
        return `hsl(${hue}, 68%, 62%)`;
    };

    const createStableProfileAnchor = ($sourceElement) => {
        const offset = $sourceElement.offset() || { left: 0, top: 0 };
        const $anchor = $("<div>", {
            class: "amqFriendPlusProfileAnchor",
            css: {
                position: "fixed",
                left: offset.left + "px",
                top: offset.top + "px",
                width: ($sourceElement.outerWidth() || 52) + "px",
                height: ($sourceElement.outerHeight() || 52) + "px",
                opacity: 0,
                pointerEvents: "none",
                zIndex: -1,
            },
        });

        $("body").append($anchor);
        return $anchor;
    };

    const getSelectorStyleValue = (selector, propertyName) => {
        for (const sheet of Array.from(document.styleSheets)) {
            try {
                for (const rule of sheet.cssRules) {
                    if (!rule || !rule.selectorText) continue;
                    if (!rule.selectorText.split(",").some((part) => part.trim() === selector)) continue;
                    const value = rule.style.getPropertyValue(propertyName);
                    if (value) return value.trim();
                }
            } catch (err) {
                // Ignore cross-origin or protected stylesheets.
            }
        }
        return "";
    };

    const applyFriendNameStyle = ($name, nameColorClass, nameGlowClass) => {
        if (nameColorClass) {
            const colorValue = getSelectorStyleValue(`.${nameColorClass}`, "color");
            if (colorValue) {
                $name.css("color", colorValue);
            }
            $name.addClass(nameColorClass);
        }

        if (nameGlowClass) {
            const glowValue = getSelectorStyleValue(`.${nameGlowClass}`, "text-shadow");
            if (glowValue) {
                $name.css("text-shadow", glowValue);
            }
            $name.addClass(nameGlowClass);
        }
    };

    const applyFriendSearchFilter = () => {
        const $friendList = $("#friendlist");
        if (!$friendList.length) return;

        const searchText = (friendListSearch || "").trim().toLowerCase();
        const $rows = $friendList.find(".amqFriendPlusRow");

        $rows.each(function () {
            const $row = $(this);
            const friendName = String($row.data("friendName") || "").toLowerCase();
            const shouldShow = !searchText || friendName.includes(searchText);
            $row.toggle(shouldShow);
        });

        $friendList.find(".amqFriendPlusSection").each(function () {
            const $section = $(this);
            const hasVisibleRows = $section.find(".amqFriendPlusRow:visible").length > 0;
            $section.toggle(hasVisibleRows || !searchText);
        });

        const $searchInput = $friendList.find(".amqFriendPlusSearchInput");
        if ($searchInput.length) {
            $searchInput.val(friendListSearch);
        }
    };

    let allUsersSearch = "";

    const applyAllUsersSearchFilter = () => {
        const $allUserList = $("#allUserList");
        if (!$allUserList.length) return;

        const searchText = (allUsersSearch || "").trim().toLowerCase();
        $allUserList.find(".socialTabPlayerEntry").each(function () {
            const $entry = $(this);
            const name = ($entry.find("h4").first().text() || "").toLowerCase();
            $entry.toggle(!searchText || name.includes(searchText));
        });

        const $searchInput = $allUserList.find(".amqFriendPlusAllUsersSearchInput");
        if ($searchInput.length) {
            $searchInput.val(allUsersSearch);
        }
    };

    const patchAllPlayersListFiltering = () => {
        if (typeof AllPlayersList === "undefined" || !AllPlayersList.prototype) return;

        if (AllPlayersList.prototype.__amqFriendPlusPatchedForSearch) return;
        AllPlayersList.prototype.__amqFriendPlusPatchedForSearch = true;

        const originalInsertPlayer = AllPlayersList.prototype.insertPlayer;
        if (typeof originalInsertPlayer === "function") {
            AllPlayersList.prototype.insertPlayer = function (name) {
                const $entry = originalInsertPlayer.call(this, name);
                setTimeout(() => {
                    applyAllUsersSearchFilter();
                }, 0);
                return $entry;
            };
        }

        const originalLoadAllOnline = AllPlayersList.prototype.loadAllOnline;
        if (typeof originalLoadAllOnline === "function") {
            AllPlayersList.prototype.loadAllOnline = function () {
                const result = originalLoadAllOnline.call(this);
                setTimeout(() => {
                    applyAllUsersSearchFilter();
                }, 0);
                return result;
            };
        }
    };

    const renderFriendRow = (entry, $friendList) => {
        if (!entry || !entry.name) return null;

        const roomInfo = getFriendPlayingState(entry);
        const inOnlineMap = !!(socialTab?.onlineFriends && socialTab.onlineFriends[entry.name]);
        const inOfflineMap = !!(socialTab?.offlineFriends && socialTab.offlineFriends[entry.name]);
        const isOffline = inOfflineMap || (!inOnlineMap && (entry.offline === true || Number(entry.status ?? 1) === 0));
        const isPlaying = !isOffline && !!roomInfo;
        const status = Number(entry.status ?? (inOfflineMap ? 0 : 1));
        const statusColor = statusColorByStatus[status] ?? statusColorByStatus[1];

        const $row = $("<div>", {
            class: "amqFriendPlusRow",
            "data-friend-name": entry.name,
            css: {
                background: "linear-gradient(90deg, rgba(255, 255, 255, 0.025) 0%, rgba(255, 255, 255, 0.03) 52%, rgba(94, 112, 160, 0.18) 100%)",
                boxShadow: "inset 0 0 0 1px rgba(120, 140, 185, 0.14)",
            },
        });

        const applyRowProfileTint = async () => {
            const profileTint = await getProfileTintColor(entry);
            if (!profileTint) return;

            $row.css({
                background: `linear-gradient(90deg, ${hexToRgba(profileTint, 0.34)} 0%, rgba(255, 255, 255, 0.03) 52%, rgba(255, 255, 255, 0.025) 100%)`,
                boxShadow: `inset 0 0 0 1px ${hexToRgba(profileTint, 0.18)}`,
            });
        };
        applyRowProfileTint();

        const $avatarWrap = $("<div>", {
            class: "amqFriendPlusAvatarWrap",
            css: { borderColor: statusColor },
        });

        const avatarDisplayHandler = new AvatarHeadDisplayHandler($avatarWrap);
        const avatarInfo = entry.avatarInfo || {};

        if (avatarInfo.animated && !avatarInfo.profileEmoteId) {
            const jsonSrc = cdnFormater.newAnimatedAvatarJsonSrc(avatarInfo.avatarName, avatarInfo.outfitName);
            const atlasSrc = cdnFormater.newAnimatedAvatarAtlasSrc(avatarInfo.avatarName, avatarInfo.outfitName);
            avatarDisplayHandler.displayAvatarAnimated(
                jsonSrc,
                atlasSrc,
                true,
                {
                    $lazyLoadContainer: $friendList,
                    $lazyOffsetParent: $avatarWrap,
                },
                null,
                avatarInfo.optionActive
            );
        } else if (avatarInfo.profileEmoteId != null && storeWindow?.getEmote) {
            const emote = storeWindow.getEmote(avatarInfo.profileEmoteId);
            avatarDisplayHandler.displayAvatarImage(emote?.src || "", emote?.srcSet || "", {
                triggerLoad: true,
                defaultSizes: "40px",
                $lazyLoadContainer: $friendList,
                $lazyOffsetParent: $avatarWrap,
            });
        } else if (avatarInfo.avatarName) {
            const src = cdnFormater.newAvatarHeadSrc(
                avatarInfo.avatarName,
                avatarInfo.outfitName,
                avatarInfo.optionName,
                avatarInfo.optionActive,
                avatarInfo.colorName,
            );
            const srcSet = cdnFormater.newAvatarHeadSrcSet(
                avatarInfo.avatarName,
                avatarInfo.outfitName,
                avatarInfo.optionName,
                avatarInfo.optionActive,
                avatarInfo.colorName,
            );
            avatarDisplayHandler.displayAvatarImage(src, srcSet, {
                triggerLoad: true,
                defaultSizes: "40px",
                $lazyLoadContainer: $friendList,
                $lazyOffsetParent: $avatarWrap,
            });
        }

        $avatarWrap.on("click", () => {
            const isThisProfileOpen = !!(
                playerProfileController.open &&
                playerProfileController.currentProfile &&
                playerProfileController.currentProfile.$profile.find(".ppPlayerName").text() === entry.name
            );

            if (isThisProfileOpen) {
                playerProfileController.clearProfiles();
                return;
            }

            if (playerProfileController.open && playerProfileController.currentProfile) {
                playerProfileController.clearProfiles();
            }

            const $profileAnchor = createStableProfileAnchor($avatarWrap);
            playerProfileController.loadProfileIfClosed(
                entry.name,
                $profileAnchor,
                { x: 7 },
                () => {
                    $profileAnchor.remove();
                    $avatarWrap.removeClass("playerProfileOpen");
                },
                !!isOffline
            );
        });

        const $meta = $("<div>", { class: "amqFriendPlusMeta" });
        const $nameRow = $("<div>", { class: "amqFriendPlusNameRow" });
        const $favoriteToggle = $("<button>", {
            type: "button",
            class: "amqFriendPlusFavoriteToggle" + (isFavoriteFriend(entry.name) ? " is-favorite" : ""),
            title: isFavoriteFriend(entry.name) ? `Remove ${entry.name} from favorites` : `Add ${entry.name} to favorites`,
            "aria-label": isFavoriteFriend(entry.name) ? `Remove ${entry.name} from favorites` : `Add ${entry.name} to favorites`,
        }).html('<i class="fa ' + (isFavoriteFriend(entry.name) ? "fa-star" : "fa-star-o") + '" aria-hidden="true"></i>');
        $favoriteToggle.on("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            toggleFavoriteFriend(entry.name);
        });

        const $name = $("<span>", { class: "amqFriendPlusName" }).text(entry.name);
        applyFriendNameStyle($name, entry.currentNameColorClass, entry.currentNameGlowClass);

        $nameRow.append($name);
        $meta.append($nameRow);

        const $removeBtn = $("<button>", {
            type: "button",
            class: "amqFriendPlusRemoveButton",
            title: `Remove ${entry.name} from your friendlist`,
            "aria-label": `Remove ${entry.name} from your friendlist`,
        }).html('<i class="fa fa-times" aria-hidden="true"></i>');
        $removeBtn.on("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            confirmRemoveFriend(entry.name);
        });

        const $actions = $("<div>", { class: "amqFriendPlusActions" });

        if (!isOffline) {
            const $dmBtn = $("<button>", {
                class: "amqFriendPlusActionButton dm",
                type: "button",
                title: `DM ${entry.name}`,
                "aria-label": `Send DM to ${entry.name}`,
            }).html('<i class="fa fa-comment" aria-hidden="true"></i>');
            $dmBtn.on("click", () => {
                if (typeof socialTab?.startChat === "function") {
                    socialTab.startChat(entry.name);
                }
            });

            const $inviteBtn = $("<button>", {
                class: "amqFriendPlusActionButton invite",
                type: "button",
                title: `Invite ${entry.name} to game`,
                "aria-label": `Invite ${entry.name} to game`,
            }).html('<i class="fa fa-gamepad" aria-hidden="true"></i>');
            $inviteBtn.on("click", () => {
                if (typeof socialTab?.sendGameInvite === "function") {
                    socialTab.sendGameInvite(entry.name);
                }
            });

            $actions.append($dmBtn, $inviteBtn);
        }

        if (isPlaying && roomInfo) {
            const $roomIdTag = roomInfo.roomId ? $("<span>", { class: "amqFriendPlusRoomId" }).text(`#${roomInfo.roomId}`) : null;
            const $room = $("<div>", { class: "amqFriendPlusRoomName" });
            const roomModeName = getSpecialRoomModeName(entry, roomInfo);
            const label = roomInfo.isSpectator ? "Spectating " : roomInfo.inLobby ? "In Lobby " : "Playing in ";
            const $prefix = $("<span>", { class: "amqFriendPlusRoomLabel" }).text(label);
            const roomDisplayName = roomModeName || (roomInfo.soloRoom ? "Solo" : roomInfo.roomName || "Unknown room");
            const $roomName = $("<strong>", { class: "amqFriendPlusRoomValue" }).text(roomDisplayName);
            $room.append($prefix, $roomName);
            $meta.append($room);

            if (roomInfo.privateRoom) {
                const $lock = $("<div>", { class: "amqFriendPlusLock" }).html('<i class="fa fa-lock" aria-hidden="true"></i>');
                $actions.append($lock);
            }

            if (!roomInfo.soloRoom) {
                if (!roomModeName) {
                    const $joinBtn = $("<button>", {
                        class: "amqFriendPlusButton join",
                        text: "Join",
                        disabled: !roomInfo.inLobby,
                    });
                    $joinBtn.on("click", () => {
                        if (roomInfo.privateRoom) {
                            Swal.fire({
                                title: localizationHandler.translate("room_browser.room_tile.password.title"),
                                input: "password",
                                inputPlaceholder: localizationHandler.translate("room_browser.room_tile.password.placeholder"),
                                showCancelButton: true,
                                confirmButtonText: localizationHandler.translate("room_browser.room_tile.password.confirm_button"),
                                inputAttributes: { maxlength: 50, minlength: 1 },
                            }).then((result) => {
                                if (result.isConfirmed) {
                                    roomBrowser.fireJoinLobby(roomInfo.roomId, result.value);
                                }
                            });
                        } else {
                            roomBrowser.fireJoinLobby(roomInfo.roomId);
                        }
                    });

                    const $spectateBtn = $("<button>", {
                        class: "amqFriendPlusButton spectate",
                        text: "Spectate",
                    });
                    $spectateBtn.on("click", () => {
                        if (roomInfo.privateRoom) {
                            roomBrowser.spectateGameWithPassword(roomInfo.roomId);
                        } else {
                            roomBrowser.fireSpectateGame(roomInfo.roomId);
                        }
                    });

                    $actions.append($joinBtn, $spectateBtn);
                }

                if ($roomIdTag) {
                    $actions.append($roomIdTag);
                }
            } else if ($roomIdTag) {
                const $inviteBtn = $actions.find(".amqFriendPlusActionButton.invite").last();
                if ($inviteBtn.length) {
                    $inviteBtn.after($roomIdTag);
                } else {
                    $actions.append($roomIdTag);
                }
            }
        }

        if ($actions.children().length) {
            $meta.append($actions);
        }

        $row.append($avatarWrap, $meta, $favoriteToggle, $removeBtn);
        return $row;
    };

    const getFriendRowSectionId = (entry) => {
        if (!entry || !entry.name) return "onlineFriends";

        const roomInfo = getFriendPlayingState(entry);
        const inOnlineMap = !!(socialTab?.onlineFriends && socialTab.onlineFriends[entry.name]);
        const inOfflineMap = !!(socialTab?.offlineFriends && socialTab.offlineFriends[entry.name]);
        const isOffline = inOfflineMap || (!inOnlineMap && (entry.offline === true || Number(entry.status ?? 1) === 0));
        const isPlaying = !isOffline && !!roomInfo;

        if (isPlaying) return "playingFriends";
        if (isOffline) return "offlineFriends";
        return "onlineFriends";
    };

    const compareFriendOrder = (nameA, nameB) => {
        const favoriteA = isFavoriteFriend(nameA);
        const favoriteB = isFavoriteFriend(nameB);
        if (favoriteA !== favoriteB) return favoriteA ? -1 : 1;
        return String(nameA || "").localeCompare(String(nameB || ""));
    };

    const insertRowSorted = ($list, $row, friendName) => {
        const insertBeforeRow = $list.children(".amqFriendPlusRow").toArray().find((rowEl) => {
            return compareFriendOrder(friendName, $(rowEl).data("friendName")) < 0;
        });

        if (insertBeforeRow) {
            $(insertBeforeRow).before($row);
        } else {
            $list.append($row);
        }
    };

    // Updates a single friend's row in place instead of rebuilding the whole list, so unrelated
    // friends don't flicker on every state change. Pass previousName when a friend was just renamed,
    // since the existing row is still keyed by their old name.
    const updateFriendRow = (friendName, previousName = friendName) => {
        if (!friendName) return;

        const $friendList = $("#friendlist");
        if (!$friendList.length) return;

        const matchingEntry = getFriendEntries().find((entry) => entry && entry.name === friendName);
        const $existingRow = $friendList.find(".amqFriendPlusRow").filter(function () {
            return $(this).data("friendName") === previousName;
        }).first();

        if (!matchingEntry) {
            if ($existingRow.length) {
                $existingRow.remove();
            }
            return;
        }

        const targetSection = $friendList.find(".amqFriendPlusSection").filter((index, element) => {
            return $(element).attr("id") === getFriendRowSectionId(matchingEntry);
        }).first();

        if (!targetSection.length) {
            // Sections haven't been built yet (e.g. first render still pending); fall back once.
            scheduleFriendListRender(true);
            return;
        }

        const $replacement = renderFriendRow(matchingEntry, $friendList);
        if (!$replacement) return;

        if ($existingRow.length) {
            $existingRow.remove();
        }

        insertRowSorted(targetSection.find(".amqFriendPlusList"), $replacement, friendName);
        $replacement.trigger("amqFriendPlus:updated");
        applyFriendSearchFilter();
    };

    const renderFriendListSections = () => {
        if (typeof socialTab === "undefined") return;
        addFriendListStyles();
        forceFriendListLayout();

        const $friendList = $("#friendlist");
        if (!$friendList.length) return;

        const previousScrollTop = $friendList.scrollTop();
        const previousScrollMax = Math.max(0, ($friendList[0]?.scrollHeight || 0) - ($friendList[0]?.clientHeight || 0));

        let $searchWrap = $friendList.find(".amqFriendPlusSearchWrap");
        if (!$searchWrap.length) {
            $searchWrap = $("<div>", { class: "amqFriendPlusSearchWrap" });
            const $searchInput = $("<input>", {
                type: "text",
                class: "amqFriendPlusSearchInput",
                placeholder: "Search friends...",
                value: friendListSearch,
            });
            $searchInput.on("input", (event) => {
                friendListSearch = $(event.currentTarget).val() || "";
                applyFriendSearchFilter();
            });

            const $gearButton = $("<button>", {
                type: "button",
                class: "amqFriendPlusSearchGearButton" + (friendAlertSettingsOpen ? " is-active" : ""),
                title: "Friend alert settings",
                "aria-label": "Friend alert settings",
                html: '<i class="fa fa-gear" aria-hidden="true"></i>',
            });
            $gearButton.on("click", () => {
                friendAlertSettingsOpen = !friendAlertSettingsOpen;
                renderFriendAlertSettingsPanel($friendList);
                $gearButton.toggleClass("is-active", friendAlertSettingsOpen);
            });

            $searchWrap.append($searchInput, $gearButton);
            $friendList.append($searchWrap);
        }

        const $searchInput = $searchWrap.find(".amqFriendPlusSearchInput");
        if ($searchInput.length) {
            $searchInput.val(friendListSearch);
        }

        const $gearButton = $searchWrap.find(".amqFriendPlusSearchGearButton");
        if ($gearButton.length) {
            $gearButton.toggleClass("is-active", friendAlertSettingsOpen);
        }

        renderFriendAlertSettingsPanel($friendList);
        $friendList.children().not($searchWrap).not(".amqFriendPlusSettingsPanel").remove();

        const sections = [
            { id: "playingFriends", title: "Playing Friends" },
            { id: "onlineFriends", title: "Online Friends" },
            { id: "offlineFriends", title: "Offline Friends" },
        ];

        sections.forEach(({ id, title }) => {
            const $section = $("<div>", { id, class: "amqFriendPlusSection" });
            const $title = $("<div>", { class: "amqFriendPlusSectionTitle" }).text(title);
            const $list = $("<div>", { class: "amqFriendPlusList" });
            $section.append($title, $list);
            $friendList.append($section);
        });

        const playingSection = $("#playingFriends .amqFriendPlusList");
        const onlineSection = $("#onlineFriends .amqFriendPlusList");
        const offlineSection = $("#offlineFriends .amqFriendPlusList");

        const entries = getFriendEntries().sort((a, b) => compareFriendOrder(a?.name, b?.name));

        entries.forEach((entry) => {
            if (!entry || !entry.name) return;
            const $row = renderFriendRow(entry, $friendList);
            if (!$row) return;

            const roomInfo = getFriendPlayingState(entry);
            const inOnlineMap = !!(socialTab?.onlineFriends && socialTab.onlineFriends[entry.name]);
            const inOfflineMap = !!(socialTab?.offlineFriends && socialTab.offlineFriends[entry.name]);
            const isOffline = inOfflineMap || (!inOnlineMap && (entry.offline === true || Number(entry.status ?? 1) === 0));
            const isPlaying = !isOffline && !!roomInfo;

            if (isPlaying) {
                playingSection.append($row);
            } else if (isOffline) {
                offlineSection.append($row);
            } else {
                onlineSection.append($row);
            }
        });

        applyFriendSearchFilter();

        const nextScrollMax = Math.max(0, ($friendList[0]?.scrollHeight || 0) - ($friendList[0]?.clientHeight || 0));
        const nextScrollTop = Math.min(previousScrollTop, nextScrollMax || 0);
        if (nextScrollMax > 0 || previousScrollMax > 0) {
            $friendList.scrollTop(nextScrollTop);
        }

        lastFriendRenderSignature = getFriendRenderSignature();
    };

    let rooms = [];
    let friends = new Set();
    let friendProfileSnapshot = [];
    let friendListSearch = "";
    let friendRenderTimer = null;
    let lastFriendRenderSignature = "";
    const pendingRoomMemberLeaves = new Map();

    const markPendingRoomLeave = (roomId, name) => {
        if (!roomId || !name) return;
        pendingRoomMemberLeaves.set(`${roomId}:${normalizeRoomMemberName(name)}`, Date.now());
    };

    const consumePendingRoomLeave = (roomId, name) => {
        if (!roomId || !name) return false;
        const key = `${roomId}:${normalizeRoomMemberName(name)}`;
        const existed = pendingRoomMemberLeaves.has(key);
        pendingRoomMemberLeaves.delete(key);
        return existed;
    };

    const getFriendRenderSignature = () => {
        const entries = getFriendEntries();
        return JSON.stringify(entries.map((entry) => {
            const roomInfo = getFriendRoomInfo(entry?.name, entry?.gameState);
            const playingState = getFriendPlayingState(entry);

            return {
                name: entry?.name ?? "",
                status: Number(entry?.status ?? 0),
                offline: !!entry?.offline,
                roomId: playingState?.roomId ?? roomInfo?.roomId ?? null,
                roomName: playingState?.roomName ?? roomInfo?.roomName ?? "",
                inLobby: playingState?.inLobby ?? false,
                privateRoom: playingState?.privateRoom ?? false,
                soloRoom: playingState?.soloRoom ?? false,
                isSpectator: playingState?.isSpectator ?? false,
                color: entry?.currentNameColorClass ?? "",
                glow: entry?.currentNameGlowClass ?? "",
                favorite: isFavoriteFriend(entry?.name),
            };
        }));
    };

    const scheduleFriendListRender = (force = false) => {
        const nextSignature = getFriendRenderSignature();
        if (!force && nextSignature === lastFriendRenderSignature) return;

        if (friendRenderTimer) {
            clearTimeout(friendRenderTimer);
        }

        friendRenderTimer = setTimeout(() => {
            friendRenderTimer = null;
            renderFriendListSections();
            updateFriendAlertStateSnapshot();
        }, 0);
    };

    const refreshFriends = () => {
        if (typeof socialTab === "undefined") return;
        friends = new Set([
            ...Object.keys(socialTab.onlineFriends),
            ...Object.keys(socialTab.offlineFriends),
        ]);
    };

    const snapshotFriendProfiles = () => {
        if (typeof socialTab === "undefined") return [];

        const allEntries = [
            ...Object.values(socialTab.onlineFriends ?? {}),
            ...Object.values(socialTab.offlineFriends ?? {}),
        ];

        friendProfileSnapshot = allEntries
            .map((entry) => {
                if (!entry || !entry.name) return null;

                const avatarInfo = entry.avatarInfo ? { ...entry.avatarInfo } : null;
                const saved = {
                    name: entry.name,
                    nameColor: entry.currentNameColorClass || null,
                    nameGlow: entry.currentNameGlowClass || null,
                    avatarInfo,
                };

                return avatarInfo || saved.nameColor || saved.nameGlow ? saved : null;
            })
            .filter(Boolean);

        return friendProfileSnapshot;
    };

    const restoreFriendProfiles = () => {
        if (typeof socialTab === "undefined" || !friendProfileSnapshot.length) return;

        const savedMap = new Map(friendProfileSnapshot.map((friend) => [friend.name, friend]));
        const entries = [
            ...Object.values(socialTab.onlineFriends ?? {}),
            ...Object.values(socialTab.offlineFriends ?? {}),
        ];

        entries.forEach((entry) => {
            const saved = savedMap.get(entry.name);
            if (!saved) return;

            if (saved.avatarInfo) {
                entry.updateAvatar(saved.avatarInfo);
            }

            entry.updateNameOptions(saved.nameColor, saved.nameGlow);
        });
    };

    // name is optional: covers a friend who just left (no longer in the lists)
    const hasFriend = (room, name) => {
        refreshFriends();

        if (name && friends.has(name)) return true;
        if (selfName && (room.host === selfName || (room.players ?? []).includes(selfName) || (room.spectators ?? []).includes(selfName))) return true;
        if (room.host && friends.has(room.host)) return true;
        if (Array.isArray(room.friendNames) && room.friendNames.some((n) => friends.has(n))) return true;

        return (
            (room.players ?? []).some((n) => friends.has(n)) ||
            (room.spectators ?? []).some((n) => friends.has(n))
        );
    };

    const parseRoom = (r) => ({
        roomId: r.id,
        host: r.host,
        roomName: r.settings?.roomName,
        players: (r.allPlayers?.players ?? []).map((p) => p.name),
        spectators: (r.allPlayers?.spectators ?? []).map((p) => p.name),
        friendNames: Array.isArray(r.friendNames) ? r.friendNames : [],
        inLobby: r.inLobby,
        privateRoom: r.settings?.privateRoom,
        soloRoom:
            !!r.settings?.soloMode ||
            !!r.soloMode ||
            r.settings?.gameMode === "Solo" ||
            (typeof r.settings?.roomName === "string" && r.settings.roomName.toLowerCase() === "solo"),
    });

    const isRelevantRoomUpdate = (room) => {
        if (!room) return false;
        refreshFriends();
        return hasFriend(room);
    };

    // Name in list: remove it (returns false). Name not in list: add it (returns true).
    const toggle = (list, name) => {
        const i = list.indexOf(name);
        if (i === -1) {
            list.push(name);
            return true;
        }
        list.splice(i, 1);
        return false;
    };

    const normalizeRoomMemberName = (name) => String(name ?? "").trim().toLowerCase();

    // room.friendNames isn't reliably populated for every room (notably rooms the current
    // user hosts themselves), so derive the friends actually in a room from its real
    // membership (host/players/spectators) instead of trusting that field alone.
    const updateFriendRowsForRoom = (room) => {
        if (!room) return;
        const names = new Set([room.host, ...(room.players ?? []), ...(room.spectators ?? []), ...(room.friendNames ?? [])]);
        names.forEach((name) => {
            if (name && friends.has(name)) {
                updateFriendRow(name);
            }
        });
    };

    const removeRoomMemberFromList = (room, listKey, name) => {
        if (!room || !name) return;

        const targetList = Array.isArray(room[listKey]) ? room[listKey] : [];
        const normalizedName = normalizeRoomMemberName(name);
        const nextIndex = targetList.findIndex((entry) => normalizeRoomMemberName(entry) === normalizedName);

        if (nextIndex >= 0) {
            targetList.splice(nextIndex, 1);
            room[listKey] = targetList;
        }
    };

    const syncRoomMemberState = (room, listKey, name, countOverride = null) => {
        if (!room || !name) return;

        const targetList = Array.isArray(room[listKey]) ? room[listKey] : [];
        const oppositeKey = listKey === "players" ? "spectators" : "players";
        const oppositeList = Array.isArray(room[oppositeKey]) ? room[oppositeKey] : [];

        const count = Number(countOverride);
        const hasExplicitEmptyState = Number.isFinite(count) && count === 0;

        if (hasExplicitEmptyState) {
            removeRoomMemberFromList(room, listKey, name);
            removeRoomMemberFromList(room, oppositeKey, name);
            return;
        }

        const normalizedName = normalizeRoomMemberName(name);
        const alreadyInTarget = targetList.some((entry) => normalizeRoomMemberName(entry) === normalizedName);
        if (!alreadyInTarget) {
            targetList.push(name);
        }

        const oppositeIndex = oppositeList.findIndex((entry) => normalizeRoomMemberName(entry) === normalizedName);
        if (oppositeIndex >= 0) {
            oppositeList.splice(oppositeIndex, 1);
        }

        room[listKey] = targetList;
        room[oppositeKey] = oppositeList;
    };

    const findRoomByMemberName = (memberName, preferredRoomId = null) => {
        if (!memberName) return null;

        const normalizedName = normalizeRoomMemberName(memberName);

        if (preferredRoomId) {
            const preferredRoom = findRoomFromRoomIdOrBrowser(preferredRoomId) ?? rooms.find((room) => room && room.roomId === preferredRoomId);
            if (preferredRoom) {
                const hasMember = [
                    preferredRoom.host,
                    ...(preferredRoom.players ?? []),
                    ...(preferredRoom.spectators ?? []),
                ].some((entry) => normalizeRoomMemberName(entry) === normalizedName);
                if (hasMember) return preferredRoom;
            }
        }

        return rooms.find((room) => room && (
            normalizeRoomMemberName(room.host) === normalizedName ||
            (room.players ?? []).some((entry) => normalizeRoomMemberName(entry) === normalizedName) ||
            (room.spectators ?? []).some((entry) => normalizeRoomMemberName(entry) === normalizedName)
        )) ?? null;
    };

    const applyExplicitMemberRole = (memberName, role, preferredRoomId = null) => {
        if (!memberName) return;

        const room = findRoomByMemberName(memberName, preferredRoomId);
        if (!room) return;

        const targetKey = role === "spectator" ? "spectators" : "players";
        const oppositeKey = targetKey === "players" ? "spectators" : "players";
        const normalizedName = normalizeRoomMemberName(memberName);

        removeRoomMemberFromList(room, targetKey, memberName);
        removeRoomMemberFromList(room, oppositeKey, memberName);

        const targetList = Array.isArray(room[targetKey]) ? room[targetKey] : [];
        if (!targetList.some((entry) => normalizeRoomMemberName(entry) === normalizedName)) {
            targetList.push(memberName);
        }
        room[targetKey] = targetList;
        updateFriendRow(memberName);
        updateFriendAlertStateSnapshot();
    };

    // By the time #loadingScreen loses its "hidden" class, AMQ's own "login complete" handler
    // has already run socialTab.setup() synchronously with the full friend roster (see
    // setup.js), so there's nothing left to race against here — no delay or retry needed.
    const setup = () => {
        patchAllPlayersListFiltering();
        ensureSocialTabSize();
        refreshFriends();
        snapshotFriendProfiles();
        applyAllUsersSearchFilter();
        scheduleFriendListRender(true);
        // AMQ's own room browser sends this the same way (see roomBrowser.js openView) with no
        // wait, and the response is handled whenever it lands by the "New Rooms" listener.
        socket.sendCommand({
            type: "roombrowser",
            command: "get rooms",
        });
    };

    new Listener("new friend", (friend) => {
        const name = friend?.name;
        setTimeout(() => {
            ensureSocialTabSize();
            refreshFriends();
            snapshotFriendProfiles();
            if (name) {
                updateFriendRow(name);
            } else {
                scheduleFriendListRender(true);
            }
        }, 0);
    }).bindListener();

    new Listener("friend removed", (payload) => {
        const name = payload?.data?.name ?? payload?.name;
        if (!name) return;

        setTimeout(() => {
            ensureSocialTabSize();
            refreshFriends();
            if (typeof socialTab?.removeFriend === "function") {
                socialTab.removeFriend(name);
            }
            updateFriendRow(name);
        }, 0);
    }).bindListener();

    new Listener("friend state change", (friend) => {
        const name = friend?.name;
        // deferred so socialTab has updated its own lists first
        setTimeout(() => {
            ensureSocialTabSize();
            refreshFriends();
            snapshotFriendProfiles();
            if (name) {
                // This event only ever fires for a real offline<->online transition (the initial
                // roster is populated separately, synchronously, before this listener can even
                // run), so it's safe to fire the alert straight from it rather than inferring it.
                if (friend.online) {
                    // A friend who's already flagged as playing when this fires didn't
                    // meaningfully "connect" from the list's point of view — room membership
                    // persists through brief connection hiccups, so they were showing up under
                    // Playing Friends the whole time. Only alert for a real online-and-idle arrival.
                    const matchingEntry = getFriendEntries().find((entry) => entry && entry.name === name);
                    if (!getFriendPlayingState(matchingEntry)) {
                        triggerFriendAlert("friendConnect", name);
                    }
                } else {
                    triggerFriendAlert("friendDisconnect", name);
                }
                updateFriendAlertStateSnapshot();
                updateFriendRow(name);
            } else {
                updateFriendAlertStateSnapshot();
                scheduleFriendListRender(true);
            }
        }, 0);
    }).bindListener();

    new Listener("friend name change", (payload) => {
        const oldName = payload?.oldName ?? payload?.data?.oldName;
        const newName = payload?.newName ?? payload?.data?.newName;
        if (!oldName || !newName || oldName === newName) return;

        renameFavoriteFriend(oldName, newName);

        const idx = friendProfileSnapshot.findIndex((friend) => friend.name === oldName);
        if (idx !== -1) {
            friendProfileSnapshot[idx].name = newName;
        }

        refreshFriends();
        updateFriendRow(newName, oldName);
    }).bindListener();

    new Listener("friend profile image change", (payload) => {
        if (!payload || !payload.name) return;

        const idx = friendProfileSnapshot.findIndex((friend) => friend.name === payload.name);
        if (idx !== -1) {
            friendProfileSnapshot[idx].avatarInfo = payload.profileImage ?? friendProfileSnapshot[idx].avatarInfo;
        }

        const entries = [
            ...Object.values(socialTab?.onlineFriends ?? {}),
            ...Object.values(socialTab?.offlineFriends ?? {}),
        ];
        const match = entries.find((entry) => entry && entry.name === payload.name);
        if (match) {
            match.avatarInfo = payload.profileImage ?? match.avatarInfo;
        }

        updateFriendRow(payload.name);
    }).bindListener();

    new Listener("friend profile name option change", (payload) => {
        if (!payload || !payload.name) return;

        const idx = friendProfileSnapshot.findIndex((friend) => friend.name === payload.name);
        if (idx !== -1) {
            friendProfileSnapshot[idx].nameColor = payload.nameColorClass ?? friendProfileSnapshot[idx].nameColor;
            friendProfileSnapshot[idx].nameGlow = payload.nameGlowClass ?? friendProfileSnapshot[idx].nameGlow;
        }

        const entries = [
            ...Object.values(socialTab?.onlineFriends ?? {}),
            ...Object.values(socialTab?.offlineFriends ?? {}),
        ];
        const match = entries.find((entry) => entry && entry.name === payload.name);
        if (match) {
            match.currentNameColorClass = payload.nameColorClass ?? match.currentNameColorClass;
            match.currentNameGlowClass = payload.nameGlowClass ?? match.currentNameGlowClass;
        }

        updateFriendRow(payload.name);
    }).bindListener();

    new Listener("friend social status change", (payload) => {
        const data = payload?.data ?? payload;
        const name = data?.name;
        if (!name) return;

        refreshFriends();

        const socialStatus = data.socialStatus ?? 1;
        const gameState = data.gameState ?? null;

        const entries = [
            ...Object.values(socialTab?.onlineFriends ?? {}),
            ...Object.values(socialTab?.offlineFriends ?? {}),
        ];

        const match = entries.find((entry) => entry && entry.name === name);
        if (!match) return;

        match.status = socialStatus;
        match.gameState = gameState;
        if (typeof match.updateStatus === "function") {
            match.updateStatus(socialStatus, gameState, false);
        }

        const idx = friendProfileSnapshot.findIndex((friend) => friend.name === name);
        if (idx !== -1) {
            friendProfileSnapshot[idx].nameColor = match.currentNameColorClass ?? friendProfileSnapshot[idx].nameColor;
            friendProfileSnapshot[idx].nameGlow = match.currentNameGlowClass ?? friendProfileSnapshot[idx].nameGlow;
        }

        updateFriendRow(name);
        updateFriendAlertStateSnapshot();
    }).bindListener();

    new Listener("Player Changed To Spectator", (payload) => {
        const data = payload?.data ?? payload;
        const name = data?.spectatorDescription?.name ?? data?.playerDescription?.name ?? data?.name;
        if (!name) return;

        applyExplicitMemberRole(name, "spectator", data?.roomId ?? null);
    }).bindListener();

    new Listener("Spectator Change To Player", (payload) => {
        const data = payload?.data ?? payload;
        const name = data?.name ?? data?.playerDescription?.name ?? data?.spectatorDescription?.name;
        if (!name) return;

        applyExplicitMemberRole(name, "player", data?.roomId ?? null);
    }).bindListener();

    new Listener("Player Left", (payload) => {
        const data = payload?.data ?? payload;
        const name = data?.player?.name ?? data?.name;
        if (!name) return;

        const room = findRoomByMemberName(name);
        if (!room) return;

        markPendingRoomLeave(room.roomId, name);
        removeRoomMemberFromList(room, "players", name);
        removeRoomMemberFromList(room, "spectators", name);
        if (room.host && normalizeRoomMemberName(room.host) === normalizeRoomMemberName(name)) {
            room.host = null;
        }

        updateFriendRow(name);
        updateFriendAlertStateSnapshot();
    }).bindListener();

    // Full list on first call, then new rooms one by one.
    // The first batch is the authoritative room snapshot, even when no current friend is in a room yet.
    new Listener("New Rooms", (data) => {
        const incoming = (data.standard ?? []).map(parseRoom);
        if (!incoming.length) return;

        const isInitialRoomSnapshot = rooms.length === 0;
        const relevantIncoming = incoming.filter(isRelevantRoomUpdate);
        const relevantExistingMatches = rooms.filter((existing) => incoming.some((room) => room.roomId === existing.roomId) && isRelevantRoomUpdate(existing));

        if (!isInitialRoomSnapshot && !relevantIncoming.length && !relevantExistingMatches.length) {
            return;
        }

        ensureSocialTabSize();
        refreshFriends();
        snapshotFriendProfiles();
        const ids = new Set(incoming.map((r) => r.roomId));
        rooms = rooms.filter((r) => !ids.has(r.roomId)).concat(incoming);
        restoreFriendProfiles();

        if (isInitialRoomSnapshot) {
            // The "get rooms" request is sent right after login with no artificial delay, so on a
            // single ordered socket connection any "new friend"/"friend social status change"
            // pushes the server had already queued are guaranteed to arrive before this response.
            // That makes this batch a reliable point to start alert diffing — before it, friends
            // whose data simply hadn't arrived yet would look like fresh connects instead of
            // already-online friends.
            friendAlertBaselineReady = true;
            // First batch builds the list from scratch, so a full render is unavoidable here.
            scheduleFriendListRender(true);
            return;
        }

        // Later batches only ever touch a handful of rooms, so just update the friends they involve.
        const affectedFriendNames = new Set();
        [...relevantIncoming, ...relevantExistingMatches].forEach((room) => {
            if (!room) return;
            [room.host, ...(room.players ?? []), ...(room.spectators ?? []), ...(room.friendNames ?? [])].forEach((name) => {
                if (name && friends.has(name)) {
                    affectedFriendNames.add(name);
                }
            });
        });

        affectedFriendNames.forEach((name) => updateFriendRow(name));
        updateFriendAlertStateSnapshot();
    }).bindListener();

    new Listener("Room Change", (data) => {
        if (!data || !data.roomId) return;
        if (data.changeType === "songsLeft") return;

        const room = findRoomFromRoomIdOrBrowser(data.roomId) ?? rooms.find((r) => r && r.roomId === data.roomId);
        if (!room || !isRelevantRoomUpdate(room)) return;

        switch (data.changeType) {
            case "players": {
                if (!data.playerName) break;
                const playerCount = Number(data.playerCount ?? 0);
                const roomLeaveKey = `${data.roomId}:${normalizeRoomMemberName(data.playerName)}`;
                const normalizedName = normalizeRoomMemberName(data.playerName);
                const alreadyMarkedSpectator = (room.spectators ?? []).some((entry) => normalizeRoomMemberName(entry) === normalizedName);

                if (pendingRoomMemberLeaves.has(roomLeaveKey)) {
                    removeRoomMemberFromList(room, "players", data.playerName);
                    removeRoomMemberFromList(room, "spectators", data.playerName);
                    pendingRoomMemberLeaves.delete(roomLeaveKey);
                    updateFriendRow(data.playerName);
                    updateFriendAlertStateSnapshot();
                    break;
                }

                if (alreadyMarkedSpectator) {
                    removeRoomMemberFromList(room, "players", data.playerName);
                    updateFriendRow(data.playerName);
                    updateFriendAlertStateSnapshot();
                    break;
                }

                if (Number.isFinite(playerCount) && playerCount === 0) {
                    removeRoomMemberFromList(room, "players", data.playerName);
                    removeRoomMemberFromList(room, "spectators", data.playerName);
                    updateFriendRow(data.playerName);
                    updateFriendAlertStateSnapshot();
                    break;
                }
                syncRoomMemberState(room, "players", data.playerName, data.playerCount);
                updateFriendRow(data.playerName);
                updateFriendAlertStateSnapshot();
                break;
            }
            case "spectators": {
                if (!data.playerName) break;
                const spectatorCount = Number(data.spectatorCount ?? 0);
                if (Number.isFinite(spectatorCount) && spectatorCount === 0) {
                    removeRoomMemberFromList(room, "spectators", data.playerName);
                    updateFriendRow(data.playerName);
                    updateFriendAlertStateSnapshot();
                    break;
                }
                removeRoomMemberFromList(room, "players", data.playerName);
                syncRoomMemberState(room, "spectators", data.playerName, data.spectatorCount);
                updateFriendRow(data.playerName);
                updateFriendAlertStateSnapshot();
                break;
            }
            case "game start":
            case "game over": {
                room.inLobby = data.changeType === "game over";
                updateFriendRowsForRoom(room);
                updateFriendAlertStateSnapshot();
                break;
            }
            case "settings": {
                for (const key of ["roomName", "privateRoom"]) {
                    if (!(key in data.change)) continue;
                    room[key] = data.change[key];
                }
                updateFriendRowsForRoom(room);
                updateFriendAlertStateSnapshot();
                break;
            }
            case "Room Closed": {
                rooms = rooms.filter((r) => r && r.roomId !== data.roomId);
                break;
            }
        }
    }).bindListener();
})();
