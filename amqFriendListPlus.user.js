// ==UserScript==
// @name         AMQ Friend List Plus
// @namespace    https://github.com/Mxyuki/AMQ-Scripts
// @version      1.4.1
// @description  Update the Friends List to provide more information and make friend interactions more accessible, and rework the player profile with a roomier, tabbed editor.
// @author       Myuki
// @match        https://animemusicquiz.com/*
// @downloadURL  https://github.com/Mxyuki/AMQ-Scripts/raw/refs/heads/main/amqFriendListPlus.user.js
// @updateURL	 https://github.com/Mxyuki/AMQ-Scripts/raw/refs/heads/main/amqFriendListPlus.user.js
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

    // Same as AMQ's closeView, minus the command that stops room browser updates.
    RoomBrowser.prototype.closeView = function () {
        this.$view.addClass("hidden");
        roomFilter.reset();
        this._roomListner.unbindListener();
        Object.values(this.activeRooms).forEach((room) => {
            room.delete();
        });
        this.nexusRoomBrowser.reset();
        this.nexusRoomBrowser.stopListening();
        this.updateNumberOfRoomsText();
    };

    // Re-render when the daily quiz changes state, since that decides whether it shows as Ranked or Themed.
    if (typeof Ranked !== "undefined" && typeof Ranked.prototype?.updateState === "function" && !Ranked.prototype.__amqFriendPlusPatched) {
        Ranked.prototype.__amqFriendPlusPatched = true;
        const originalUpdateState = Ranked.prototype.updateState;
        Ranked.prototype.updateState = function () {
            const result = originalUpdateState.apply(this, arguments);
            if (typeof socialTab !== "undefined") {
                scheduleFriendListRender();
            }
            return result;
        };
    }

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
            .amqFriendPlusToggleRow {
                cursor: pointer;
                margin: 0;
            }
            .amqFriendPlusToggle {
                appearance: none;
                -webkit-appearance: none;
                position: relative;
                flex: 0 0 auto;
                width: 34px;
                height: 18px;
                margin: 0;
                border-radius: 999px;
                border: 1px solid rgba(255,255,255,0.12);
                background: rgba(255,255,255,0.08);
                cursor: pointer;
                transition: background 0.15s ease;
            }
            .amqFriendPlusToggle::after {
                content: "";
                position: absolute;
                top: 2px;
                left: 2px;
                width: 12px;
                height: 12px;
                border-radius: 50%;
                background: #dfe7ff;
                transition: transform 0.15s ease;
            }
            .amqFriendPlusToggle:checked {
                background: #4f7cff;
            }
            .amqFriendPlusToggle:checked::after {
                transform: translateX(16px);
            }
            .amqFriendPlusAlertModeSelect option {
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
                display: flex;
                align-items: center;
                justify-content: space-between;
                cursor: pointer;
                user-select: none;
            }
            .amqFriendPlusSectionTitle:hover {
                background: rgba(0,0,0,0.28);
            }
            .amqFriendPlusSectionArrow {
                font-size: 11px;
                transition: transform 0.15s ease;
            }
            .amqFriendPlusSection.is-collapsed .amqFriendPlusSectionTitle {
                border-bottom: none;
            }
            .amqFriendPlusSection.is-collapsed .amqFriendPlusSectionArrow {
                transform: rotate(-90deg);
            }
            .amqFriendPlusSection.is-collapsed .amqFriendPlusList {
                display: none;
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
            /* Outline, since the row's tint lives in an inline box-shadow. */
            .amqFriendPlusRow.is-profile-open {
                outline: 2px solid #4497ea;
                outline-offset: -2px;
            }
            /* Clicking the avatar opens the profile, so don't let it get text-selected or dragged. */
            .amqFriendPlusAvatarWrap,
            .amqFriendPlusAvatarWrap * {
                user-select: none;
                -webkit-user-select: none;
                -webkit-user-drag: none;
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
            /* Offline friends: grayscale also washes out custom name colors and glows. */
            .amqFriendPlusRow.is-offline .amqFriendPlusName {
                filter: grayscale(0.85) brightness(0.85);
                opacity: 0.6;
            }
            .amqFriendPlusRow.is-offline .amqFriendPlusAvatarWrap {
                filter: grayscale(0.6);
                opacity: 0.75;
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
    const FAVORITE_SECTION_STORAGE_KEY = "amqFriendListPlus.favoriteSection";

    const isFavoriteSectionEnabled = () => {
        try {
            return localStorage.getItem(FAVORITE_SECTION_STORAGE_KEY) === "true";
        } catch (err) {
            return false;
        }
    };

    const setFavoriteSectionEnabled = (enabled) => {
        try {
            localStorage.setItem(FAVORITE_SECTION_STORAGE_KEY, enabled ? "true" : "false");
        } catch (err) {
        }
    };

    // When on, profiles open through AMQ's own code, untouched by this script.
    const LEGACY_PROFILE_STORAGE_KEY = "amqFriendListPlus.legacyProfile";

    const isLegacyProfileEnabled = () => {
        try {
            return localStorage.getItem(LEGACY_PROFILE_STORAGE_KEY) === "true";
        } catch (err) {
            return false;
        }
    };

    const setLegacyProfileEnabled = (enabled) => {
        try {
            localStorage.setItem(LEGACY_PROFILE_STORAGE_KEY, enabled ? "true" : "false");
        } catch (err) {
        }
    };

    const COLLAPSED_SECTIONS_STORAGE_KEY = "amqFriendListPlus.collapsedSections";

    const getCollapsedSectionIds = () => {
        try {
            const parsed = JSON.parse(localStorage.getItem(COLLAPSED_SECTIONS_STORAGE_KEY) || "[]");
            return Array.isArray(parsed) ? parsed : [];
        } catch (err) {
            return [];
        }
    };

    const setSectionCollapsed = (sectionId, collapsed) => {
        const others = getCollapsedSectionIds().filter((id) => id !== sectionId);
        try {
            localStorage.setItem(COLLAPSED_SECTIONS_STORAGE_KEY, JSON.stringify(collapsed ? [...others, sectionId] : others));
        } catch (err) {
        }
    };

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
    let friendsSettingsOpen = false;
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

        // Connect/disconnect alerts are fired from the "friend state change" listener instead.
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

    const renderFriendsSettingsPanel = ($friendList) => {
        if (!$friendList || !$friendList.length) return;

        let $panel = $friendList.find(".amqFriendPlusSettingsPanel");
        if (!$panel.length) {
            $panel = $("<div>", { class: "amqFriendPlusSettingsPanel" });
            const $header = $("<div>", { class: "amqFriendPlusSettingsHeader" }).text("Friends Settings");
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

        const createToggleRow = (label, checked, onChange) => {
            const $toggle = $("<input>", { type: "checkbox", class: "amqFriendPlusToggle", checked });
            $toggle.on("change", (event) => onChange($(event.currentTarget).is(":checked")));
            return $("<label>", { class: "amqFriendPlusAlertRow amqFriendPlusToggleRow" }).append(
                $("<div>", { class: "amqFriendPlusAlertLabel" }).text(label),
                $toggle,
            );
        };

        $body.append(
            createToggleRow("Show a Favorite Friends section", isFavoriteSectionEnabled(), (enabled) => {
                setFavoriteSectionEnabled(enabled);
                scheduleFriendListRender(true);
            }),
            // An open profile keeps its style; the setting applies from the next one opened.
            createToggleRow("Use AMQ's original profile", isLegacyProfileEnabled(), setLegacyProfileEnabled),
        );

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

        $panel.toggleClass("is-open", friendsSettingsOpen);
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

    // Everything about where a friend is comes from the gameState the server sends with their status.
    // The room list is only used to put a name on the gameId, since gameState doesn't carry one.
    const getFriendPlayingState = (entry) => {
        const gameState = entry?.gameState;
        if (!gameState) return null;

        const roomId = gameState.gameId ?? null;
        const soloRoom = !!gameState.soloGame;
        const isSpectator = !!gameState.isSpectator;

        return {
            roomId,
            roomName: soloRoom ? "Solo" : roomNamesById.get(String(roomId)) || getSpecialRoomModeName(entry) || "Unknown room",
            inLobby: !!gameState.inLobby,
            privateRoom: !!gameState.private,
            soloRoom,
            isSpectator,
        };
    };

    // The daily quiz is either Ranked or Themed depending on the day; friends only tell us it's the daily quiz.
    const isThemedQuizDay = () => {
        if (typeof ranked === "undefined" || !ranked?.RANKED_STATE_IDS) return false;
        const ids = ranked.RANKED_STATE_IDS;
        return [ids.THEMED_OFFLINE, ids.THEMED_LOBBY, ids.THEMED_RUNNING, ids.THEMED_FINISHED].includes(ranked.currentState);
    };

    const getSpecialRoomModeName = (entry) => {
        const gameState = entry?.gameState;
        if (!gameState) return null;

        if (gameState.inNexusLobby) return "Nexus";
        if (gameState.isQuizOfTheDay) return isThemedQuizDay() ? "Themed" : "Ranked";
        if (gameState.isJam) return "Jam";
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

    // Sampling an image is slow, and the friend list and profile ask for the same players' colors.
    const profileTintCache = new Map();
    const getProfileTintColor = (entry) => {
        const avatarInfo = entry?.avatarInfo ?? {};
        const key = `${entry?.name || ""}|${avatarInfo.colorName || ""}|${getFriendProfileImageSrc(avatarInfo)}`;
        if (!profileTintCache.has(key)) {
            profileTintCache.set(key, computeProfileTintColor(entry));
        }
        return profileTintCache.get(key);
    };

    const computeProfileTintColor = async (entry) => {
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
            // Rows in a collapsed section aren't :visible, so check the filter's own display toggle.
            const hasVisibleRows = $section.find(".amqFriendPlusRow").filter((_, rowEl) => rowEl.style.display !== "none").length > 0;
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

    const getRoomDisplayName = (entry, roomInfo) => getSpecialRoomModeName(entry) || (roomInfo.soloRoom ? "Solo" : roomInfo.roomName || "Unknown room");

    // Join/Spectate for the room a friend is in. Shared by the friend rows and the profile.
    const createRoomButtons = (entry, roomInfo) => {
        if (!roomInfo || roomInfo.soloRoom) return [];

        if (!getSpecialRoomModeName(entry)) {
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

            return [$joinBtn, $spectateBtn];
        }

        if (entry.gameState?.isQuizOfTheDay || entry.gameState?.isJam) {
            const isJam = !!entry.gameState.isJam;
            const gameId = roomInfo.roomId;

            // Ranked hides the gameId from friends, so there's nothing to spectate by.
            if (gameId != null || isJam) {
                const $spectateBtn = $("<button>", {
                    class: "amqFriendPlusButton spectate",
                    text: "Spectate",
                    title: isJam ? `Spectate ${entry.name}'s Jam game` : `Spectate ${getRoomDisplayName(entry, roomInfo)}`,
                });
                $spectateBtn.on("click", () => {
                    if (gameId != null) {
                        roomBrowser.fireSpectateGame(gameId);
                    } else {
                        roomBrowser.fireJoinJamGame();
                    }
                });
                return [$spectateBtn];
            }
        }

        return [];
    };

    // Highlights the row of the friend whose profile is open (name null clears it).
    const markProfileOpenRow = (name) => {
        $("#friendlist .amqFriendPlusRow").each(function () {
            $(this).toggleClass("is-profile-open", !!name && $(this).data("friendName") === name);
        });
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

        const isProfileOpen = !!(playerProfileController.open && playerProfileController.currentProfile?.name === entry.name);
        const $row = $("<div>", {
            class: "amqFriendPlusRow" + (isOffline ? " is-offline" : "") + (isProfileOpen ? " is-profile-open" : ""),
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
            profileDockName = entry.name;
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
            const roomModeName = getSpecialRoomModeName(entry);
            // In a lobby, player/spectator switches don't send a status update, so don't show which one.
            const label = roomInfo.inLobby ? "In Lobby " : roomInfo.isSpectator ? "Spectating " : "Playing in ";
            const $prefix = $("<span>", { class: "amqFriendPlusRoomLabel" }).text(label);
            const roomDisplayName = getRoomDisplayName(entry, roomInfo);
            if (!roomModeName && !roomInfo.soloRoom && (!roomInfo.roomName || roomInfo.roomName === "Unknown room")) {
                requestRoomRefresh(roomInfo.roomId);
            }
            const $roomName = $("<strong>", { class: "amqFriendPlusRoomValue" }).text(roomDisplayName);
            $room.append($prefix, $roomName);
            $meta.append($room);

            if (roomInfo.privateRoom) {
                const $lock = $("<div>", { class: "amqFriendPlusLock" }).html('<i class="fa fa-lock" aria-hidden="true"></i>');
                $actions.append($lock);
            }

            if (!roomInfo.soloRoom) {
                $actions.append(...createRoomButtons(entry, roomInfo));

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

    // Where a friend belongs by what they're doing, ignoring the favorite section.
    const getFriendActivitySectionId = (entry) => {
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

    const FRIEND_ACTIVITY_RANK = { playingFriends: 0, onlineFriends: 1, offlineFriends: 2 };

    const getFriendRowSectionId = (entry) => {
        if (entry?.name && isFavoriteSectionEnabled() && isFavoriteFriend(entry.name)) return "favoriteFriends";
        return getFriendActivitySectionId(entry);
    };

    // Favorites first, then by name. In the favorite section: playing, then online, then offline.
    const compareFriendEntries = (entryA, entryB) => {
        const favoriteA = isFavoriteFriend(entryA?.name);
        const favoriteB = isFavoriteFriend(entryB?.name);
        if (favoriteA !== favoriteB) return favoriteA ? -1 : 1;

        if (favoriteA && isFavoriteSectionEnabled()) {
            const rankDiff = FRIEND_ACTIVITY_RANK[getFriendActivitySectionId(entryA)] - FRIEND_ACTIVITY_RANK[getFriendActivitySectionId(entryB)];
            if (rankDiff) return rankDiff;
        }

        return String(entryA?.name || "").localeCompare(String(entryB?.name || ""));
    };

    const insertRowSorted = ($list, $row, entry) => {
        const entriesByName = new Map(getFriendEntries().map((friend) => [friend.name, friend]));
        const insertBeforeRow = $list.children(".amqFriendPlusRow").toArray().find((rowEl) => {
            return compareFriendEntries(entry, entriesByName.get($(rowEl).data("friendName"))) < 0;
        });

        if (insertBeforeRow) {
            $(insertBeforeRow).before($row);
        } else {
            $list.append($row);
        }
    };

    // Re-render a single friend's row in place (previousName: the row's name before a rename).
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
            scheduleFriendListRender(true);
            return;
        }

        const $replacement = renderFriendRow(matchingEntry, $friendList);
        if (!$replacement) return;

        if ($existingRow.length) {
            $existingRow.remove();
        }

        insertRowSorted(targetSection.find(".amqFriendPlusList"), $replacement, matchingEntry);
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
                class: "amqFriendPlusSearchGearButton" + (friendsSettingsOpen ? " is-active" : ""),
                title: "Friends settings",
                "aria-label": "Friends settings",
                html: '<i class="fa fa-gear" aria-hidden="true"></i>',
            });
            $gearButton.on("click", () => {
                friendsSettingsOpen = !friendsSettingsOpen;
                renderFriendsSettingsPanel($friendList);
                $gearButton.toggleClass("is-active", friendsSettingsOpen);
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
            $gearButton.toggleClass("is-active", friendsSettingsOpen);
        }

        renderFriendsSettingsPanel($friendList);
        $friendList.children().not($searchWrap).not(".amqFriendPlusSettingsPanel").remove();

        const sections = [
            ...(isFavoriteSectionEnabled() ? [{ id: "favoriteFriends", title: "Favorite Friends" }] : []),
            { id: "playingFriends", title: "Playing Friends" },
            { id: "onlineFriends", title: "Online Friends" },
            { id: "offlineFriends", title: "Offline Friends" },
        ];

        const collapsedSectionIds = getCollapsedSectionIds();
        const sectionLists = {};
        sections.forEach(({ id, title }) => {
            const $section = $("<div>", {
                id,
                class: "amqFriendPlusSection" + (collapsedSectionIds.includes(id) ? " is-collapsed" : ""),
            });
            const $title = $("<div>", { class: "amqFriendPlusSectionTitle" }).append(
                $("<span>").text(title),
                $("<i>", { class: "fa fa-chevron-down amqFriendPlusSectionArrow", "aria-hidden": "true" }),
            );
            $title.on("click", () => {
                $section.toggleClass("is-collapsed");
                setSectionCollapsed(id, $section.hasClass("is-collapsed"));
            });
            const $list = $("<div>", { class: "amqFriendPlusList" });
            $section.append($title, $list);
            $friendList.append($section);
            sectionLists[id] = $list;
        });

        getFriendEntries().sort(compareFriendEntries).forEach((entry) => {
            if (!entry || !entry.name) return;
            const $row = renderFriendRow(entry, $friendList);
            if (!$row) return;

            sectionLists[getFriendRowSectionId(entry)].append($row);
        });

        applyFriendSearchFilter();

        const nextScrollMax = Math.max(0, ($friendList[0]?.scrollHeight || 0) - ($friendList[0]?.clientHeight || 0));
        const nextScrollTop = Math.min(previousScrollTop, nextScrollMax || 0);
        if (nextScrollMax > 0 || previousScrollMax > 0) {
            $friendList.scrollTop(nextScrollTop);
        }

        lastFriendRenderSignature = getFriendRenderSignature();
    };

    // Room names by gameId, from the room browser feed.
    const roomNamesById = new Map();
    let friendListSearch = "";
    let friendRenderTimer = null;
    let lastFriendRenderSignature = "";
    const requestedRoomRefreshIds = new Set();
    let roomRefreshTimer = null;

    // Re-request the room list for a room we don't know yet, once per room, debounced.
    const requestRoomRefresh = (roomId) => {
        if (roomId == null || requestedRoomRefreshIds.has(String(roomId))) return;
        requestedRoomRefreshIds.add(String(roomId));
        if (roomRefreshTimer) return;

        roomRefreshTimer = setTimeout(() => {
            roomRefreshTimer = null;
            // The open room browser already keeps the room list up to date.
            if (roomBrowser?.$view && !roomBrowser.$view.hasClass("hidden")) return;
            socket.sendCommand({
                type: "roombrowser",
                command: "get rooms",
            });
        }, 1500);
    };

    const getFriendNamesInGame = (roomId) => {
        if (roomId == null) return [];
        return getFriendEntries()
            .filter((entry) => entry?.gameState?.gameId != null && String(entry.gameState.gameId) === String(roomId))
            .map((entry) => entry.name);
    };

    const getFriendRenderSignature = () => {
        return JSON.stringify(getFriendEntries().map((entry) => ({
            name: entry?.name ?? "",
            status: Number(entry?.status ?? 0),
            offline: !!entry?.offline,
            playing: getFriendPlayingState(entry),
            color: entry?.currentNameColorClass ?? "",
            glow: entry?.currentNameGlowClass ?? "",
            favorite: isFavoriteFriend(entry?.name),
            section: getFriendRowSectionId(entry),
        })));
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

    const setup = () => {
        patchAllPlayersListFiltering();
        ensureSocialTabSize();
        applyAllUsersSearchFilter();
        scheduleFriendListRender(true);
        socket.sendCommand({
            type: "roombrowser",
            command: "get rooms",
        });
    };

    const findFriendEntry = (name) => getFriendEntries().find((entry) => entry && entry.name === name);

    new Listener("new friend", (friend) => {
        const name = friend?.name;
        setTimeout(() => {
            ensureSocialTabSize();
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
            if (name) {
                if (friend.online) {
                    // Friends already in a game didn't really go offline from the list's point of view.
                    if (!getFriendPlayingState(findFriendEntry(name))) {
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
        updateFriendRow(newName, oldName);
    }).bindListener();

    new Listener("friend profile image change", (payload) => {
        if (!payload || !payload.name) return;

        const match = findFriendEntry(payload.name);
        if (match) {
            match.avatarInfo = payload.profileImage ?? match.avatarInfo;
        }

        updateFriendRow(payload.name);
    }).bindListener();

    new Listener("friend profile name option change", (payload) => {
        if (!payload || !payload.name) return;

        const match = findFriendEntry(payload.name);
        if (match) {
            match.currentNameColorClass = payload.nameColorClass ?? match.currentNameColorClass;
            match.currentNameGlowClass = payload.nameGlowClass ?? match.currentNameGlowClass;
        }

        updateFriendRow(payload.name);
    }).bindListener();

    // The server's own description of where the friend is: lobby/playing/spectating, private, solo, gameId.
    new Listener("friend social status change", (payload) => {
        const data = payload?.data ?? payload;
        const name = data?.name;
        if (!name) return;

        const match = findFriendEntry(name);
        if (!match) return;

        // AMQ's social tab applies this too, but ours may run first.
        match.status = data.socialStatus ?? 1;
        match.gameState = data.gameState ?? null;

        updateFriendRow(name);
        updateFriendAlertStateSnapshot();
    }).bindListener();

    // Full room list on first call, then new rooms one by one. Only their names are needed.
    new Listener("New Rooms", (data) => {
        const incoming = data.standard ?? [];
        if (!incoming.length) return;

        incoming.forEach((room) => roomNamesById.set(String(room.id), room.settings?.roomName || ""));

        if (!friendAlertBaselineReady) {
            // First batch: the friend roster is loaded, so alert diffing can start.
            friendAlertBaselineReady = true;
            scheduleFriendListRender(true);
            return;
        }

        const affectedFriendNames = incoming.flatMap((room) => getFriendNamesInGame(room.id));
        if (!affectedFriendNames.length) return;

        ensureSocialTabSize();
        affectedFriendNames.forEach((name) => updateFriendRow(name));
        updateFriendAlertStateSnapshot();
    }).bindListener();

    new Listener("Room Change", (data) => {
        if (!data || data.roomId == null) return;
        const roomKey = String(data.roomId);

        if (data.changeType === "Room Closed") {
            roomNamesById.delete(roomKey);
            requestedRoomRefreshIds.delete(roomKey);
            return;
        }

        if (data.changeType === "settings" && data.change && "roomName" in data.change) {
            roomNamesById.set(roomKey, data.change.roomName || "");
            getFriendNamesInGame(data.roomId).forEach((name) => updateFriendRow(name));
        }
    }).bindListener();

    // ===================================================================================
    // Player profile
    // Replaces AMQ's profile popup everywhere it's opened. Same data and socket commands
    // as the original, laid out as a card that grows into a tabbed editor for your own profile.
    // ===================================================================================

    const PROFILE_EDIT_TAB_STORAGE_KEY = "amqFriendListPlus.profileEditTab";
    const PROFILE_CARD_WIDTH = 360;
    // Same values as AMQ's ProfileBadgeOptionContainer / ProfileOptionChatBadgeSlot.
    const PROFILE_BADGE_TYPES = [1, 2, 3, 4, 6, 7];
    const BADGE_TYPE_ORDER_WEIGHT = { 1: 90, 2: 100, 3: 1, 4: 10, 5: 1, 6: 95, 7: 100 };
    const CHAT_BADGE_ORDER_WEIGHT = { 1: 100, 2: 100, 3: 10, 4: 100, 5: 1 };
    // domain: where the favicon comes from.
    const LIST_SITES = {
        1: { name: "AniList", url: "https://anilist.co/user/", domain: "anilist.co" },
        2: { name: "Kitsu", url: "https://kitsu.app/users/", domain: "kitsu.app" },
        3: { name: "MyAnimeList", url: "https://myanimelist.net/profile/", domain: "myanimelist.net" },
        4: { name: "AnimeOshi", url: "https://animeoshi.com/profile/", domain: "animeoshi.com" },
    };
    // Slot 1 is AMQ's big center badge; the profile shows all slots in one row in slot order.
    const BADGE_SLOT_LABELS = { 1: "Main slot", 2: "Slot 2", 3: "Slot 3", 4: "Slot 4", 5: "Slot 5", 6: "Slot 6", 7: "Slot 7", 8: "Slot 8", 9: "Slot 9" };
    // AMQ's SocialStatus ids; 4 is invisible, which friends see as offline.
    const STATUS_LABELS = {
        0: ["offline", "Offline"],
        1: ["online", "Online"],
        2: ["do_not_disturb", "Do Not Disturb"],
        3: ["away", "Away"],
        4: ["invisible", "Invisible"],
    };

    // Set when the friend list opens a profile, so the card docks beside the list instead of over it.
    let profileDockName = null;
    // The element AMQ positions the profile against, captured from calculateOffset.
    let lastProfileAnchorEl = null;

    const translate = (key, fallback = "") => {
        if (!key) return fallback;
        try {
            const value = localizationHandler.translate(key);
            return value && value !== key ? value : fallback || key;
        } catch (err) {
            return fallback || key;
        }
    };

    // Badge names/descriptions come as { key, values } objects.
    const translateInfo = (info) => {
        if (!info) return "";
        if (typeof info === "string") return translate(info);
        try {
            return localizationHandler.translate(info.key, info.values, true) || "";
        } catch (err) {
            return info.key || "";
        }
    };

    const getStatusLabel = (status) => {
        const [key, fallback] = STATUS_LABELS[status] || STATUS_LABELS[0];
        return translate(`menu_bar.friend_list.statuses.${key}`, fallback);
    };

    const sendProfileCommand = (command, data) => {
        socket.sendCommand({ type: "social", command, data });
    };

    const getStoredProfileTab = () => {
        try {
            return localStorage.getItem(PROFILE_EDIT_TAB_STORAGE_KEY) || "image";
        } catch (err) {
            return "image";
        }
    };

    const setStoredProfileTab = (tab) => {
        try {
            localStorage.setItem(PROFILE_EDIT_TAB_STORAGE_KEY, tab);
        } catch (err) {
        }
    };

    // The profile color drives borders and selections, so very dark colors get lifted until they read on #424242.
    const getVisibleAccent = (color) => {
        const match = hexToRgba(color, 1).match(/rgba\((\d+), (\d+), (\d+)/);
        if (!match) return "#4497ea";
        let [r, g, b] = match.slice(1).map(Number);
        const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
        const minLuminance = 0.5;
        if (luminance < minLuminance) {
            const mix = (minLuminance - luminance) / (1 - luminance);
            r = Math.round(r + (255 - r) * mix);
            g = Math.round(g + (255 - g) * mix);
            b = Math.round(b + (255 - b) * mix);
        }
        return `rgb(${r}, ${g}, ${b})`;
    };

    const applyProfileTint = (element, color) => {
        const accent = getVisibleAccent(color);
        element.style.setProperty("--app-accent", accent);
        element.style.setProperty("--app-accent-soft", hexToRgba(accent, 0.18));
        element.style.setProperty("--app-tint-strong", hexToRgba(color, 0.6));
        element.style.setProperty("--app-tint-weak", hexToRgba(color, 0.14));
    };

    const addProfileStyles = () => {
        // The editor reuses the friend list's toggle switch and Join/Spectate buttons.
        addFriendListStyles();
        if (document.getElementById("amqFriendListPlusProfileStyles")) return;

        const style = document.createElement("style");
        style.id = "amqFriendListPlusProfileStyles";
        style.textContent = `
            .amqProfilePlus {
                --app-accent: #4497ea;
                --app-accent-soft: rgba(68, 151, 234, 0.18);
                --app-tint-strong: rgba(68, 151, 234, 0.4);
                --app-tint-weak: rgba(68, 151, 234, 0.1);
                position: absolute;
                z-index: 500;
                width: ${PROFILE_CARD_WIDTH}px;
                display: flex;
                color: #dfe7ff;
                background-color: #424242;
                border: 1px solid rgba(255,255,255,0.08);
                border-radius: 10px;
                box-shadow: 0 0 10px 2px #000;
                font-size: 13px;
                overflow: hidden;
            }
            .amqProfilePlus *,
            .amqProfilePlus *::before,
            .amqProfilePlus *::after {
                box-sizing: border-box;
            }
            .amqProfilePlus.is-editing {
                position: fixed;
                left: 50% !important;
                top: 50% !important;
                transform: translate(-50%, -50%);
                width: min(1000px, calc(100vw - 32px));
                height: min(680px, calc(100vh - 32px));
            }
            /* The profile color fades in from the top-left, like the tint on friend rows. */
            .amqProfilePlus .appMain {
                position: relative;
                flex: 0 0 auto;
                width: ${PROFILE_CARD_WIDTH - 2}px;
                display: flex;
                flex-direction: column;
                overflow-y: auto;
                overflow-x: hidden;
                background: linear-gradient(165deg, var(--app-tint-strong) 0%, var(--app-tint-weak) 40%, rgba(66,66,66,0) 75%);
            }
            .amqProfilePlus.is-editing .appMain {
                width: 340px;
                border-right: 1px solid rgba(255,255,255,0.08);
            }
            .appMain,
            .appScroll {
                scrollbar-color: rgba(121, 146, 210, 0.7) rgba(15, 18, 26, 0.42);
            }
            .appMain::-webkit-scrollbar,
            .appScroll::-webkit-scrollbar {
                width: 9px;
            }
            .appMain::-webkit-scrollbar-track,
            .appScroll::-webkit-scrollbar-track {
                background: rgba(15, 18, 26, 0.5);
                border-radius: 999px;
            }
            .appMain::-webkit-scrollbar-thumb,
            .appScroll::-webkit-scrollbar-thumb {
                background: linear-gradient(180deg, rgba(152, 177, 255, 0.85), rgba(101, 120, 177, 0.62));
                border: 2px solid rgba(15, 18, 26, 0.8);
                border-radius: 999px;
            }

            /* ----- Header: avatar, name, list, join date ----- */
            .amqProfilePlus .appHeader {
                position: relative;
                display: flex;
                align-items: center;
                gap: 16px;
                padding: 16px 14px 14px 14px;
            }
            /* Blurred copy of the profile picture behind the header, fading out downwards. */
            .amqProfilePlus .appHeaderArt {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                object-fit: cover;
                transform: scale(1.3);
                filter: blur(22px) saturate(1.3);
                opacity: 0.3;
                pointer-events: none;
                -webkit-mask-image: linear-gradient(to bottom, #000 20%, transparent);
                mask-image: linear-gradient(to bottom, #000 20%, transparent);
            }
            .amqProfilePlus .appAvatar {
                position: relative;
                flex: 0 0 88px;
                width: 88px;
                height: 88px;
                border-radius: 12px;
                border: 3px solid #8d9098;
                background: rgba(0,0,0,0.35);
                box-shadow: 0 2px 10px rgba(0,0,0,0.5);
            }
            /* AMQ's avatar handler sizes this one (it adds .avatarDisplay), so it gets its own box. */
            .amqProfilePlus .appAvatarInner {
                position: absolute;
                inset: 0;
                width: auto;
                height: auto;
                border-radius: 9px;
                overflow: hidden;
            }
            .amqProfilePlus .appAvatarInner .avatarImage {
                left: 0;
                bottom: 0;
                width: 100%;
                height: 100%;
                object-fit: cover;
            }
            .amqProfilePlus.is-editing .appAvatar {
                cursor: pointer;
            }
            .amqProfilePlus.is-editing .appAvatar::after {
                content: "\\f040";
                font-family: FontAwesome;
                position: absolute;
                left: -6px;
                top: -6px;
                width: 22px;
                height: 22px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 5px;
                background: #4497ea;
                color: white;
                font-size: 11px;
            }
            .amqProfilePlus .appLevel {
                position: absolute;
                right: -8px;
                bottom: -8px;
                min-width: 32px;
                height: 22px;
                padding: 0 6px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 5px;
                background: #1b1b1b;
                border: 2px solid var(--app-accent);
                color: #fff;
                font-size: 12px;
                font-weight: 800;
                box-shadow: 0 2px 6px rgba(0,0,0,0.6);
            }
            .amqProfilePlus .appIdentity {
                position: relative;
                color: #fff;
                flex: 1;
                min-width: 0;
                display: flex;
                flex-direction: column;
                gap: 6px;
            }
            .amqProfilePlus .appNameLine {
                display: flex;
                align-items: center;
                gap: 6px;
                min-width: 0;
                padding-right: 28px;
            }
            .amqProfilePlus .appHeader.has-edit .appNameLine {
                padding-right: 92px;
            }
            .amqProfilePlus.is-editing .appHeader.has-edit .appNameLine {
                padding-right: 0;
            }
            /* Also carries AMQ's ppPlayerName class, whose rules position it absolutely. Color is left to the name color classes. */
            .amqProfilePlus .appName {
                position: static;
                transform: none;
                width: auto;
                word-break: normal;
                margin: 0;
                font-size: 20px;
                font-weight: 700;
                line-height: 1.2;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                min-width: 0;
            }
            /* Pulled up against the name, since .appIdentity's gap would detach it. */
            .amqProfilePlus .appOriginalName {
                margin-top: -6px;
                font-size: 11px;
                color: rgba(217,217,217,0.5);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .amqProfilePlus .appIconButton.appNicknameButton {
                display: none;
            }
            .amqProfilePlus.is-editing .appIconButton.appNicknameButton {
                display: inline-flex;
            }
            .amqProfilePlus .appMetaLine {
                display: flex;
                align-items: center;
                gap: 6px;
                min-width: 0;
                font-size: 12px;
                color: #b9c1d4;
                white-space: nowrap;
            }
            .amqProfilePlus .appListIcon {
                flex: 0 0 16px;
                width: 16px;
                height: 16px;
                border-radius: 3px;
            }
            .amqProfilePlus .appListSite {
                color: #dfe7ff;
                font-weight: 700;
            }
            .amqProfilePlus .appMetaValue {
                min-width: 0;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .amqProfilePlus .appListLine .appMetaValue a {
                color: #80c7ff;
                font-weight: 700;
            }
            .amqProfilePlus .appMetaLine.is-hidden .appMetaValue,
            .amqProfilePlus .appRow.is-hidden .appRowValue {
                opacity: 0.5;
            }
            .amqProfilePlus .appHiddenText {
                font-style: italic;
                font-weight: 600;
                color: rgba(217,217,217,0.5);
            }
            .amqProfilePlus .appListSelect {
                display: none;
                flex: 0 1 auto;
                max-width: 120px;
                padding: 2px 4px;
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 4px;
                background: #1b1b1b;
                color: #dfe7ff;
                font-size: 12px;
            }
            .amqProfilePlus.is-editing .appListSelect {
                display: block;
            }
            .amqProfilePlus.is-editing .appListSite {
                display: none;
            }
            .amqProfilePlus .appHeaderButtons {
                position: absolute;
                top: 10px;
                right: 10px;
                display: flex;
                gap: 4px;
                z-index: 2;
            }
            .amqProfilePlus .appIconButton {
                height: 26px;
                min-width: 26px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
                flex: 0 0 auto;
                padding: 0;
                border: none;
                border-radius: 5px;
                background: transparent;
                color: rgba(223,231,255,0.8);
                cursor: pointer;
                font-size: 15px;
            }
            .amqProfilePlus .appIconButton:hover {
                background: rgba(255,255,255,0.12);
                color: white;
            }
            .amqProfilePlus .appEyeToggle {
                height: 20px;
                min-width: 20px;
                font-size: 11px;
                color: rgba(217,217,217,0.45);
            }
            .amqProfilePlus .is-hidden > .appEyeToggle {
                color: #f2c94c;
            }
            /* ppFooterOptionIcon additional: AMQ's tutorial highlights the edit button through these classes. */
            .amqProfilePlus .appIconButton.appEditButton {
                position: static;
                width: auto;
                height: 26px;
                margin: 0;
                padding: 0 9px;
                opacity: 1;
                overflow: visible;
                border-radius: 5px;
                background: rgba(0,0,0,0.25);
                font-size: 13px;
                font-weight: 700;
            }
            .amqProfilePlus .appIconButton.appEditButton > i {
                position: static;
                transform: none;
                font-size: 13px;
            }
            .amqProfilePlus.is-editing .appEditButton {
                display: none;
            }

            /* ----- Badges: one row, slot order ----- */
            .amqProfilePlus .appBadgeRow {
                display: grid;
                grid-template-columns: repeat(9, 1fr);
                gap: 5px;
                padding: 2px 14px 14px 14px;
            }
            .amqProfilePlus .appBadgeSlot {
                position: relative;
                aspect-ratio: 1;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 3px;
                border-radius: 8px;
                background: rgba(0,0,0,0.28);
                border: 1px solid rgba(255,255,255,0.08);
            }
            .amqProfilePlus .appBadgeSlot.is-main {
                border-color: var(--app-accent);
                box-shadow: inset 0 0 8px var(--app-accent-soft);
            }
            .amqProfilePlus .appBadgeSlot.is-empty {
                display: none;
            }
            .amqProfilePlus .appBadgeSlot img {
                max-width: 100%;
                max-height: 100%;
            }
            .amqProfilePlus.is-editing .appBadgeSlot {
                display: flex;
                cursor: pointer;
            }
            .amqProfilePlus.is-editing .appBadgeSlot.is-empty {
                border-style: dashed;
                border-color: rgba(255,255,255,0.18);
                background: rgba(0,0,0,0.15);
            }
            .amqProfilePlus.is-editing .appBadgeSlot:hover {
                border-color: rgba(255,255,255,0.4);
            }
            .amqProfilePlus.is-editing .appBadgeSlot.is-selected {
                border: 2px solid var(--app-accent);
                background: var(--app-accent-soft);
            }
            .amqProfilePlus .appBadgeSlotClear {
                display: none;
                position: absolute;
                top: -6px;
                right: -6px;
                width: 16px;
                height: 16px;
                align-items: center;
                justify-content: center;
                padding: 0;
                border: none;
                border-radius: 50%;
                background: #d9534f;
                color: white;
                font-size: 9px;
                cursor: pointer;
                z-index: 1;
            }
            .amqProfilePlus.is-editing .appBadgeSlot:not(.is-empty):hover .appBadgeSlotClear {
                display: inline-flex;
            }

            /* ----- Rows: room, stats ----- */
            .amqProfilePlus .appRow {
                display: flex;
                align-items: center;
                gap: 12px;
                min-height: 44px;
                padding: 8px 14px;
                border-top: 1px solid rgba(255,255,255,0.08);
            }
            .amqProfilePlus .appRowIcon {
                flex: 0 0 22px;
                text-align: center;
                font-size: 17px;
                color: rgba(223,231,255,0.7);
            }
            .amqProfilePlus .appRowLabel {
                flex: 1;
                min-width: 0;
                font-weight: 600;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .amqProfilePlus .appRowValue {
                font-weight: 800;
                color: #fff;
            }
            .amqProfilePlus .appRow.is-room {
                background: linear-gradient(90deg, rgba(56, 210, 105, 0.16) 0%, rgba(56, 210, 105, 0) 75%);
            }
            .amqProfilePlus .appRow.is-room .appRowIcon {
                color: #38d269;
            }
            .amqProfilePlus .appRow.is-room .appRowLabel {
                font-weight: 400;
                color: #b9c1d4;
            }
            .amqProfilePlus .appRow.is-room strong {
                color: #fff;
                font-weight: 800;
            }
            .amqProfilePlus .appRoomButtons {
                display: flex;
                align-items: center;
                gap: 6px;
                flex: 0 0 auto;
            }

            /* ----- Footer: icon actions ----- */
            .amqProfilePlus .appFooter {
                display: flex;
                justify-content: space-around;
                padding: 6px 8px;
                border-top: 1px solid rgba(255,255,255,0.08);
                background: rgba(0,0,0,0.15);
            }
            .amqProfilePlus .appFooterButton {
                width: 46px;
                height: 36px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                padding: 0;
                border: none;
                border-radius: 6px;
                background: transparent;
                color: rgba(223,231,255,0.8);
                font-size: 18px;
                cursor: pointer;
                transition: background 0.15s ease, color 0.15s ease;
            }
            .amqProfilePlus .appFooterButton:hover:not(:disabled) {
                background: rgba(255,255,255,0.08);
                color: #fff;
            }
            .amqProfilePlus .appFooterButton.is-danger:hover:not(:disabled) {
                background: rgba(255, 99, 99, 0.15);
                color: #ff9a9a;
            }
            .amqProfilePlus .appFooterButton:disabled {
                opacity: 0.3;
                cursor: not-allowed;
            }

            /* ----- Shared buttons (editor) ----- */
            .appButton {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
                padding: 6px 10px;
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 4px;
                background: rgba(255,255,255,0.06);
                color: #dfe7ff;
                font-size: 12px;
                font-weight: 700;
                cursor: pointer;
                white-space: nowrap;
                transition: background 0.15s ease, box-shadow 0.15s ease;
            }
            .appButton:hover:not(:disabled) {
                background: rgba(255,255,255,0.12);
            }
            /* AMQ's own primary button. */
            .appButton.is-primary {
                background-color: #4497ea;
                border-color: #006ab7;
                color: white;
            }
            .appButton.is-primary:hover:not(:disabled) {
                background-color: #4497ea;
                box-shadow: 0 0 10px 2px rgba(0, 106, 183, 0.65);
            }

            .appEditor {
                display: none;
                flex: 1;
                min-width: 0;
                flex-direction: column;
            }
            .amqProfilePlus.is-editing .appEditor {
                display: flex;
            }
            .appEditorTop {
                display: flex;
                align-items: stretch;
                background: #1b1b1b;
                border-bottom: 2px solid var(--app-accent);
            }
            .appTabs {
                flex: 1;
                display: flex;
            }
            .appTab {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                padding: 13px 16px 10px 16px;
                border: none;
                border-bottom: 3px solid transparent;
                background: transparent;
                color: rgba(217,217,217,0.6);
                font-size: 12px;
                font-weight: 700;
                letter-spacing: 0.05em;
                text-transform: uppercase;
                cursor: pointer;
            }
            .appTab:hover {
                color: white;
                background: rgba(255,255,255,0.04);
            }
            .appTab.is-active {
                color: white;
                background: var(--app-accent-soft);
                border-bottom-color: var(--app-accent);
            }
            .appDone {
                align-self: center;
                margin: 0 12px;
            }
            .appPanel {
                display: none;
                flex: 1;
                min-height: 0;
                flex-direction: column;
            }
            .appPanel.is-active {
                display: flex;
            }
            /* Toolbar and search match the friend list's search bar. */
            .appToolbar {
                display: flex;
                align-items: center;
                gap: 10px;
                margin: 12px 16px 10px 16px;
                padding: 6px 10px 6px 8px;
                background: rgb(59, 59, 59);
                border: 1px solid rgba(255,255,255,0.08);
                border-radius: 8px;
                box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
            }
            .appSearch {
                flex: 1;
                min-width: 0;
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
            .appSearch:focus {
                background: rgba(255,255,255,0.07);
            }
            .appSearch::placeholder {
                color: rgba(196, 206, 235, 0.8);
            }
            .appUnlockedToggle {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                margin: 0;
                font-size: 11px;
                font-weight: 700;
                letter-spacing: 0.04em;
                text-transform: uppercase;
                color: #dfe7ff;
                white-space: nowrap;
                cursor: pointer;
            }
            .appHint {
                margin: 0 16px 10px 16px;
                font-size: 12px;
                color: #b9c1d4;
            }
            .appHint strong {
                color: var(--app-accent);
            }
            .appScroll {
                flex: 1;
                min-height: 0;
                overflow-y: auto;
                padding: 0 16px 16px 16px;
            }
            .appGroupTitle {
                margin: 12px 0 8px 0;
                padding: 6px 10px;
                font-size: 11px;
                font-weight: 700;
                letter-spacing: 0.06em;
                text-transform: uppercase;
                color: #dfe7ff;
                background: rgba(0,0,0,0.18);
                border-radius: 6px;
            }
            .appGroupTitle:first-child {
                margin-top: 0;
            }
            .appGrid {
                display: grid;
                gap: 6px;
            }
            .appGrid.is-images {
                grid-template-columns: repeat(auto-fill, minmax(76px, 1fr));
            }
            .appGrid.is-badges {
                grid-template-columns: repeat(auto-fill, minmax(58px, 1fr));
            }
            .appGrid.is-names {
                grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
            }
            .appTile {
                position: relative;
                display: flex;
                align-items: center;
                justify-content: center;
                aspect-ratio: 1;
                padding: 6px;
                border: 2px solid transparent;
                border-radius: 6px;
                background: rgba(0,0,0,0.22);
                cursor: pointer;
                transition: background 0.12s ease, border-color 0.12s ease;
            }
            .appTile:hover {
                background: rgba(255,255,255,0.06);
                border-color: rgba(255,255,255,0.12);
            }
            .appTile img {
                max-width: 100%;
                max-height: 100%;
                object-fit: contain;
                pointer-events: none;
            }
            .appTile.is-selected,
            .appTile.is-selected:hover {
                border-color: var(--app-accent);
                background: var(--app-accent-soft);
            }
            .appTile.is-locked {
                cursor: default;
            }
            .appTile.is-locked img,
            .appTile.is-locked .appNamePreview {
                opacity: 0.3;
                filter: grayscale(0.8);
            }
            .appTile.is-locked::after {
                content: "\\f023";
                font-family: FontAwesome;
                position: absolute;
                right: 5px;
                bottom: 3px;
                font-size: 12px;
                color: rgba(217,217,217,0.6);
            }
            .appTile.is-avatar {
                flex-direction: column;
                gap: 2px;
            }
            .appTile.is-avatar img {
                max-height: calc(100% - 16px);
            }
            .appTileCaption {
                font-size: 10px;
                font-weight: 700;
                letter-spacing: 0.06em;
                text-transform: uppercase;
            }
            .appTileTag {
                position: absolute;
                top: 3px;
                left: 3px;
                padding: 0 4px;
                border-radius: 3px;
                background: #1b1b1b;
                border: 1px solid var(--app-accent);
                color: var(--app-accent);
                font-size: 9px;
                font-weight: 700;
                line-height: 13px;
            }
            .appTile.is-name {
                aspect-ratio: auto;
                flex-direction: column;
                gap: 2px;
                padding: 10px 8px;
                min-height: 60px;
            }
            .appNamePreview {
                max-width: 100%;
                font-size: 16px;
                font-weight: 700;
                color: #d9d9d9;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .appNameOptionName {
                max-width: 100%;
                font-size: 11px;
                color: #b9c1d4;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .appEmpty {
                padding: 30px;
                text-align: center;
                color: rgba(217,217,217,0.5);
            }
            .appChatPreview {
                display: flex;
                align-items: center;
                gap: 4px;
                margin: 0 16px 10px 16px;
                padding: 8px 12px;
                border-radius: 6px;
                background: #1b1b1b;
                min-height: 40px;
            }
            .appChatPreviewBadges {
                display: inline-flex;
                gap: 3px;
            }
            .appChatPreview img {
                width: 22px;
                height: 22px;
                object-fit: contain;
            }
            .appChatPreviewName {
                margin-left: 4px;
                font-size: 15px;
                font-weight: 700;
            }
            .appInfoBar {
                display: flex;
                align-items: center;
                gap: 12px;
                min-height: 62px;
                padding: 10px 16px;
                background: #1b1b1b;
            }
            .appInfoBar img {
                width: 42px;
                height: 42px;
                object-fit: contain;
                flex: 0 0 42px;
            }
            .appInfoText {
                min-width: 0;
                flex: 1;
            }
            .appInfoTitle {
                font-size: 13px;
                font-weight: 700;
                color: white;
            }
            .appInfoDescription {
                font-size: 12px;
                color: #b9c1d4;
            }
            .appInfoStatus {
                flex: 0 0 auto;
                font-size: 11px;
                font-weight: 700;
                letter-spacing: 0.05em;
                text-transform: uppercase;
                color: var(--app-accent);
            }
            .appInfoStatus.is-locked {
                color: #f2c94c;
            }
        `;
        document.head.appendChild(style);
    };

    const getAvatarHeadSources = (avatarInfo) => {
        if (!avatarInfo?.avatarName) return { src: "", srcSet: "" };
        const args = [avatarInfo.avatarName, avatarInfo.outfitName, avatarInfo.optionName, avatarInfo.optionActive, avatarInfo.colorName];
        return {
            src: cdnFormater.newAvatarHeadSrc(...args),
            srcSet: cdnFormater.newAvatarHeadSrcSet(...args),
        };
    };

    // draggable goes through attr: as a $("<img>", props) key, jQuery would call jQuery UI's .draggable()
    // on the image, which adds an inline position: relative.
    const createLazyImage = (src, srcSet, sizes) => $("<img>", {
        src,
        srcset: srcSet || undefined,
        sizes,
        loading: "lazy",
        decoding: "async",
        attr: { draggable: "false" },
    });

    const createBadgeImage = (fileName, sizes) => createLazyImage(cdnFormater.newBadgeSrc(fileName), cdnFormater.newBadgeSrcSet(fileName), sizes);

    const sortBadges = (badges) => [...badges].sort((a, b) => {
        if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
        const weightDiff = (BADGE_TYPE_ORDER_WEIGHT[b.type] || 0) - (BADGE_TYPE_ORDER_WEIGHT[a.type] || 0);
        if (weightDiff) return weightDiff;
        if (a.type === b.type && (a.type === 1 || a.type === 2)) {
            return String(a.fileName).localeCompare(String(b.fileName), undefined, { numeric: true, sensitivity: "base" });
        }
        return a.id - b.id;
    });

    const sortNameOptions = (options) => [...options].sort((a, b) => {
        if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
        return a.option.id - b.option.id;
    });

    class PlayerProfilePlus {
        constructor(profileInfo, offset, onClose, offline, inGame, placement = {}) {
            this.info = profileInfo;
            this.onClose = onClose;
            this.offline = !!offline;
            this.inGame = !!inGame;
            this.name = profileInfo.name;
            this.isSelf = profileInfo.name === selfName;
            this.editing = false;
            this.editorBuilt = false;
            this.viewOffset = offset;
            this.anchorEl = placement.anchorEl || null;
            this.dockToFriendList = !!placement.dockToFriendList;
            this.tintToken = 0;

            // Badges by id; for other players allBadges is empty and only the shown ones are sent.
            this.badges = new Map();
            (profileInfo.allBadges?.length ? profileInfo.allBadges : profileInfo.badges || []).forEach((badge) => {
                this.badges.set(badge.id, { ...badge });
            });
            this.slotBadges = {};
            for (let slot = 1; slot <= 9; slot++) this.slotBadges[slot] = null;
            (profileInfo.badges || []).forEach((badge) => {
                this.slotBadges[badge.slot] = badge.id;
            });
            this.selectedSlot = null;

            this.avatarImage = !!profileInfo.avatarProfileImage;
            this.emoteId = profileInfo.profileEmoteId;
            this.nameColorClass = profileInfo.nameColorClass || null;
            this.nameGlowClass = profileInfo.nameGlowClass || null;

            this.build();
            this.$profile.css({ top: `${offset.y}px`, left: `${offset.x}px` });

            this.keyHandler = (event) => {
                if (event.key !== "Escape") return;
                // Escape belongs to whatever dialog is on top (block confirm, nickname modal, ...).
                if ($(".swal2-container").length || $(".modal.in").length) return;
                const $target = $(event.target);
                if ($target.is(".appSearch") && $target.val()) {
                    $target.val("").trigger("input");
                    return;
                }
                if (this.editing) {
                    this.toggleEdit(false);
                } else {
                    playerProfileController.clearProfiles();
                }
            };
            $(document).on("keydown.amqProfilePlus", this.keyHandler);
        }

        build() {
            addProfileStyles();

            this.presence = this.getPresence();
            this.$profile = $("<div>", { class: "amqProfilePlus" });
            this.$main = $("<div>", { class: "appMain" });
            this.$main.append(this.buildHeader(), this.buildBadgeRow(), this.buildRoomRow(), ...this.buildStatRows(), this.buildFooter());
            this.$editor = $("<div>", { class: "appEditor" });
            this.$profile.append(this.$main, this.$editor);
            this.renderProfileImage();
        }

        // Steam-style presence: status for anyone, and the room for friends in one.
        getPresence() {
            if (this.isSelf) {
                const status = Number(socialTab?.socialStatus?.currentStatus ?? 1);
                return { status, text: getStatusLabel(status) };
            }

            const entry = findFriendEntry(this.name);
            if (entry) {
                if (getFriendActivitySectionId(entry) === "offlineFriends") return { status: 0, text: getStatusLabel(0) };

                const status = Number(entry.status ?? 1);
                const roomInfo = getFriendPlayingState(entry);
                if (!roomInfo) return { status, text: getStatusLabel(status) };

                // In a lobby, player/spectator switches don't send a status update, so don't show which one.
                return {
                    status,
                    text: roomInfo.inLobby ? "In Lobby" : roomInfo.isSpectator ? "Spectating" : "Playing in",
                    inRoom: true,
                    entry,
                    roomInfo,
                };
            }

            return this.offline ? { status: 0, text: getStatusLabel(0) } : { status: 1, text: getStatusLabel(1) };
        }

        // Visibility of a stat the server lets you hide, plus its eye toggle when it's your own profile.
        // Every place showing the stat registers a renderer, so the toggle refreshes all of them.
        createStatField(fieldName, field) {
            const stat = {
                hidden: !!field?.hidden,
                canSee: this.isSelf || !!field?.adminView,
                renderers: [],
                $toggle: null,
            };
            stat.render = () => stat.renderers.forEach((render) => render());
            stat.showHidden = () => stat.hidden && !stat.canSee;

            if (this.isSelf) {
                const $toggle = $("<button>", { type: "button", class: "appIconButton appEyeToggle" });
                const renderToggle = () => {
                    $toggle.html(`<i class="fa ${stat.hidden ? "fa-eye-slash" : "fa-eye"}" aria-hidden="true"></i>`);
                    $toggle.attr("title", stat.hidden ? "Hidden from other players, click to show" : "Visible to other players, click to hide");
                };
                $toggle.on("click", () => {
                    stat.hidden = !stat.hidden;
                    sendProfileCommand("player profile toggle hide", { fieldName });
                    renderToggle();
                    stat.render();
                });
                renderToggle();
                stat.$toggle = $toggle;
            }
            return stat;
        }

        createHiddenText() {
            return $("<span>", { class: "appHiddenText" }).text(translate("player_profile.hidden", "Hidden"));
        }

        buildHeader() {
            const $header = $("<div>", { class: "appHeader" + (this.isSelf ? " has-edit" : "") });
            this.$headerArt = $("<img>", { class: "appHeaderArt", alt: "", attr: { draggable: "false" } });

            const statusColor = statusColorByStatus[this.presence.status] ?? statusColorByStatus[0];
            this.$avatar = $("<div>", { class: "appAvatar", title: this.presence.text, css: { borderColor: statusColor } });
            this.$avatarInner = $("<div>", { class: "appAvatarInner" });
            this.avatarDisplayHandler = new AvatarHeadDisplayHandler(this.$avatarInner);
            this.$avatar.append(this.$avatarInner, $("<div>", { class: "appLevel", title: `Level ${this.info.level}` }).text(this.info.level));
            this.$avatar.on("click", () => {
                if (this.editing) this.showTab("image");
            });

            const $identity = $("<div>", { class: "appIdentity" });

            const $nameLine = $("<div>", { class: "appNameLine" });
            // ppPlayerName: the friend list uses it to tell whose profile is open.
            this.$name = $("<h3>", { class: "appName ppPlayerName" }).text(this.name);
            $nameLine.append(this.$name);
            if (this.isSelf) {
                const $nicknameButton = $("<button>", {
                    type: "button",
                    class: "appIconButton appNicknameButton",
                    title: translate("player_profile.change_nickname", "Change Nickname"),
                    html: '<i class="fa fa-pencil" aria-hidden="true"></i>',
                });
                $nicknameButton.on("click", () => nameChangeModal.show());
                $nameLine.append($nicknameButton);
            }

            // AMQ's profile swaps in the first name on hover; a fixed line avoids the hover area changing size under the mouse.
            const $originalName = this.info.originalName && this.info.originalName !== this.name
                ? $("<div>", { class: "appOriginalName", title: "Original name" }).text(this.info.originalName)
                : null;

            $identity.append($nameLine, $originalName, this.buildListLine(), this.buildJoinedLine());

            const $buttons = $("<div>", { class: "appHeaderButtons" });
            if (this.isSelf) {
                const $edit = $("<button>", {
                    type: "button",
                    class: "appIconButton appEditButton ppFooterOptionIcon additional",
                    title: translate("player_profile.edit", "Edit"),
                    html: '<i class="fa fa-pencil" aria-hidden="true"></i>',
                }).append($("<span>").text(translate("player_profile.edit", "Edit")));
                $edit.on("click", () => this.toggleEdit(true));
                $buttons.append($edit);
            }
            const $close = $("<button>", {
                type: "button",
                class: "appIconButton",
                title: "Close",
                html: '<i class="fa fa-times" aria-hidden="true"></i>',
            });
            $close.on("click", () => playerProfileController.clearProfiles());
            $buttons.append($close);

            this.applyNameEffects();
            $header.append(this.$headerArt, this.$avatar, $identity, $buttons);
            return $header;
        }

        buildListLine() {
            const list = this.info.list || {};
            const stat = this.createStatField("list", list);
            this.listState = { listId: LIST_SITES[list.listId] ? list.listId : 1, user: list.listUser, urlUser: list.listUserUrl };

            const $line = $("<div>", { class: "appMetaLine appListLine" });
            const $icon = $("<img>", { class: "appListIcon", alt: "", attr: { draggable: "false" } });
            $icon.on("error", () => $icon.css("visibility", "hidden"));
            const $site = $("<span>", { class: "appListSite" });
            const $value = $("<span>", { class: "appMetaValue" });
            $line.append($icon, $site);

            if (this.isSelf) {
                const $select = $("<select>", { class: "appListSelect", title: "Which list to show on your profile" });
                Object.entries(LIST_SITES).forEach(([id, site]) => {
                    $select.append($("<option>", { value: id, text: site.name, selected: Number(id) === this.listState.listId }));
                });
                $select.on("change", () => {
                    const listId = Number($select.val());
                    const user = options.getListUsername(listId);
                    this.listState = { listId, user, urlUser: user };
                    stat.render();
                    sendProfileCommand("player profile set list", { listId });
                });
                $line.append($select);
            }
            $line.append($value, stat.$toggle);

            stat.renderers.push(() => {
                const site = LIST_SITES[this.listState.listId];
                $icon.css("visibility", "").attr("src", `https://www.google.com/s2/favicons?domain=${site.domain}&sz=32`);
                $site.text(`${site.name}:`);
                $line.toggleClass("is-hidden", stat.hidden);
                if (stat.showHidden()) {
                    $value.empty().append(this.createHiddenText());
                } else if (this.listState.user) {
                    $value.empty().append($("<a>", {
                        href: site.url + encodeURIComponent(this.listState.urlUser || this.listState.user),
                        target: "_blank",
                        rel: "noopener",
                    }).text(this.listState.user));
                } else {
                    $value.text("-");
                }
            });
            stat.render();
            return $line;
        }

        buildJoinedLine() {
            const stat = this.createStatField("creationDate", this.info.creationDate);
            const $line = $("<div>", { class: "appMetaLine" });
            const $value = $("<span>", { class: "appMetaValue" });
            $line.append($("<span>").text("Joined"), $value, stat.$toggle);
            $line.attr("title", translate("player_profile.account_creation", "Account Creation"));

            stat.renderers.push(() => {
                $line.toggleClass("is-hidden", stat.hidden);
                if (stat.showHidden()) {
                    $value.empty().append(this.createHiddenText());
                } else {
                    $value.text(this.info.creationDate?.value ?? "-");
                }
            });
            stat.render();
            return $line;
        }

        buildBadgeRow() {
            this.$badgeRow = $("<div>", { class: "appBadgeRow" });
            this.$slots = {};

            for (let slot = 1; slot <= 9; slot++) {
                const $slot = $("<div>", { class: "appBadgeSlot" + (slot === 1 ? " is-main" : "") });
                const $clear = $("<button>", {
                    type: "button",
                    class: "appBadgeSlotClear",
                    title: "Remove badge",
                    html: '<i class="fa fa-times" aria-hidden="true"></i>',
                });
                $clear.on("click", (event) => {
                    event.stopPropagation();
                    this.clearSlot(slot);
                });
                $slot.append($clear);
                $slot.on("click", () => {
                    if (!this.editing) return;
                    this.selectSlot(slot);
                    this.showTab("badges");
                });
                $slot.on("mouseenter", () => this.showSlotInfo(slot));
                this.$slots[slot] = $slot;
                this.$badgeRow.append($slot);
            }

            this.renderSlots();
            return this.$badgeRow;
        }

        buildRoomRow() {
            const { inRoom, entry, roomInfo, text } = this.presence;
            if (!inRoom) return null;

            const $label = $("<div>", { class: "appRowLabel" }).append(
                $("<span>").text(`${text} `),
                $("<strong>").text(getRoomDisplayName(entry, roomInfo)),
            );
            if (roomInfo.roomId != null) {
                $label.append($("<span>", { class: "amqFriendPlusRoomId" }).text(` #${roomInfo.roomId}`));
            }

            const $buttons = $("<div>", { class: "appRoomButtons" });
            if (roomInfo.privateRoom) {
                $buttons.append($("<span>", { class: "amqFriendPlusLock", title: "Private room" }).html('<i class="fa fa-lock" aria-hidden="true"></i>'));
            }
            $buttons.append(...createRoomButtons(entry, roomInfo));

            return $("<div>", { class: "appRow is-room" }).append(
                $("<i>", { class: "fa fa-gamepad appRowIcon", "aria-hidden": "true" }),
                $label,
                $buttons,
            );
        }

        buildStatRows() {
            const createRow = (fieldName, icon, label, formatValue) => {
                const field = this.info[fieldName];
                const stat = this.createStatField(fieldName, field);
                const $value = $("<div>", { class: "appRowValue" });
                const $row = $("<div>", { class: "appRow" }).append(
                    $("<i>", { class: `fa ${icon} appRowIcon`, "aria-hidden": "true" }),
                    $("<div>", { class: "appRowLabel" }).text(label),
                    $value,
                    stat.$toggle,
                );

                stat.renderers.push(() => {
                    $row.toggleClass("is-hidden", stat.hidden);
                    if (stat.showHidden()) {
                        $value.empty().append(this.createHiddenText());
                    } else {
                        $value.text(field?.value != null ? formatValue(field.value) : "-");
                    }
                });
                stat.render();
                return $row;
            };

            return [
                createRow("songCount", "fa-music", translate("player_profile.songs_played", "Songs Played"), (value) => numberWithCommas(value) || String(value)),
                createRow("guessPercent", "fa-bullseye", translate("player_profile.guess_rate", "Guess Rate"), (value) => `${value}%`),
            ];
        }

        buildFooter() {
            if (this.isSelf) return null;

            const createButton = (icon, title, disabled, handler, className = "") => {
                const $button = $("<button>", {
                    type: "button",
                    class: `appFooterButton ${className}`,
                    title,
                    disabled: !!disabled,
                    html: `<i class="fa ${icon}" aria-hidden="true"></i>`,
                });
                $button.on("click", handler);
                return $button;
            };

            const isFriend = socialTab.isFriend(this.name);
            const isBlocked = socialTab.isBlocked(this.name);
            const offlineSuffix = this.offline ? " (offline)" : "";

            return $("<div>", { class: "appFooter" }).append(
                createButton("fa-comment", translate("common.ui.chat", "Chat") + offlineSuffix, this.offline, () => socialTab.startChat(this.name)),
                createButton("fa-gamepad", translate("common.ui.invite_to_game", "Invite to Game") + offlineSuffix, this.offline || this.inGame,
                    () => socialTab.sendGameInvite(this.name)),
                isFriend
                    ? createButton("fa-user-times", `Remove ${this.name} from your friendlist`, false, () => confirmRemoveFriend(this.name), "is-danger")
                    : createButton("fa-user-plus", translate("common.ui.send_friend_request", "Send Friend Request") + offlineSuffix, this.offline,
                        () => socialTab.sendFriendRequest(this.name)),
                createButton("fa-ban", isBlocked ? "Already blocked" : translate("common.ui.block", "Block"), isBlocked,
                    () => socialTab.confirmBlockPlayer(this.name), "is-danger"),
                createButton("fa-exclamation-triangle", translate("common.ui.report", "Report"), false, () => reportModal.show(this.name), "is-danger"),
            );
        }

        // ---------- Shared rendering ----------

        renderProfileImage() {
            this.avatarDisplayHandler.clear();
            const avatar = this.info.avatar || {};
            let src;
            let srcSet;

            if (this.avatarImage) {
                ({ src, srcSet } = getAvatarHeadSources(avatar));
                if (avatar.animated) {
                    const jsonSrc = cdnFormater.newAnimatedAvatarJsonSrc(avatar.avatarName, avatar.outfitName);
                    const atlasSrc = cdnFormater.newAnimatedAvatarAtlasSrc(avatar.avatarName, avatar.outfitName);
                    this.avatarDisplayHandler.displayAvatarAnimated(jsonSrc, atlasSrc, true, null, null, avatar.optionActive);
                } else {
                    this.avatarDisplayHandler.displayAvatarImage(src, srcSet, { triggerLoad: true, defaultSizes: "100px" });
                }
            } else {
                const emote = storeWindow.getEmote(this.emoteId);
                src = emote?.src || "";
                srcSet = emote?.srcSet || "";
                this.avatarDisplayHandler.displayAvatarImage(src, srcSet, { triggerLoad: true, defaultSizes: "100px" });
            }

            this.$headerArt.attr("src", src || null);
            this.updateTint();
        }

        // Same color as this player's row in the friend list.
        updateTint() {
            const token = ++this.tintToken;
            const avatarInfo = this.avatarImage ? { ...(this.info.avatar || {}), profileEmoteId: null } : { profileEmoteId: this.emoteId };
            getProfileTintColor({ name: this.name, avatarInfo }).then((color) => {
                if (token !== this.tintToken || !color) return;
                applyProfileTint(this.$profile[0], color);
            });
        }

        applyNameEffects() {
            [this.$name, this.$chatPreviewName].forEach(($el) => {
                if (!$el) return;
                $el.removeClass($el.data("effectClasses") || "");
                const classes = [this.nameColorClass, this.nameGlowClass].filter(Boolean).join(" ");
                $el.addClass(classes).data("effectClasses", classes);
            });
        }

        renderSlots() {
            const hasAny = Object.values(this.slotBadges).some((id) => id != null);
            this.$badgeRow.toggle(hasAny || this.editing);

            Object.entries(this.$slots).forEach(([slotKey, $slot]) => {
                const slot = Number(slotKey);
                const badge = this.badges.get(this.slotBadges[slot]);
                $slot.find("img").remove();
                $slot.toggleClass("is-empty", !badge);
                $slot.toggleClass("is-selected", this.editing && this.selectedSlot === slot);
                $slot.attr("title", badge && !this.editing ? translateInfo(badge.name) : null);
                if (badge) {
                    $slot.prepend(createBadgeImage(badge.fileName, "36px").attr("loading", null));
                }
            });
        }

        showSlotInfo(slot) {
            if (!this.editing) return;
            const badge = this.badges.get(this.slotBadges[slot]);
            if (badge) {
                this.setInfo(createBadgeImage(badge.fileName, "42px"), translateInfo(badge.name), translateInfo(badge.unlockDescription), `${BADGE_SLOT_LABELS[slot]}`);
            } else {
                this.setInfo(null, `${BADGE_SLOT_LABELS[slot]}`, "Empty. Click to select it, then pick a badge.", "");
            }
        }

        // ---------- Edit mode ----------

        toggleEdit(on) {
            if (!this.isSelf || on === this.editing) return;
            this.editing = on;
            this.selectedSlot = on ? this.firstEmptySlot() ?? 1 : null;

            if (on && !this.editorBuilt) {
                this.buildEditor();
                this.editorBuilt = true;
            }

            this.$profile.toggleClass("is-editing", on);
            if (on) {
                this.renderBadgeTiles();
                this.showTab(getStoredProfileTab());
                if (playerProfileController.editToggleOnListener) {
                    playerProfileController.editToggleOnListener();
                }
            }
            this.renderSlots();
            this.resizeName();
            if (!on) this.place();
        }

        buildEditor() {
            const $top = $("<div>", { class: "appEditorTop" });
            this.$tabs = $("<div>", { class: "appTabs" });
            this.$panels = {};

            const tabs = [
                { id: "image", icon: "fa-picture-o", label: translate("player_profile.profile_image", "Profile Image"), build: () => this.buildImagePanel() },
                { id: "badges", icon: "fa-certificate", label: "Badges", build: () => this.buildBadgePanel() },
                { id: "chat", icon: "fa-comments", label: "Chat Badges", build: () => this.buildChatBadgePanel() },
                { id: "name", icon: "fa-magic", label: translate("player_profile.name_effects", "Name Effects"), build: () => this.buildNamePanel() },
            ];

            const $panelWrap = $("<div>", { css: { flex: 1, minHeight: 0, display: "flex", flexDirection: "column" } });
            tabs.forEach(({ id, icon, label, build }) => {
                const $tab = $("<button>", { type: "button", class: "appTab", "data-tab": id, html: `<i class="fa ${icon}" aria-hidden="true"></i>` })
                    .append($("<span>").text(label));
                $tab.on("click", () => this.showTab(id));
                this.$tabs.append($tab);

                const $panel = $("<div>", { class: "appPanel", "data-tab": id });
                $panel.append(...build());
                this.$panels[id] = $panel;
                $panelWrap.append($panel);
            });

            const $done = $("<button>", { type: "button", class: "appButton is-primary appDone", html: '<i class="fa fa-check" aria-hidden="true"></i>' })
                .append($("<span>").text("Done"));
            $done.on("click", () => this.toggleEdit(false));
            $top.append(this.$tabs, $done);

            this.$infoBar = $("<div>", { class: "appInfoBar" });
            this.$editor.append($top, $panelWrap, this.$infoBar);
        }

        showTab(tabId) {
            if (!this.$panels?.[tabId]) tabId = "image";
            this.activeTab = tabId;
            setStoredProfileTab(tabId);
            this.$tabs.children().each((_, el) => $(el).toggleClass("is-active", $(el).data("tab") === tabId));
            Object.entries(this.$panels).forEach(([id, $panel]) => $panel.toggleClass("is-active", id === tabId));
            this.setDefaultInfo();
        }

        setDefaultInfo() {
            const hints = {
                image: ["Profile Image", "Pick your avatar or any unlocked emote. It updates right away."],
                badges: ["Badges", "Select a slot on the left (or use the highlighted one), then click a badge to place it there. Click a badge that's already shown to move it."],
                chat: ["Chat Badges", "Badges shown next to your name in chat. Special badges stack; only one standard badge can be shown at a time."],
                name: ["Name Effects", "Pick a color and a glow for your name. Hover locked effects to see how to unlock them."],
            };
            const [title, description] = hints[this.activeTab] || hints.image;
            this.setInfo(null, title, description, "");
        }

        setInfo($image, title, description, status, locked = false) {
            if (!this.$infoBar) return;
            this.$infoBar.empty();
            if ($image) this.$infoBar.append($image);
            const $text = $("<div>", { class: "appInfoText" }).append(
                $("<div>", { class: "appInfoTitle" }).text(title || ""),
                $("<div>", { class: "appInfoDescription" }).text(description || ""),
            );
            this.$infoBar.append($text);
            if (status) {
                this.$infoBar.append($("<div>", { class: "appInfoStatus" + (locked ? " is-locked" : "") }).text(status));
            }
        }

        // Search box + "unlocked only" toggle; calls onChange(searchText, unlockedOnly).
        buildToolbar(placeholder, onChange) {
            const $toolbar = $("<div>", { class: "appToolbar" });
            const $search = $("<input>", { type: "text", class: "appSearch", placeholder });
            const $toggleLabel = $("<label>", { class: "appUnlockedToggle" });
            const $toggle = $("<input>", { type: "checkbox", class: "amqFriendPlusToggle" });
            $toggleLabel.append($("<span>").text("Unlocked only"), $toggle);

            const update = () => onChange(String($search.val() || "").trim().toLowerCase(), $toggle.is(":checked"));
            $search.on("input", update);
            $toggle.on("change", update);
            $toolbar.append($search, $toggleLabel);
            return $toolbar;
        }

        // Shows/hides tiles by their data-search text and lock state, plus an empty message per grid.
        filterTiles($scroll, search, unlockedOnly) {
            $scroll.find(".appTile").each((_, el) => {
                const $tile = $(el);
                const matches = (!search || String($tile.data("search") || "").includes(search)) && (!unlockedOnly || !$tile.hasClass("is-locked"));
                $tile.toggle(matches);
            });
            $scroll.find(".appGrid").each((_, el) => {
                const $grid = $(el);
                const anyVisible = $grid.children(".appTile").filter((__, tile) => tile.style.display !== "none").length > 0;
                $grid.prev(".appGroupTitle").toggle(anyVisible);
                $grid.toggle(anyVisible);
            });
            const anyVisible = $scroll.find(".appTile").filter((_, tile) => tile.style.display !== "none").length > 0;
            $scroll.find(".appEmpty").toggle(!anyVisible);
        }

        // ---------- Profile image tab ----------

        buildImagePanel() {
            const $scroll = $("<div>", { class: "appScroll" });
            const $grid = $("<div>", { class: "appGrid is-images" });
            this.$imageTiles = new Map();

            const avatar = this.info.avatar || {};
            const avatarSources = getAvatarHeadSources(avatar);
            const $avatarTile = $("<div>", { class: "appTile is-avatar", "data-search": "avatar" })
                .append(createLazyImage(avatarSources.src, avatarSources.srcSet, "76px"))
                .append($("<div>", { class: "appTileCaption" }).text(translate("player_profile.avatar", "Avatar")));
            $avatarTile.on("click", () => this.selectProfileImage(true, null));
            $avatarTile.on("mouseenter", () => this.setInfo(null, translate("player_profile.avatar", "Avatar"), "Use your current avatar as profile image.", this.avatarImage ? "Selected" : ""));
            this.$imageTiles.set("avatar", $avatarTile);
            $grid.append($avatarTile);

            const emotes = storeWindow.getAllEmotes().slice().sort((a, b) => (a.unlocked === b.unlocked ? 0 : a.unlocked ? -1 : 1));
            emotes.forEach((emote) => {
                const $tile = $("<div>", {
                    class: "appTile" + (emote.unlocked ? "" : " is-locked"),
                    "data-search": String(emote.name || "").toLowerCase(),
                }).append(createLazyImage(emote.src, emote.srcSet, "76px"));
                $tile.on("click", () => {
                    if (emote.unlocked) this.selectProfileImage(false, emote.emoteId);
                });
                $tile.on("mouseenter", () => {
                    const status = !emote.unlocked ? "Locked" : !this.avatarImage && this.emoteId === emote.emoteId ? "Selected" : "";
                    this.setInfo(createLazyImage(emote.src, emote.srcSet, "42px"), emote.name, emote.unlocked ? "Click to use as profile image." : "Unlock this emote in the store to use it.", status, !emote.unlocked);
                });
                this.$imageTiles.set(emote.emoteId, $tile);
                $grid.append($tile);
            });

            $scroll.append($grid, $("<div>", { class: "appEmpty" }).text("No emotes match your search.").hide());
            const $toolbar = this.buildToolbar("Search emotes...", (search, unlockedOnly) => this.filterTiles($scroll, search, unlockedOnly));
            $scroll.on("mouseleave", () => this.setDefaultInfo());

            this.renderImageSelection();
            return [$toolbar, $scroll];
        }

        renderImageSelection() {
            if (!this.$imageTiles) return;
            this.$imageTiles.forEach(($tile, key) => {
                $tile.toggleClass("is-selected", key === "avatar" ? this.avatarImage : !this.avatarImage && key === this.emoteId);
            });
        }

        selectProfileImage(avatarImage, emoteId) {
            if (avatarImage && this.avatarImage) return;
            if (!avatarImage && !this.avatarImage && emoteId === this.emoteId) return;

            this.avatarImage = avatarImage;
            if (!avatarImage) this.emoteId = emoteId;
            this.renderProfileImage();
            this.renderImageSelection();
            sendProfileCommand("player profile set image", { avatarImage, emoteId });
        }

        // ---------- Badges tab ----------

        buildBadgePanel() {
            this.$badgeHint = $("<div>", { class: "appHint" });
            const $scroll = $("<div>", { class: "appScroll" });
            const $grid = $("<div>", { class: "appGrid is-badges" });
            this.$badgeTiles = new Map();

            sortBadges([...this.badges.values()].filter((badge) => PROFILE_BADGE_TYPES.includes(badge.type))).forEach((badge) => {
                const $tile = $("<div>", {
                    class: "appTile" + (badge.unlocked ? "" : " is-locked"),
                    "data-search": `${translateInfo(badge.name)} ${translateInfo(badge.unlockDescription)}`.toLowerCase(),
                }).append(createBadgeImage(badge.fileName, "58px"));
                $tile.on("click", () => {
                    if (badge.unlocked) this.placeBadge(badge.id);
                });
                $tile.on("mouseenter", () => {
                    const slot = this.getBadgeSlot(badge.id);
                    const status = !badge.unlocked ? "Locked" : slot != null ? `In ${BADGE_SLOT_LABELS[slot]}` : "";
                    this.setInfo(createBadgeImage(badge.fileName, "42px"), translateInfo(badge.name), translateInfo(badge.unlockDescription), status, !badge.unlocked);
                });
                this.$badgeTiles.set(badge.id, $tile);
                $grid.append($tile);
            });

            $scroll.append($grid, $("<div>", { class: "appEmpty" }).text("No badges match your search.").hide());
            $scroll.on("mouseleave", () => this.setDefaultInfo());
            const $toolbar = this.buildToolbar("Search badges...", (search, unlockedOnly) => this.filterTiles($scroll, search, unlockedOnly));

            this.renderBadgeTiles();
            return [$toolbar, this.$badgeHint, $scroll];
        }

        getBadgeSlot(badgeId) {
            const entry = Object.entries(this.slotBadges).find(([, id]) => id === badgeId);
            return entry ? Number(entry[0]) : null;
        }

        firstEmptySlot() {
            const order = [1, 2, 3, 4, 5, 6, 7, 8, 9];
            return order.find((slot) => this.slotBadges[slot] == null) ?? null;
        }

        selectSlot(slot) {
            this.selectedSlot = slot;
            this.renderSlots();
            this.renderBadgeTiles();
        }

        renderBadgeTiles() {
            if (this.$badgeHint) {
                this.$badgeHint.text("Placing into: ").append($("<strong>").text(`${BADGE_SLOT_LABELS[this.selectedSlot] || "Main slot"}`));
            }
            if (!this.$badgeTiles) return;
            this.$badgeTiles.forEach(($tile, badgeId) => {
                const slot = this.getBadgeSlot(badgeId);
                $tile.toggleClass("is-selected", slot != null && slot === this.selectedSlot);
                $tile.find(".appTileTag").remove();
                if (slot != null) {
                    $tile.append($("<div>", { class: "appTileTag" }).text(slot === 1 ? "MAIN" : String(slot)));
                }
            });
        }

        // Puts a badge in the selected slot. A badge already shown elsewhere moves, swapping with what was there.
        placeBadge(badgeId) {
            const targetSlot = this.selectedSlot ?? this.firstEmptySlot() ?? 1;
            const fromSlot = this.getBadgeSlot(badgeId);
            if (fromSlot === targetSlot) return;

            const displacedId = this.slotBadges[targetSlot];

            if (fromSlot != null) {
                sendProfileCommand("player profile clear badge", { slotNumber: fromSlot });
                this.slotBadges[fromSlot] = null;
            }
            if (displacedId != null) {
                sendProfileCommand("player profile clear badge", { slotNumber: targetSlot });
            }
            sendProfileCommand("player profile show badge", { slotNumber: targetSlot, badgeId });
            this.slotBadges[targetSlot] = badgeId;

            if (fromSlot != null && displacedId != null) {
                sendProfileCommand("player profile show badge", { slotNumber: fromSlot, badgeId: displacedId });
                this.slotBadges[fromSlot] = displacedId;
            }

            // Filling an empty slot moves on to the next empty one, so several badges can be placed in a row.
            if (displacedId == null && fromSlot == null) {
                this.selectedSlot = this.firstEmptySlot() ?? targetSlot;
            }
            this.renderSlots();
            this.renderBadgeTiles();
        }

        clearSlot(slot) {
            if (this.slotBadges[slot] == null) return;
            sendProfileCommand("player profile clear badge", { slotNumber: slot });
            this.slotBadges[slot] = null;
            this.selectedSlot = slot;
            this.renderSlots();
            this.renderBadgeTiles();
            this.showSlotInfo(slot);
        }

        // ---------- Chat badges tab ----------

        buildChatBadgePanel() {
            this.$chatPreview = $("<div>", { class: "appChatPreview" });
            this.$chatPreviewBadges = $("<span>", { class: "appChatPreviewBadges" });
            this.$chatPreviewName = $("<span>", { class: "appChatPreviewName" }).text(this.name);
            this.$chatPreview.append(this.$chatPreviewBadges, this.$chatPreviewName);
            this.applyNameEffects();

            const $scroll = $("<div>", { class: "appScroll" });
            const $specialGrid = $("<div>", { class: "appGrid is-badges" });
            const $standardGrid = $("<div>", { class: "appGrid is-badges" });
            this.$chatTiles = new Map();

            sortBadges([...this.badges.values()]).forEach((badge) => {
                const $tile = $("<div>", {
                    class: "appTile" + (badge.unlocked ? "" : " is-locked"),
                    "data-search": `${translateInfo(badge.name)} ${translateInfo(badge.unlockDescription)}`.toLowerCase(),
                }).append(createBadgeImage(badge.fileName, "58px"));
                $tile.on("click", () => {
                    if (badge.unlocked) this.toggleChatBadge(badge.id);
                });
                $tile.on("mouseenter", () => {
                    const status = !badge.unlocked ? "Locked" : badge.showInChat ? "Shown in chat" : badge.special ? "Special" : "Standard";
                    this.setInfo(createBadgeImage(badge.fileName, "42px"), translateInfo(badge.name), translateInfo(badge.unlockDescription), status, !badge.unlocked);
                });
                this.$chatTiles.set(badge.id, $tile);
                (badge.special ? $specialGrid : $standardGrid).append($tile);
            });

            $scroll.append(
                $("<div>", { class: "appGroupTitle" }).text(translate("player_profile.special_badges", "Special Badges")),
                $specialGrid,
                $("<div>", { class: "appGroupTitle" }).text(translate("player_profile.standard_badges", "Standard Badges")),
                $standardGrid,
                $("<div>", { class: "appEmpty" }).text("No badges match your search.").hide(),
            );
            $scroll.on("mouseleave", () => this.setDefaultInfo());
            const $toolbar = this.buildToolbar("Search badges...", (search, unlockedOnly) => this.filterTiles($scroll, search, unlockedOnly));

            this.renderChatBadges();
            return [$toolbar, this.$chatPreview, $scroll];
        }

        // Same rules as AMQ: special badges stack, only one standard badge at a time.
        toggleChatBadge(badgeId) {
            const badge = this.badges.get(badgeId);
            if (!badge) return;

            if (badge.showInChat) {
                badge.showInChat = false;
                sendProfileCommand("player profile clear chat badge", { badgeId });
            } else {
                if (!badge.special) {
                    this.badges.forEach((other) => {
                        if (other.showInChat && !other.special) other.showInChat = false;
                    });
                }
                badge.showInChat = true;
                sendProfileCommand("player profile set chat badge", { badgeId });
            }
            this.renderChatBadges();
        }

        renderChatBadges() {
            if (!this.$chatTiles) return;
            this.$chatTiles.forEach(($tile, badgeId) => $tile.toggleClass("is-selected", !!this.badges.get(badgeId)?.showInChat));

            this.$chatPreviewBadges.empty();
            [...this.badges.values()]
                .filter((badge) => badge.showInChat)
                .sort((a, b) => (CHAT_BADGE_ORDER_WEIGHT[a.type] || 0) - (CHAT_BADGE_ORDER_WEIGHT[b.type] || 0))
                .forEach((badge) => this.$chatPreviewBadges.append(createBadgeImage(badge.fileName, "22px").attr("loading", null)));
        }

        // ---------- Name effects tab ----------

        buildNamePanel() {
            const $scroll = $("<div>", { class: "appScroll" });
            const $colorGrid = $("<div>", { class: "appGrid is-names" });
            const $glowGrid = $("<div>", { class: "appGrid is-names" });
            this.nameTiles = { color: [], glow: [] };

            const addTile = (kind, $grid, { id, name, className, unlocked, active, unlockDescription }) => {
                const optionName = translate(name, name);
                const $preview = $("<div>", { class: "appNamePreview" }).text(this.name);
                const $tile = $("<div>", {
                    class: "appTile is-name" + (unlocked ? "" : " is-locked"),
                    "data-search": optionName.toLowerCase(),
                }).append($preview, $("<div>", { class: "appNameOptionName" }).text(optionName));

                const tile = { id, className, unlocked, $tile, $preview, kind };
                $tile.on("click", () => {
                    if (unlocked) this.selectNameOption(tile);
                });
                $tile.on("mouseenter", () => {
                    const isActive = kind === "color" ? this.nameColorClass === className : this.nameGlowClass === className;
                    this.setInfo(null, optionName, unlocked ? "Click to apply." : translate(unlockDescription, "Locked"), !unlocked ? "Locked" : isActive ? "Selected" : "", !unlocked);
                });
                if (active) {
                    if (kind === "color") this.nameColorClass = className;
                    else this.nameGlowClass = className;
                }
                this.nameTiles[kind].push(tile);
                $grid.append($tile);
            };

            addTile("color", $colorGrid, { id: 0, name: "common.ui.default", className: null, unlocked: true, active: false });
            sortNameOptions(this.info.nameColors || []).forEach(({ option, active, unlocked }) => {
                addTile("color", $colorGrid, { id: option.id, name: option.name, className: option.className, unlocked, active, unlockDescription: option.unlockDescription });
            });

            addTile("glow", $glowGrid, { id: 0, name: "common.ui.none", className: null, unlocked: true, active: false });
            sortNameOptions(this.info.nameGlows || []).forEach(({ option, active, unlocked }) => {
                addTile("glow", $glowGrid, { id: option.id, name: option.name, className: option.className, unlocked, active, unlockDescription: option.unlockDescription });
            });

            $scroll.append(
                $("<div>", { class: "appGroupTitle" }).text(translate("player_profile.name_color", "Name Color")),
                $colorGrid,
                $("<div>", { class: "appGroupTitle" }).text(translate("player_profile.name_glow", "Name Glow")),
                $glowGrid,
                $("<div>", { class: "appEmpty" }).text("No effects match your search.").hide(),
            );
            $scroll.on("mouseleave", () => this.setDefaultInfo());
            const $toolbar = this.buildToolbar("Search name effects...", (search, unlockedOnly) => this.filterTiles($scroll, search, unlockedOnly));

            this.renderNameTiles();
            return [$toolbar, $scroll];
        }

        selectNameOption(tile) {
            const current = tile.kind === "color" ? this.nameColorClass : this.nameGlowClass;
            if (current === tile.className) return;

            if (tile.kind === "color") {
                this.nameColorClass = tile.className;
                sendProfileCommand("update chat name color", { id: tile.id });
            } else {
                this.nameGlowClass = tile.className;
                sendProfileCommand("update chat glow color", { id: tile.id });
            }
            this.applyNameEffects();
            this.renderNameTiles();
        }

        // Color tiles preview with the current glow and glow tiles with the current color, so you see the combination.
        renderNameTiles() {
            if (!this.nameTiles) return;
            const renderTile = (tile, colorClass, glowClass, selected) => {
                tile.$preview.attr("class", ["appNamePreview", colorClass, glowClass].filter(Boolean).join(" "));
                tile.$tile.toggleClass("is-selected", selected);
            };
            this.nameTiles.color.forEach((tile) => renderTile(tile, tile.className, this.nameGlowClass, tile.className === this.nameColorClass));
            this.nameTiles.glow.forEach((tile) => renderTile(tile, this.nameColorClass, tile.className, tile.className === this.nameGlowClass));
        }

        // ---------- Controller interface ----------

        resizeName() {
            const nameEl = this.$name[0];
            if (!nameEl) return;
            let size = 20;
            nameEl.style.fontSize = `${size}px`;
            while (size > 13 && nameEl.scrollWidth > nameEl.clientWidth) {
                size--;
                nameEl.style.fontSize = `${size}px`;
            }
        }

        // From the friend list the card docks right of the list, centered on the friend's row.
        // Otherwise it sits beside whatever was clicked, measured with its real size.
        place() {
            if (this.editing) return;
            const card = this.$profile[0];
            const width = card.offsetWidth;
            const height = card.offsetHeight;
            const margin = 8;
            let left = this.viewOffset.x;
            let top = this.viewOffset.y;

            const rowEl = this.dockToFriendList
                ? $("#friendlist .amqFriendPlusRow").filter((_, row) => $(row).data("friendName") === this.name)[0]
                : null;
            const socialTabEl = document.getElementById("socialTab");
            const rowRect = rowEl?.getBoundingClientRect();

            if (rowRect?.height && socialTabEl) {
                left = socialTabEl.getBoundingClientRect().right + 10;
                top = rowRect.top + rowRect.height / 2 - height / 2;
            } else if (this.anchorEl?.isConnected) {
                const rect = this.anchorEl.getBoundingClientRect();
                left = rect.left + rect.width / 2 < window.innerWidth / 2 ? rect.right + margin : rect.left - width - margin;
                top = rect.top + rect.height / 2 < window.innerHeight / 2 ? rect.top : rect.bottom - height;
            }

            left = Math.min(Math.max(margin, left), window.innerWidth - width - margin);
            top = Math.min(Math.max(margin, top), window.innerHeight - height - margin);

            // Everything above is in screen coordinates; the card is positioned inside AMQ's profile layer,
            // which moves with #mainContainer when that gets scrolled.
            const layerRect = this.$profile[0].offsetParent?.getBoundingClientRect() ?? { left: 0, top: 0 };
            this.$profile.css({ left: `${left - layerRect.left}px`, top: `${top - layerRect.top}px` });
        }

        close() {
            if (this.onClose) this.onClose();
            $(document).off("keydown.amqProfilePlus");
            this.avatarDisplayHandler.clear();
            this.$profile.remove();
            markProfileOpenRow(null);
        }
    }

    if (typeof PlayerProfileController !== "undefined" && !PlayerProfileController.prototype.__amqFriendPlusPatched) {
        PlayerProfileController.prototype.__amqFriendPlusPatched = true;

        const originalCalculateOffset = PlayerProfileController.prototype.calculateOffset;
        const originalDisplayProfile = PlayerProfileController.prototype.displayProfile;
        // AMQ's own sizes, set in its constructor, for when the legacy profile is used.
        const legacySize = typeof playerProfileController !== "undefined"
            ? { width: playerProfileController.PROFILE_WIDTH, height: playerProfileController.PROFILE_HEIGHT }
            : { width: 300, height: 210.8 };

        // AMQ uses these for its first placement guess, before our card is measured.
        PlayerProfileController.prototype.calculateOffset = function ($requestObject) {
            const legacy = isLegacyProfileEnabled();
            this.PROFILE_WIDTH = legacy ? legacySize.width : PROFILE_CARD_WIDTH;
            this.PROFILE_HEIGHT = legacy ? legacySize.height : 380;
            lastProfileAnchorEl = $requestObject?.[0] || null;
            return originalCalculateOffset.apply(this, arguments);
        };

        PlayerProfileController.prototype.displayProfile = function (profileInfo, offset, closeHandler, offline, inGame) {
            if (isLegacyProfileEnabled()) {
                profileDockName = null;
                lastProfileAnchorEl = null;
                return originalDisplayProfile.apply(this, arguments);
            }

            this.clearProfiles();
            const placement = { anchorEl: lastProfileAnchorEl, dockToFriendList: profileDockName === profileInfo.name };
            profileDockName = null;
            lastProfileAnchorEl = null;

            this.currentProfile = new PlayerProfilePlus(profileInfo, offset, closeHandler, offline, inGame, placement);
            this.$PROFILE_LAYER.append(this.currentProfile.$profile);
            this.currentProfile.resizeName();
            this.currentProfile.place();
            this.open = true;
            markProfileOpenRow(profileInfo.name);
        };
    }
})();
