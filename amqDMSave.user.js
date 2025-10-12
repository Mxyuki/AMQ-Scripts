// ==UserScript==
// @name         AMQ DM Save
// @namespace    https://github.com/Mxyuki/AMQ-Scripts
// @version      2.0
// @description  Save and restore DM messages and conversations across sessions
// @author       Myuki
// @match        https://animemusicquiz.com/*
// @grant        none
// @downloadURL  https://github.com/Mxyuki/AMQ-Scripts/raw/main/amqDMSave.user.js
// @updateURL    https://github.com/Mxyuki/AMQ-Scripts/raw/main/amqDMSave.user.js
// ==/UserScript==

if (document.querySelector("#loginPage")) return;

/* <-- Configuration --> */
const CONFIG = {
    maxMessagesPerChat: 100,
    loadDelay: 50,
    initDelay: 2000,
    badgeUpdateDelay: 100,
    highlightColor: "rgba(255, 215, 0, 0.15)",
    badgeColor: "#ff6b6b",
    badgeTextColor: "#ffffff"
};

/* <-- Application State --> */
const state = {
    messages: {},
    unreadChats: [],
    unreadMessages: {},
    loadedChats: new Set(),
    displayedMessages: new Set()
};

/* <-- Storage --> */
const Storage = {
    load(key, defaultValue) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (error) {
            console.log(`Storage load failed for ${key}`);
            return defaultValue;
        }
    },

    save(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (error) {
            console.log(`Storage save failed for ${key}`);
        }
    }
};

/* <-- Utilities --> */
function getTimestamp() {
    const now = new Date();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    return `${month}/${day} | ${hours}:${minutes}`;
}

function isChatOpen(chatName) {
    return $(`#chatBox-${chatName} > .chatBoxContainer`).hasClass("open");
}

/* <-- Message Management --> */
const Messages = {
    store(chatName, sender, message, timestamp) {
        if (!state.messages[chatName]) {
            state.messages[chatName] = [];
        }

        const msgKey = `${timestamp}_${sender}_${message}_${state.messages[chatName].length}`;

        state.messages[chatName].push({
            sender,
            message,
            timestamp,
            key: msgKey
        });

        if (state.messages[chatName].length > CONFIG.maxMessagesPerChat) {
            state.messages[chatName].shift();
        }

        Storage.save("amqDmMessages", state.messages);
        return msgKey;
    },

    markDisplayed(chatName, timestamp, sender, message) {
        state.displayedMessages.add(`${chatName}_${timestamp}_${sender}_${message}`);
    }
};

/* <-- Unread Management --> */
const Unread = {
    markMessage(chatName, msgKey) {
        if (!state.unreadMessages[chatName]) {
            state.unreadMessages[chatName] = [];
        }

        if (!state.unreadMessages[chatName].includes(msgKey)) {
            state.unreadMessages[chatName].push(msgKey);
            Storage.save("amqUnreadMessages", state.unreadMessages);
        }
    },

    clearMessages(chatName) {
        if (state.unreadMessages[chatName]) {
            delete state.unreadMessages[chatName];
            Storage.save("amqUnreadMessages", state.unreadMessages);
        }
    },

    isMessageUnread(chatName, msgKey) {
        return state.unreadMessages[chatName]?.includes(msgKey) || false;
    },

    getCount(chatName) {
        return state.unreadMessages[chatName]?.length || 0;
    },

    markChat(chatName) {
        if (!state.unreadChats.includes(chatName)) {
            state.unreadChats.push(chatName);
            Storage.save("amqUnreadDms", state.unreadChats);
        }
    },

    clearChat(chatName) {
        const index = state.unreadChats.indexOf(chatName);
        if (index > -1) {
            state.unreadChats.splice(index, 1);
            Storage.save("amqUnreadDms", state.unreadChats);
        }
    }
};

/* <-- UI Updates --> */
const UI = {
    updateBadge(chatName) {
        setTimeout(() => {
            const unreadCount = Unread.getCount(chatName);
            const $footer = $(`#chatBox-${chatName} .chatBoxFooter`);

            if (!$footer.length) return;

            $footer.find('.unread-badge').remove();

            if (unreadCount > 0 && !isChatOpen(chatName)) {
                $footer.css('position', 'relative').append(`
                    <span class="unread-badge" style="
                        position: absolute;
                        top: 12.5px;
                        right: 20px;
                        background-color: ${CONFIG.badgeColor};
                        color: ${CONFIG.badgeTextColor};
                        border-radius: 10px;
                        padding: 2px 6px;
                        font-size: 11px;
                        font-weight: bold;
                        min-width: 18px;
                        text-align: center;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                        z-index: 10;
                    ">${unreadCount}</span>
                `);
            }
        }, CONFIG.badgeUpdateDelay);
    },

    removeHighlight(chatName) {
        setTimeout(() => {
            $(`#chatBox-${chatName} .unread-message`).each(function() {
                $(this).css('background-color', '').removeClass('unread-message');
            });
        }, CONFIG.badgeUpdateDelay);
    },

    loadMessages(chatName) {
        if (state.loadedChats.has(chatName)) return;

        setTimeout(() => {
            const messages = state.messages[chatName];
            if (!messages?.length) return;

            const chatSelector = `#chatBox-${chatName}`;
            const $chatContent = $(`${chatSelector} > .chatBoxContainer > .chatContent`);
            const scrollbarSelector = `${chatSelector} > .chatBoxContainer > .chatContent > .ps__scrollbar-y-rail`;

            if (!$(scrollbarSelector).length) return;

            const messagesToLoad = messages.filter(msg => {
                const msgKey = `${chatName}_${msg.timestamp}_${msg.sender}_${msg.message}`;
                return !state.displayedMessages.has(msgKey);
            });

            if (messagesToLoad.length === 0) {
                state.loadedChats.add(chatName);
                return;
            }

            $(scrollbarSelector).after('<li class="previousMessage" style="padding-left: 4rem">--- Previous Messages ---</li>');

            for (let i = messagesToLoad.length - 1; i >= 0; i--) {
                const msg = messagesToLoad[i];
                const isUnread = Unread.isMessageUnread(chatName, msg.key);
                const highlightStyle = isUnread ? `style="background-color: ${CONFIG.highlightColor};"` : '';
                const unreadClass = isUnread ? 'unread-message' : '';

                $(scrollbarSelector).after(`
                    <li class="${unreadClass}" ${highlightStyle} data-chat="${chatName}">
                        <span class="dmTimestamp" style="opacity: 0.5">${msg.timestamp}</span>
                        <span class="dmUsername">${msg.sender}:</span>
                         ${msg.message}
                    </li>
                `);
            }

            $chatContent.scrollTop($chatContent.prop("scrollHeight"));
            $chatContent.perfectScrollbar('update');
            state.loadedChats.add(chatName);
        }, CONFIG.loadDelay);
    }
};

/* <-- Chat Initialization --> */
function restoreChats() {
    if (!window.socialTab?.chatBar) {
        setTimeout(restoreChats, 500);
        return;
    }

    state.unreadChats.forEach(chatName => {
        if (chatName && state.messages[chatName]?.length > 0) {
            socialTab.chatBar.getChat(chatName);
            setTimeout(() => UI.updateBadge(chatName), 200);
        }
    });
}

function hookChatBox() {
    if (!window.ChatBox) {
        setTimeout(hookChatBox, 500);
        return;
    }

    const OriginalChatBox = window.ChatBox;

    window.ChatBox = function(name, parentBar, modMessage) {
        OriginalChatBox.call(this, name, parentBar, modMessage);

        const originalOpenClose = this.openClose.bind(this);
        this.openClose = function() {
            const wasOpen = this.container.hasClass("open");
            originalOpenClose();

            if (!wasOpen) {
                Unread.clearChat(name);
                Unread.clearMessages(name);
            } else {
                UI.removeHighlight(name);
            }

            UI.updateBadge(name);
        };

        UI.updateBadge(name);

        if (state.messages[name]?.length > 0 && !state.loadedChats.has(name)) {
            UI.loadMessages(name);
        }
    };

    window.ChatBox.prototype = OriginalChatBox.prototype;
}

/* <-- Event Handlers --> */
new Listener("chat message", (payload) => {
    const timestamp = getTimestamp();
    const chatName = payload.sender;

    Messages.markDisplayed(chatName, timestamp, payload.sender, payload.message);
    const messageKey = Messages.store(chatName, payload.sender, payload.message, timestamp);

    if (!isChatOpen(chatName)) {
        Unread.markMessage(chatName, messageKey);
        Unread.markChat(chatName);
    }

    UI.updateBadge(chatName);
}).bindListener();

new Listener("chat message response", (payload) => {
    const timestamp = getTimestamp();
    const chatName = payload.target;

    Messages.markDisplayed(chatName, timestamp, selfName, payload.msg);
    Messages.store(chatName, selfName, payload.msg, timestamp);
}).bindListener();

/* <-- Initialize --> */
state.messages = Storage.load("amqDmMessages", {});
state.unreadChats = Storage.load("amqUnreadDms", []);
state.unreadMessages = Storage.load("amqUnreadMessages", {});

hookChatBox();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(restoreChats, CONFIG.initDelay));
} else {
    setTimeout(restoreChats, CONFIG.initDelay);
}

window.loadDmMessages = (chatName) => UI.loadMessages(chatName);
