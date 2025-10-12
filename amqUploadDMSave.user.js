// ==UserScript==
// @name         AMQ Upload DM Save
// @namespace    https://github.com/Mxyuki/AMQ-Scripts
// @version      1.0.0
// @description  Save and restore upload system messages from AMQ
// @author       Myuki
// @match        https://animemusicquiz.com/*
// @grant        none
// @downloadURL  https://github.com/Mxyuki/AMQ-Scripts/raw/main/amqUploadDMSave.user.js
// @updateURL    https://github.com/Mxyuki/AMQ-Scripts/raw/main/amqUploadDMSave.user.js
// ==/UserScript==

if (document.querySelector("#loginPage")) return;

/* <-- Configuration --> */
const CONFIG = {
    systemUsername: "AMQ",
    maxMessages: 200,
    initDelay: 2000,
    loadDelay: 100,
    autoCreateChat: true
};

/* <-- Application State --> */
const state = {
    messages: [],
    chatOpened: false,
    displayedMessages: new Set()
};

/* <-- Storage Management --> */
const Storage = {
    load(key, defaultValue) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (error) {
            console.log(`Failed to load ${key} from storage`);
            return defaultValue;
        }
    },

    save(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (error) {
            console.log(`Failed to save ${key} to storage`);
        }
    }
};

/* <-- Utilities --> */
const Utils = {
    getTimestamp() {
        const now = new Date();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const day = now.getDate().toString().padStart(2, '0');
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        return `${month}/${day} | ${hours}:${minutes}`;
    },

    generateMessageKey(message, timestamp, index) {
        return `${timestamp}_${message.substring(0, 50)}_${index}`;
    }
};

/* <-- Message Management --> */
const MessageHandler = {
    store(message, timestamp) {
        const messageKey = Utils.generateMessageKey(message, timestamp, state.messages.length);

        state.messages.push({
            message: message,
            timestamp: timestamp,
            key: messageKey
        });

        if (state.messages.length > CONFIG.maxMessages) {
            state.messages.shift();
        }

        Storage.save("amqUploadMessages", state.messages);
        return messageKey;
    },

    markDisplayed(messageKey) {
        state.displayedMessages.add(messageKey);
    }
};

/* <-- Chat UI Management --> */
const ChatUI = {
    createChat() {
        if (!window.socialTab?.chatBar || state.chatOpened) return;

        try {
            const chat = socialTab.chatBar.getChat(CONFIG.systemUsername);
            state.chatOpened = true;

            setTimeout(() => this.removeGlowEffect(), 100);

            return chat;
        } catch (error) {
            console.log("Failed to create AMQ chat");
            return null;
        }
    },

    removeGlowEffect() {
        const $chatBox = $(`#chatBox-${CONFIG.systemUsername}`);
        if ($chatBox.length) {
            $chatBox.find('.chatBoxFooter .chatBoxTextGlow').removeClass('chatBoxTextGlow');
        }
    },

    loadMessages() {
        if (!state.messages.length) return;

        setTimeout(() => {
            const chatSelector = `#chatBox-${CONFIG.systemUsername}`;
            const $chatContent = $(`${chatSelector} > .chatBoxContainer > .chatContent`);
            const scrollbarSelector = `${chatSelector} > .chatBoxContainer > .chatContent > .ps__scrollbar-y-rail`;

            if (!$(scrollbarSelector).length) {
                console.log("Chat scrollbar not found, retrying...");
                setTimeout(() => this.loadMessages(), 500);
                return;
            }

            const messagesToLoad = state.messages.filter(msg =>
                !state.displayedMessages.has(msg.key)
            );

            if (messagesToLoad.length === 0) return;

            $(scrollbarSelector).after(
                '<li class="previousMessage" style="padding-left: 4rem">--- Previous Messages ---</li>'
            );

            for (let i = messagesToLoad.length - 1; i >= 0; i--) {
                const msg = messagesToLoad[i];

                $(scrollbarSelector).after(`
                    <li data-msg-key="${msg.key}">
                        <span class="dmTimestamp" style="opacity: 0.5">${msg.timestamp}</span>
                        <span class="dmUsername">${CONFIG.systemUsername}:</span>
                         ${msg.message}
                    </li>
                `);

                MessageHandler.markDisplayed(msg.key);
            }

            $chatContent.scrollTop($chatContent.prop("scrollHeight"));
            $chatContent.perfectScrollbar('update');

            console.log(`Loaded ${messagesToLoad.length} upload messages`);
        }, CONFIG.loadDelay);
    }
};

/* <-- Socket Listener Hook --> */
function setupSocketListener() {
    if (!window.Listener) {
        setTimeout(setupSocketListener, 500);
        return;
    }

    new Listener("server message", (payload) => {
        const timestamp = Utils.getTimestamp();
        const message = payload.message;

        MessageHandler.store(message, timestamp);
        console.log("Upload message received and saved");
    }).bindListener();

    new Listener("opened chat", (payload) => {
        if (payload.target === CONFIG.systemUsername && state.messages.length > 0) {
            setTimeout(() => ChatUI.loadMessages(), CONFIG.loadDelay);
        }
    }).bindListener();
}

/* <-- Initialization --> */
function initialize() {
    state.messages = Storage.load("amqUploadMessages", []);

    console.log(`AMQ Upload DM initialized with ${state.messages.length} saved messages`);

    setupSocketListener();

    if (CONFIG.autoCreateChat && state.messages.length > 0) {
        setTimeout(() => {
            const chat = ChatUI.createChat();
            if (chat) {
                setTimeout(() => ChatUI.loadMessages(), 500);
            }
        }, CONFIG.initDelay);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}

window.loadUploadMessages = () => ChatUI.loadMessages();
