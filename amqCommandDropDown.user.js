// ==UserScript==
// @name         AMQ Command DropDown
// @namespace    https://github.com/Mxyuki/AMQ-Scripts
// @version      1.0.1
// @description  Adds a dropdown to help select commands in Anime Music Quiz chat box.
// @author       Myuki
// @match        https://animemusicquiz.com/*
// @downloadURL  https://github.com/Mxyuki/AMQ-Scripts/raw/main/amqCommandDropDown.user.js
// @updateURL    https://github.com/Mxyuki/AMQ-Scripts/raw/main/amqCommandDropDown.user.js
// ==/UserScript==

(function() {
    'use strict';

    const MAX_RESULTS = 5;
    const HIGHLIGHT_COLOR = '#ff6347';
    const COMMAND_COLOR = '#d3d3d3';
    const PARAMS_COLOR = '#808080';
    const DROPDOWN_BG_COLOR = 'rgba(59, 58, 57, 0.9)';
    const SELECTED_BG_COLOR = '#565554';
    const DEFAULT_BG_COLOR = '#3b3a3900';

    const commands = [
        // GAME SETTINGS
        { command: "/size", params: "[2-40]" },
        { command: "/type", params: "[oei]" },
        { command: "/random", params: "" },
        { command: "/unwatched", params: "" },
        { command: "/watched", params: "" },
        { command: "/time", params: "[1-60]" },
        { command: "/extratime", params: "[0-15]" },
        { command: "/sample", params: "[low] [high]" },
        { command: "/lives", params: "[1-5]" },
        { command: "/team", params: "[1-8]" },
        { command: "/songs", params: "[5-100]" },
        { command: "/dif", params: "[low] [high]" },
        { command: "/vintage", params: "[text]" },
        { command: "/genre", params: "[text]" },
        { command: "/tag", params: "[text]" },

        // IN GAME/LOBBY
        { command: "/autoskip", params: "" },
        { command: "/autokey", params: "" },
        { command: "/autothrow", params: "[text]" },
        { command: "/autocopy", params: "[name]" },
        { command: "/automute", params: "[seconds]" },
        { command: "/autounmute", params: "[seconds]" },
        { command: "/automutetoggle", params: "[list]" },
        { command: "/automuterandom", params: "[time]" },
        { command: "/autounmuterandom", params: "[time]" },
        { command: "/autohint", params: "[1|2|3]" },
        { command: "/autoready", params: "" },
        { command: "/autostart", params: "" },
        { command: "/autohost", params: "[name]" },
        { command: "/autoinvite", params: "[name]" },
        { command: "/autoaccept", params: "" },
        { command: "/autolobby", params: "" },
        { command: "/ready", params: "" },
        { command: "/invite", params: "[name]" },
        { command: "/host", params: "[name]" },
        { command: "/kick", params: "[name]" },
        { command: "/skip", params: "" },
        { command: "/pause", params: "" },
        { command: "/lobby", params: "" },
        { command: "/leave", params: "" },
        { command: "/rejoin", params: "[seconds]" },
        { command: "/spec", params: "" },
        { command: "/join", params: "" },
        { command: "/queue", params: "" },
        { command: "/volume", params: "[0-100]" },
        { command: "/quality", params: "[text]" },
        { command: "/countdown", params: "[seconds]" },
        { command: "/dropdown", params: "" },
        { command: "/dropdownspec", params: "" },
        { command: "/speed", params: "[number]" },
        { command: "/mutereplay", params: "" },
        { command: "/mutesubmit", params: "" },
        { command: "/continuesample", params: "" },
        { command: "/loopvideo", params: "" },

        // OTHER
        { command: "/roll", params: "" },
        { command: "/shuffle", params: "[list]" },
        { command: "/startvote", params: "[list]" },
        { command: "/stopvote", params: "" },
        { command: "/calc", params: "[expression]" },
        { command: "/list", params: "[a|m|k] [name]" },
        { command: "/rules", params: "" },
        { command: "/info", params: "" },
        { command: "/clear", params: "" },
        { command: "/dm", params: "[name] [text]" },
        { command: "/profile", params: "[name]" },
        { command: "/password", params: "" },
        { command: "/invisible", params: "" },
        { command: "/background", params: "[url]" },
        { command: "/logout", params: "" },
        { command: "/relog", params: "" },
        { command: "/alerts", params: "[type]" },
        { command: "/version", params: "" },
        { command: "/commands", params: "[on|off]" }
    ];

    function createDropdown() {
        const dropdown = document.createElement('ul');
        dropdown.id = 'commandDropdown';
        dropdown.style.position = 'absolute';
        dropdown.style.backgroundColor = DROPDOWN_BG_COLOR;
        dropdown.style.border = '1px solid #ccc';
        dropdown.style.borderRadius = '8px 8px 0px 0px';
        dropdown.style.listStyle = 'none';
        dropdown.style.padding = '5px';
        dropdown.style.margin = '0';
        dropdown.style.zIndex = '1000';
        dropdown.style.maxHeight = '800px';
        dropdown.style.overflowY = 'auto';
        dropdown.style.display = 'none';
        dropdown.style.boxSizing = 'border-box';
        dropdown.style.color = COMMAND_COLOR;
        dropdown.style.fontWeight = 'bold';
        return dropdown;
    }

    const chatInput = document.getElementById('gcInput');
    const dropdown = createDropdown();
    document.body.appendChild(dropdown);

    function calculateSimilarityScore(input, command) {
        const inputLower = input.toLowerCase();
        const commandLower = command.toLowerCase();
        let score = 0;
        if (inputLower === commandLower) {
            return 100;
        }
        if (commandLower.includes(inputLower)) {
            score = 50;
        }
        return score;
    }

    function filterCommands(input) {
        const trimmedInput = input.trim().slice(1).toLowerCase();
        return commands
            .map(cmd => ({
            ...cmd,
            score: calculateSimilarityScore(trimmedInput, cmd.command.slice(1))
        }))
            .filter(cmd => cmd.score > 0)
            .sort((a, b) => {
            const aLength = a.command.length;
            const bLength = b.command.length;
            return aLength - bLength;
        })
            .slice(0, MAX_RESULTS);
    }

    function highlightMatch(command, input) {
        const regex = new RegExp(`(${input})`, 'i');
        return command.replace(regex, `<span style="color: ${HIGHLIGHT_COLOR}; font-weight: bold;">$1</span>`);
    }

    function updateDropdown(commands) {
        dropdown.innerHTML = '';
        commands.forEach((cmd, index) => {
            const highlightedCommand = highlightMatch(cmd.command.slice(1), chatInput.value.slice(1).trim());
            const li = document.createElement('li');
            li.innerHTML = `<span style="color: ${COMMAND_COLOR}; font-weight: bold;">/${highlightedCommand}</span> <span style="color: ${PARAMS_COLOR}; font-weight: bold;">${cmd.params}</span>`;
            li.style.padding = '5px';
            li.style.cursor = 'pointer';
            li.style.whiteSpace = 'nowrap';
            li.style.borderRadius = '8px';
            li.style.marginBottom = '2px';
            li.style.boxSizing = 'border-box';
            li.dataset.index = index;
            li.addEventListener('mouseenter', () => {
                selectDropdownItem(index);
            });
            li.addEventListener('click', () => {
                insertCommand(cmd.command);
            });
            dropdown.appendChild(li);
        });

        dropdown.style.overflowY = commands.length > MAX_RESULTS ? 'auto' : 'hidden';
        dropdown.style.display = commands.length > 0 ? 'block' : 'none';
        adjustDropdownPosition();
    }

    let selectedIndex = -1;

    function selectDropdownItem(index) {
        const items = dropdown.querySelectorAll('li');
        items.forEach(item => {
            item.style.backgroundColor = DEFAULT_BG_COLOR;
        });
        if (items.length > 0) {
            if (index < 0) {
                selectedIndex = items.length - 1;
            } else if (index >= items.length) {
                selectedIndex = 0;
            } else {
                selectedIndex = index;
            }
            items[selectedIndex].style.backgroundColor = SELECTED_BG_COLOR;
        }
    }

    function insertCommand(command) {
        chatInput.value = command.split(' ')[0];
        dropdown.style.display = 'none';
        selectedIndex = -1;
    }

    function adjustDropdownPosition() {
        const rect = chatInput.getBoundingClientRect();
        dropdown.style.width = `${rect.width}px`;
        dropdown.style.left = `${rect.left}px`;
        dropdown.style.top = `${rect.top - dropdown.offsetHeight}px`;
    }

    chatInput.addEventListener('input', (e) => {
        const inputValue = e.target.value;
        if (inputValue.startsWith('/')) {
            const filtered = filterCommands(inputValue);
            updateDropdown(filtered.reverse());
        } else {
            dropdown.style.display = 'none';
        }
    });

    chatInput.addEventListener('keydown', (e) => {
        const items = dropdown.querySelectorAll('li');
        if (dropdown.style.display !== 'none' && items.length > 0) {
            if (e.key === 'ArrowDown') {
                if (selectedIndex === -1) {
                    selectDropdownItem(0);
                } else {
                    selectDropdownItem(selectedIndex + 1);
                }
                e.preventDefault();
            } else if (e.key === 'ArrowUp') {
                if (selectedIndex === -1) {
                    selectDropdownItem(items.length - 1);
                } else {
                    selectDropdownItem(selectedIndex - 1);
                }
                e.preventDefault();
            } else if (e.key === 'Enter' && selectedIndex >= 0) {
                insertCommand(items[selectedIndex].textContent.trim());
                e.preventDefault();
            }
        }
    });

    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const inputValue = chatInput.value.trim();
            if (inputValue.startsWith('/') && !commands.some(cmd => cmd.command === inputValue)) {
                dropdown.style.display = 'none';
                selectedIndex = -1;
            } else if (inputValue.startsWith('/')) {
                dropdown.style.display = 'none';
            }
        }
    });

    window.addEventListener('resize', () => {
        adjustDropdownPosition();
    });

    chatInput.addEventListener('input', () => {
        adjustDropdownPosition();
    });

    document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target) && e.target !== chatInput) {
            dropdown.style.display = 'none';
            selectedIndex = -1;
        }
    });
})();
