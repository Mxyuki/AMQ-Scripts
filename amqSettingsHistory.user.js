// ==UserScript==
// @name         AMQ Settings History
// @namespace    https://animemusicquiz.com/
// @version      1.0.0
// @description  Keeps a history of the room settings you played or spectated, available from the Setup Game window
// @match        https://animemusicquiz.com/*
// @grant        none
// @downloadURL  https://github.com/Mxyuki/AMQ-Scripts/raw/refs/heads/main/amqSettingsHistory.user.js
// @updateURL	 https://github.com/Mxyuki/AMQ-Scripts/raw/refs/heads/main/amqSettingsHistory.user.js
// ==/UserScript==

(() => {
    "use strict";

    if (typeof Listener === "undefined") {
        return;
    }

    const STORAGE_KEY = "amqSettingsHistory";
    const DEFAULT_MAX_ENTRIES = 15;
    const MIN_MAX_ENTRIES = 1;
    const MAX_MAX_ENTRIES = 100;
    const MAX_NAME_LENGTH = 50;
    const AMQ_MAX_SAVED_NAME_LENGTH = 40;
    const AMQ_MAX_SAVED_SETTINGS = 40;
    const LOAD_CHECK_INTERVAL_MS = 500;
    const CONTAINER_ID = "amqshHistoryContainer";

    const STYLE = `
        #${CONTAINER_ID} {
            position: absolute;
            right: -215px;
            width: 209px;
            top: 39px;
            height: 388px;
            border-top-right-radius: 5px;
            border-bottom-right-radius: 5px;
            z-index: 50;
            background-color: #1b1b1b;
        }
        #amqshHistoryHeader {
            background-color: #1b1b1b;
            height: 28px;
            padding-top: 5px;
            padding-left: 5px;
            border-bottom: 1px solid #6d6d6d;
        }
        #amqshHistoryHeader > h5 {
            margin: 0;
            text-align: left;
        }
        #amqshHistoryHeader > .close {
            position: absolute;
            right: 6px;
            top: -2px;
            font-size: 28px;
        }
        #amqshHistoryList {
            height: 319px;
            margin: 0;
            position: relative;
            overflow: hidden;
            padding-right: 0;
        }
        #amqshHistoryList.ps--active-y {
            padding-right: 15px;
        }
        #amqshHistoryList > .ps__scrollbar-y-rail {
            opacity: 1;
            margin-right: 0;
        }
        #amqshHistoryList .mhLoadEntryName {
            position: relative;
            width: calc(100% - 75px);
        }
        #amqshHistoryList .amqshEntryAction {
            font-size: 16px;
            float: left;
            width: 18px;
            margin-left: 1px;
        }
        #amqshHistoryFooter {
            position: absolute;
            bottom: 0;
            width: 100%;
            height: 35px;
            padding: 0 8px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            background-color: #1b1b1b;
            box-shadow: 0 0 6px 1px rgb(0, 0, 0);
        }
        #amqshHistoryFooter > label {
            margin: 0;
            font-weight: normal;
        }
        #amqshMaxEntriesInput {
            width: 50px;
            height: 24px;
            text-align: center;
            color: #000;
        }
        @media screen and (max-height: 749px) {
            #${CONTAINER_ID} {
                top: 34px;
            }
        }
    `;

    // ---------- Persistence ----------

    const isValidMaxEntries = (value) =>
        Number.isInteger(value) && value >= MIN_MAX_ENTRIES && value <= MAX_MAX_ENTRIES;

    const isValidEntry = (entry) =>
        typeof entry?.name === "string" &&
        typeof entry.settingString === "string" &&
        typeof entry.isCustomName === "boolean" &&
        (entry.hostName === undefined || typeof entry.hostName === "string");

    const clampMaxEntries = (value) => Math.min(MAX_MAX_ENTRIES, Math.max(MIN_MAX_ENTRIES, value));

    const padTwoDigits = (value) => String(value).padStart(2, "0");

    const formatTimestamp = (date) =>
        `${date.getFullYear()}-${padTwoDigits(date.getMonth() + 1)}-${padTwoDigits(date.getDate())} ` +
        `${padTwoDigits(date.getHours())}:${padTwoDigits(date.getMinutes())}`;

    function readStoredState() {
        try {
            const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
            return {
                maxEntries: isValidMaxEntries(parsed?.maxEntries) ? parsed.maxEntries : DEFAULT_MAX_ENTRIES,
                entries: Array.isArray(parsed?.entries) ? parsed.entries.filter(isValidEntry) : [],
            };
        } catch {
            return { maxEntries: DEFAULT_MAX_ENTRIES, entries: [] };
        }
    }

    /**
     * Ordered list of played settings, newest first. The encoded setting string is the identity
     * of an entry: AMQ's encoding excludes the room name, so identical settings from different rooms collapse.
     */
    class SettingsHistoryStore {
        constructor() {
            const { maxEntries, entries } = readStoredState();
            this.maxEntries = maxEntries;
            this.entries = entries.slice(0, maxEntries);
        }

        record(settingString, hostName, playedAt) {
            const existing = this.entries.find((entry) => entry.settingString === settingString);
            const recorded = existing?.isCustomName
                ? { ...existing, hostName }
                : { name: formatTimestamp(playedAt), settingString, hostName, isCustomName: false };

            this.entries = [recorded, ...this.entries.filter((entry) => entry !== existing)].slice(0, this.maxEntries);
            this.persist();
        }

        rename(settingString, name) {
            this.entries = this.entries.map((entry) =>
                entry.settingString === settingString ? { ...entry, name, isCustomName: true } : entry
            );
            this.persist();
        }

        remove(settingString) {
            this.entries = this.entries.filter((entry) => entry.settingString !== settingString);
            this.persist();
        }

        countEntriesLostAt(maxEntries) {
            return Math.max(0, this.entries.length - maxEntries);
        }

        setMaxEntries(maxEntries) {
            this.maxEntries = maxEntries;
            this.entries = this.entries.slice(0, maxEntries);
            this.persist();
        }

        persist() {
            try {
                localStorage.setItem(
                    STORAGE_KEY,
                    JSON.stringify({ maxEntries: this.maxEntries, entries: this.entries })
                );
            } catch (error) {
                console.error("[AMQ Settings History] Unable to save history", error);
            }
        }
    }

    // ---------- Settings actions (bridge to AMQ's host modal) ----------

    const translate = (key, parameters) => localizationHandler.translate(key, parameters);

    function applySettings(entry) {
        try {
            hostModal.changeSettings(hostModal.settingStorage.decodeSetting(entry.settingString));
        } catch {
            messageDisplayer.displayMessage(translate("game_settings.errors.error_decoding_settings"));
        }
    }

    function showShareCode(entry) {
        messageDisplayer.displayMessage(translate("game_settings.get_code.setting_code"), entry.settingString);
    }

    function validateAmqSaveName(value) {
        if (!value) {
            return translate("game_settings.select_name_for_setting.must_provide_name");
        }
        if (value.length > AMQ_MAX_SAVED_NAME_LENGTH) {
            return translate("game_settings.select_name_for_setting.name_too_long", {
                number: AMQ_MAX_SAVED_NAME_LENGTH,
            });
        }
        return false;
    }

    function sendSaveToAmq(name, settingString) {
        const resultListener = new Listener("save quiz settings", (payload) => {
            resultListener.unbindListener();
            if (!payload.success) {
                messageDisplayer.displayMessage(
                    translate("game_settings.errors.error_saving_setting"),
                    translate("common.popout_messages.unexpected_error")
                );
                return;
            }
            const { id, settingString: savedString, name: savedName } = payload.setting;
            hostModal.settingStorage.addSetting(id, savedString, savedName);
            messageDisplayer.displayMessage(translate("game_settings.select_name_for_setting.setting_saved"));
        });
        resultListener.bindListener();

        socket.sendCommand({
            command: "save quiz settings",
            type: "settings",
            data: { name, settingString },
        });
    }

    function saveToAmq(entry) {
        if (hostModal.settingStorage.saveDisabled) {
            messageDisplayer.displayMessage(
                translate("game_settings.select_name_for_setting.max_saved_settings", { number: AMQ_MAX_SAVED_SETTINGS })
            );
            return;
        }

        const suggestedName = entry.name.slice(0, AMQ_MAX_SAVED_NAME_LENGTH);

        messageDisplayer.displayInput(
            translate("game_settings.select_name_for_setting.title"),
            translate("game_settings.select_name_for_setting.placeholder"),
            translate("game_settings.select_name_for_setting.confirm_button"),
            translate("common.ui.cancel_button"),
            (name) => sendSaveToAmq(name, entry.settingString),
            null,
            null,
            AMQ_MAX_SAVED_NAME_LENGTH,
            validateAmqSaveName,
            undefined,
            "text",
            suggestedName
        );
    }

    // ---------- History panel UI ----------

    class SettingsHistoryPanel {
        constructor(store) {
            this.store = store;
            this.isLoadingEnabled = hostModal.settingStorage.loadingEnabled;

            this.$container = $("<div>", { id: CONTAINER_ID, class: "floatingContainer hidden" });
            this.$list = $("<ul>", { id: "amqshHistoryList" });
            this.$maxEntriesInput = $("<input>", {
                id: "amqshMaxEntriesInput",
                type: "text",
                inputmode: "numeric",
                maxlength: String(MAX_MAX_ENTRIES).length,
            });

            this.$container.append(this.buildHeader(), this.$list, this.buildFooter());
            $("#mhLoadContainer").after(this.$container);
            this.$list.perfectScrollbar({ suppressScrollX: true });

            this.bindMaxEntriesInput();
            this.syncMaxEntriesInput();
            this.render();
        }

        buildHeader() {
            const $closeButton = $("<button>", { type: "button", class: "close" })
                .append($("<span>", { "aria-hidden": "true", html: "&times;" }))
                .on("click", () => this.hide());

            return $("<div>", { id: "amqshHistoryHeader" }).append($("<h5>", { text: "Settings History" }), $closeButton);
        }

        buildFooter() {
            return $("<div>", { id: "amqshHistoryFooter" }).append(
                $("<label>", { for: "amqshMaxEntriesInput", text: "Settings kept" }),
                this.$maxEntriesInput
            );
        }

        isVisible() {
            return !this.$container.hasClass("hidden");
        }

        show() {
            this.$container.removeClass("hidden");
            this.$list.perfectScrollbar("update");
        }

        hide() {
            this.$container.addClass("hidden");
        }

        toggle() {
            if (this.isVisible()) {
                this.hide();
            } else {
                this.show();
            }
        }

        setLoadingEnabled(isEnabled) {
            this.isLoadingEnabled = isEnabled;
            this.$list.find(".mhLoadEntryName").toggleClass("disabled", !isEnabled);
        }

        render() {
            this.$list.find(".clickAble").popover("destroy");
            this.$list.empty().append(this.store.entries.map((entry) => this.buildEntryRow(entry)));
            this.$list.perfectScrollbar("update");
        }

        buildEntryRow(entry) {
            const $name = $("<div>", { class: "mhLoadEntryName clickAble", text: entry.name })
                .toggleClass("disabled", !this.isLoadingEnabled)
                .on("click", () => applySettings(entry))
                .popover({
                    ...this.buildHoverPopover(entry.hostName ? `Hosted by ${entry.hostName}` : "Host unknown"),
                    title: entry.name,
                });

            const $nameContainer = $("<div>", { class: "mhLoadEntryNameContainer leftRightButtonTop" }).append(
                $name,
                this.buildActionButton("fa-share-square-o", translate("game_settings.get_code.title"), () =>
                    showShareCode(entry)
                ),
                this.buildActionButton("fa-floppy-o", "Save to AMQ settings", () => saveToAmq(entry)),
                this.buildActionButton("fa-pencil", "Rename", () => this.promptRename(entry))
            );

            const $deleteButton = $("<p>", { class: "mhLoadDelete clickAble", text: "×" })
                .popover(this.buildHoverPopover(translate("common.ui.delete")))
                .on("click", () => this.confirmDelete(entry));

            return $("<li>", { class: "mhLoadListEntry" }).append($nameContainer, $deleteButton);
        }

        buildActionButton(iconClass, tooltip, onClick) {
            return $("<div>", { class: "amqshEntryAction clickAble" })
                .append($("<i>", { class: `fa ${iconClass}`, "aria-hidden": "true" }))
                .popover(this.buildHoverPopover(tooltip))
                .on("click", onClick);
        }

        buildHoverPopover(content) {
            return { content, placement: "top", trigger: "hover", container: `#${CONTAINER_ID}` };
        }

        promptRename(entry) {
            messageDisplayer.displayInput(
                "Rename Setting",
                "Setting name",
                "Rename",
                translate("common.ui.cancel_button"),
                (name) => {
                    this.store.rename(entry.settingString, name.trim());
                    this.render();
                },
                null,
                null,
                MAX_NAME_LENGTH,
                (value) => (value?.trim() ? false : "You must provide a name"),
                undefined,
                "text",
                entry.name
            );
        }

        confirmDelete(entry) {
            messageDisplayer.displayOption(
                translate("game_settings.delete_saved_setting.title"),
                entry.name,
                translate("game_settings.delete_saved_setting.confirm_button"),
                translate("common.ui.cancel_button"),
                () => {
                    this.store.remove(entry.settingString);
                    this.render();
                }
            );
        }

        bindMaxEntriesInput() {
            this.$maxEntriesInput
                .on("input", () => this.$maxEntriesInput.val(this.$maxEntriesInput.val().replace(/\D/g, "")))
                // keyup, not keydown: the confirmation popup would otherwise catch the same Enter press and accept itself
                .on("keyup", (event) => {
                    if (event.key === "Enter") {
                        this.$maxEntriesInput.trigger("blur");
                    }
                })
                .on("change", () => this.commitMaxEntries());
        }

        syncMaxEntriesInput() {
            this.$maxEntriesInput.val(this.store.maxEntries);
        }

        commitMaxEntries() {
            const requested = Number.parseInt(this.$maxEntriesInput.val(), 10);
            if (Number.isNaN(requested)) {
                this.syncMaxEntriesInput();
                return;
            }

            const maxEntries = clampMaxEntries(requested);
            const lostCount = this.store.countEntriesLostAt(maxEntries);
            const applyMaxEntries = () => {
                this.store.setMaxEntries(maxEntries);
                this.syncMaxEntriesInput();
                this.render();
            };

            if (lostCount === 0) {
                applyMaxEntries();
                return;
            }

            messageDisplayer.displayOption(
                "Reduce History Size?",
                `The ${lostCount} oldest setting${lostCount > 1 ? "s" : ""} in your history will be deleted.`,
                "Yes",
                "No",
                applyMaxEntries,
                () => this.syncMaxEntriesInput()
            );
        }
    }

    // ---------- AMQ integration ----------

    function addHistoryTab(panel) {
        const $historyTab = $("<div>", { id: "amqshHistoryButton", class: "tab clickAble" })
            .append($("<h5>", { text: "History" }))
            .on("click", () => {
                hostModal.hideLoadContainer();
                panel.toggle();
            });

        const $loadTab = $("#mhLoadSettingButton");
        $loadTab.after($historyTab);
        $loadTab.on("click", () => panel.hide());
    }

    function followLoadingPermission(panel) {
        const settingStorage = hostModal.settingStorage;
        const originalSetLoadingEnabled = settingStorage.setLoadingEnabled;

        settingStorage.setLoadingEnabled = function (isEnabled) {
            originalSetLoadingEnabled.call(this, isEnabled);
            panel.setLoadingEnabled(isEnabled);
        };
    }

    function recordGameSettings(store, panel) {
        const settings = lobby.settings;
        if (!settings) {
            return;
        }

        try {
            const settingString = hostModal.settingStorage.serilizer.encode(settings);
            store.record(settingString, lobby.hostName, new Date());
            panel.render();
        } catch (error) {
            console.error("[AMQ Settings History] Unable to record room settings", error);
        }
    }

    function initialize() {
        $("<style>", { id: "amqshStyle", text: STYLE }).appendTo("head");

        const store = new SettingsHistoryStore();
        const panel = new SettingsHistoryPanel(store);

        addHistoryTab(panel);
        followLoadingPermission(panel);
        $("#mhHostModal").on("hide.bs.modal", () => panel.hide());
        new Listener("Game Starting", () => recordGameSettings(store, panel)).bindListener();
    }

    const loadCheck = setInterval(() => {
        if ($("#loadingScreen").hasClass("hidden") && hostModal.settingStorage) {
            clearInterval(loadCheck);
            initialize();
        }
    }, LOAD_CHECK_INTERVAL_MS);
})();
