// ==UserScript==
// @name         AMQ User List Search
// @namespace    https://github.com/Mxyuki/AMQ-Scripts
// @version      1.0.0
// @description  Adds a search bar to filter the users list in the social tab.
// @author       Myuki
// @match        https://animemusicquiz.com/*
// @downloadURL  https://github.com/Mxyuki/AMQ-Scripts/raw/main/amqUserListSearch.user.js
// @updateURL    https://github.com/Mxyuki/AMQ-Scripts/raw/main/amqUserListSearch.user.js
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
    const STYLE_ID = "asbp-search-style";
    const WRAPPER_ID = "asbp-search-wrapper";
    const INPUT_ID = "asbp-search-input";
    const COUNT_ID = "asbp-search-count";

    injectStyles();
    injectSearchBar();
    listenForOnlineUserChanges();

    function injectStyles() {
        if (document.getElementById(STYLE_ID)) return;

        const style = document.createElement("style");
        style.id = STYLE_ID;
        style.textContent = `
            #${WRAPPER_ID} {
                position: sticky;
                top: 0;
                z-index: 5;
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 6px 10px;
                background: rgba(15, 15, 20, 0.92);
                border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                box-sizing: border-box;
            }

            #${WRAPPER_ID} .asbp-icon {
                color: rgba(255, 255, 255, 0.5);
                font-size: 14px;
                flex-shrink: 0;
            }

            #${INPUT_ID} {
                flex: 1;
                min-width: 0;
                background: rgba(255, 255, 255, 0.06);
                border: 1px solid rgba(255, 255, 255, 0.12);
                border-radius: 4px;
                color: #fff;
                font-size: 13px;
                padding: 5px 8px;
                outline: none;
                transition: border-color 0.15s ease, background 0.15s ease;
            }

            #${INPUT_ID}::placeholder {
                color: rgba(255, 255, 255, 0.35);
            }

            #${INPUT_ID}:focus {
                border-color: rgba(255, 255, 255, 0.35);
                background: rgba(255, 255, 255, 0.1);
            }

            #${COUNT_ID} {
                color: rgba(255, 255, 255, 0.4);
                font-size: 11px;
                flex-shrink: 0;
                min-width: 34px;
                text-align: right;
                font-variant-numeric: tabular-nums;
            }

            #allUserList li.asbp-hidden,
            #friendlist li.asbp-hidden {
                display: none !important;
            }
        `;
        document.head.appendChild(style);
    }

    function injectSearchBar() {
        const socialTabContainer = document.getElementById("socialTabContainer");
        const allUserList = document.getElementById("allUserList");
        if (!socialTabContainer || !allUserList || document.getElementById(WRAPPER_ID)) return;

        const wrapper = document.createElement("div");
        wrapper.id = WRAPPER_ID;
        wrapper.innerHTML = `
            <i class="fa fa-search asbp-icon" aria-hidden="true"></i>
            <input id="${INPUT_ID}" type="text" placeholder="Search players..." autocomplete="off" spellcheck="false">
            <span id="${COUNT_ID}"></span>
        `;

        socialTabContainer.insertBefore(wrapper, socialTabContainer.firstChild);

        const input = wrapper.querySelector(`#${INPUT_ID}`);
        input.addEventListener("input", () => {
            filterList(input.value);
            scrollListToTop();
        });

        filterList("");
        syncVisibilityWithActiveTab();
    }

    function syncVisibilityWithActiveTab() {
        const wrapper = document.getElementById(WRAPPER_ID);
        const allTabButton = document.getElementById("socialTabAll");
        const friendsTabButton = document.getElementById("socialTabFriends");
        const profileTabButton = document.getElementById("socialTabProfile");
        if (!wrapper) return;

        const updateVisibility = () => {
            const isProfileTabActive = profileTabButton && profileTabButton.classList.contains("selected");
            wrapper.style.display = isProfileTabActive ? "none" : "flex";
        };

        updateVisibility();

        [allTabButton, friendsTabButton, profileTabButton].forEach((button) => {
            if (button) {
                button.addEventListener("click", () => {
                    setTimeout(() => {
                        updateVisibility();
                        const input = document.getElementById(INPUT_ID);
                        filterList(input ? input.value : "");
                    }, 0);
                });
            }
        });
    }

    function getActiveListContainer() {
        const allTabButton = document.getElementById("socialTabAll");
        const isOnlineTabActive = allTabButton && allTabButton.classList.contains("selected");

        return isOnlineTabActive
            ? document.getElementById("allUserList")
            : document.getElementById("friendlist");
    }

    function filterList(rawQuery) {
        const container = getActiveListContainer();
        const countEl = document.getElementById(COUNT_ID);
        if (!container) return;

        const query = rawQuery.trim().toLowerCase();
        const entries = container.querySelectorAll("li.socialTabPlayerEntry");

        let visibleCount = 0;

        entries.forEach((entry) => {
            const nameEl = entry.querySelector("h4");
            const name = nameEl ? nameEl.textContent.trim().toLowerCase() : "";
            const matches = query === "" || name.includes(query);

            entry.classList.toggle("asbp-hidden", !matches);
            if (matches) visibleCount++;
        });

        if (countEl) {
            countEl.textContent = query === ""
                ? `${entries.length}`
                : `${visibleCount}/${entries.length}`;
        }
    }

    function scrollListToTop() {
        const socialTabContainer = document.getElementById("socialTabContainer");
        if (!socialTabContainer) return;

        socialTabContainer.scrollTop = 0;
        socialTabContainer.dispatchEvent(new Event("scroll"));
    }

    function listenForOnlineUserChanges() {
        new Listener("online user change", () => {
            requestAnimationFrame(() => {
                const input = document.getElementById(INPUT_ID);
                filterList(input ? input.value : "");
            });
        }).bindListener();
    }
}
