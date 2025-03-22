// ==UserScript==
// @name         AMQ Skin Plus
// @namespace    https://github.com/Mxyuki/AMQ-Scripts
// @version      3.4.0
// @description  Display in the skin Area, The Number of skin you have, The total number of skin in the game, And the percentage of skin you possess, let you filter skins by Tier, let you Filter Skins by Name, and also calcul how many level are needed to reach your pity.
// @author       Mxyuki
// @match        https://*.animemusicquiz.com/*
// @require      https://github.com/Mxyuki/AMQ-Scripts/raw/refs/heads/main/amqCheckScriptVersion.js
// @require      https://github.com/joske2865/AMQ-Scripts/raw/master/common/amqScriptInfo.js
// @downloadURL  https://github.com/Mxyuki/AMQ-Scripts/raw/main/amqSkinPlus.user.js
// @updateURL    https://github.com/Mxyuki/AMQ-Scripts/raw/main/amqSkinPlus.user.js
// ==/UserScript==

(function() {
    'use strict';

    // Exit early if we're on the login page
    if ($("#loginPage").length) return;

    // Global configuration
    const config = {
        version: "3.4.0",
        skinWidth: "10%",
        checkInterval: 500
    };

    // Global state
    const state = {
        // Skin statistics
        totalSkins: 0,
        totalAvailableSkins: 0,
        collectionPercentage: 0,

        // Filter states
        filters: {
            locked: false,
            tier0: false,
            tier1: false,
            tier2: false,
            tier3: false
        },

        // Search functionality
        skinNameList: [],
        searchTimeout: null,
        awesomeplete: null,

        // Pity system tracking
        currentPity: 0,
        maxPity: 0,
        ticketCount: 0,
        playerLevel: 0
    };

    // Initialize when game is loaded
    const initInterval = setInterval(() => {
        if ($("#loadingScreen").hasClass("hidden")) {
            initialize();
            clearInterval(initInterval);
        }
    }, config.checkInterval);

    // Main initialization
    function initialize() {
        checkScriptVersion("AMQ Skin Plus", config.version);

        updateSkinCounts();
        collectSkinNames();
        updatePityData();

        createUserInterface();
        setupEventListeners();
        setupMutationObserver();
        applyStyles();
    }

    // Update pity system data
    function updatePityData() {
        state.currentPity = parseInt($("#swResonancePointCurrent").text()) || 0;
        state.maxPity = parseInt($("#swResonancePointTarget").text()) || 0;
        state.ticketCount = parseInt($("#currencyTicketText").text()) || 0;
        state.playerLevel = parseInt($("#xpLevelContainer .levelText").first().text()) || 0;
    }

    // Calculate levels needed for pity
    function calculateLevelsForPity() {
        // Calculate tickets needed to reach pity
        const pityRemaining = state.maxPity - state.currentPity;
        const ticketsNeeded = pityRemaining * 2;
        const ticketsRemaining = ticketsNeeded - state.ticketCount;

        if (ticketsRemaining <= 0) {
            return {
                levelsNeeded: 0,
                finalLevel: state.playerLevel
            };
        }

        // Calculate levels needed based on bonus every 10 levels
        let ticketsAccumulated = 0;
        let levelsNeeded = 0;
        let currentLevel = state.playerLevel;

        while (ticketsAccumulated < ticketsRemaining) {
            currentLevel++;
            levelsNeeded++;

            // Check if this level is a multiple of 10 (bonus tickets)
            if (currentLevel % 10 === 0) {
                ticketsAccumulated += 6;
            } else {
                ticketsAccumulated += 1;
            }
        }

        return {
            levelsNeeded,
            finalLevel: state.playerLevel + levelsNeeded
        };
    }

    // Create and inject UI elements
    function createUserInterface() {
        // Create main UI elements
        const ui = `
            <div id="skinSearch">
                <input id="spTextBox" type="text" placeholder="Search Skin">
            </div>
            <div id="skinTiers">
                <div class="spContainer">
                    <p id="skinLocked" class="skinTierText">Locked</p>
                    <div class="customCheckbox spCheckbox">
                        <input id="spLockedCheckbox" type="checkbox">
                        <label for="spLockedCheckbox">
                            <i class="fa fa-check" aria-hidden="true"></i>
                        </label>
                    </div>
                </div>
                <div class="spContainer">
                    <p id="skinTier0" class="skinTierText">Tier 0</p>
                    <div class="customCheckbox spCheckbox">
                        <input id="spTier0Checkbox" type="checkbox">
                        <label for="spTier0Checkbox">
                            <i class="fa fa-check" aria-hidden="true"></i>
                        </label>
                    </div>
                </div>
                <div class="spContainer">
                    <p id="skinTier1" class="skinTierText">Tier 1</p>
                    <div class="customCheckbox spCheckbox">
                        <input id="spTier1Checkbox" type="checkbox">
                        <label for="spTier1Checkbox">
                            <i class="fa fa-check" aria-hidden="true"></i>
                        </label>
                    </div>
                </div>
                <div class="spContainer">
                    <p id="skinTier2" class="skinTierText">Tier 2</p>
                    <div class="customCheckbox spCheckbox">
                        <input id="spTier2Checkbox" type="checkbox">
                        <label for="spTier2Checkbox">
                            <i class="fa fa-check" aria-hidden="true"></i>
                        </label>
                    </div>
                </div>
                <div class="spContainer">
                    <p id="skinTier3" class="skinTierText">Tier 3</p>
                    <div class="customCheckbox spCheckbox">
                        <input id="spTier3Checkbox" type="checkbox">
                        <label for="spTier3Checkbox">
                            <i class="fa fa-check" aria-hidden="true"></i>
                        </label>
                    </div>
                </div>
            </div>
            <div id="swRightColumnTotalSkin">
                <div id="swRightColumnTotalSkinArea" class="text-center" style="margin-top: -20px;">
                    <h1 style="font-size: 25px;">Total Skins:</h1>
                    <p id="totalSkinText">${state.totalSkins} / ${state.totalAvailableSkins} | ${state.collectionPercentage} %</p>
                </div>
            </div>
        `;

        $("#swRightColumnBottomInner").prepend(ui);

        // Add pity level calculator
        addPityLevelCalculator();

        // Initialize Awesomeplete for skin search
        state.awesomeplete = new AmqAwesomeplete(document.querySelector("#spTextBox"), {
            list: state.skinNameList,
            minChars: 1,
            maxItems: 5
        });
    }

    // Add pity level calculator to the UI
    function addPityLevelCalculator() {
        const pityCalc = calculateLevelsForPity();
        const pityHtml = `<p id="pityLevelInfo">${pityCalc.levelsNeeded} levels needed (${pityCalc.finalLevel})</p>`;

        // Add after the resonance points display
        $("#swResonanceProgressBarContainer").after(pityHtml);
    }

    // Update pity calculator display
    function updatePityCalculator() {
        updatePityData();
        const pityCalc = calculateLevelsForPity();
        $("#pityLevelInfo").text(`${pityCalc.levelsNeeded} levels needed (${pityCalc.finalLevel})`);
    }

    // Set up event listeners
    function setupEventListeners() {
        // Search box input handler
        $("#spTextBox").on("keyup", function() {
            handleSearchInput(state.awesomeplete.currentSubList);
        });

        // Avatar container change handler
        $("#swContentAvatarContainer").on("change", function() {
            filterSkins();
        });

        // Checkbox event listeners
        setupCheckboxes();

        // Listen for skin unlocks
        new Listener("unlock avatar", () => {
            updateSkinCounts();
            filterSkins();
        }).bindListener();

        // Listen for XP/level changes
        new Listener("quiz xp credit gain", () => {
            const newLevel = parseInt($("#xpLevelContainer .levelText").first().text()) || 0;

            // Only update if level changed
            if (newLevel !== state.playerLevel) {
                state.playerLevel = newLevel;
                updatePityCalculator();
            }
        }).bindListener();

        // Listen for ticket and pity changes
        const observeTargets = ["#swResonancePointCurrent", "#swResonancePointTarget", "#currencyTicketText"];
        observeTargets.forEach(selector => {
            const target = document.querySelector(selector);
            if (target) {
                new MutationObserver(() => updatePityCalculator()).observe(target, {
                    childList: true,
                    characterData: true,
                    subtree: true
                });
            }
        });
    }

    // Set up checkbox handlers
    function setupCheckboxes() {
        $("#spLockedCheckbox").prop("checked", state.filters.locked).on("click", () => {
            state.filters.locked = !state.filters.locked;
            filterSkins();
        });

        $("#spTier0Checkbox").prop("checked", state.filters.tier0).on("click", () => {
            state.filters.tier0 = !state.filters.tier0;
            filterSkins();
        });

        $("#spTier1Checkbox").prop("checked", state.filters.tier1).on("click", () => {
            state.filters.tier1 = !state.filters.tier1;
            filterSkins();
        });

        $("#spTier2Checkbox").prop("checked", state.filters.tier2).on("click", () => {
            state.filters.tier2 = !state.filters.tier2;
            filterSkins();
        });

        $("#spTier3Checkbox").prop("checked", state.filters.tier3).on("click", () => {
            state.filters.tier3 = !state.filters.tier3;
            filterSkins();
        });
    }

    // Set up mutation observer for the skin container
    function setupMutationObserver() {
        const targetNode = document.querySelector("#swContentAvatarContainer");
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                if (mutation.type === 'childList') {
                    for (let i = 0; i < mutation.addedNodes.length; i++) {
                        const node = mutation.addedNodes[i];
                        if (node.classList && !node.classList.contains("previewTile")) {
                            clearTimeout(state.searchTimeout);
                            state.searchTimeout = setTimeout(filterSkins, 100);
                        }
                    }
                }
            });
        });

        observer.observe(targetNode, { childList: true });
    }

    // Count owned and available skins
    function updateSkinCounts() {
        let unlocked = 0;
        let total = 0;

        $('.swTopBarUnlockStatusUnlocked').each(function() {
            unlocked += parseInt($(this).text());
        });

        $('.swTopBarUnlockStatusTotal').each(function() {
            total += parseInt($(this).text());
        });

        // Adjust counts (removing default skins)
        state.totalSkins = unlocked - 45;
        state.totalAvailableSkins = total - 105;
        state.collectionPercentage = ((state.totalSkins / state.totalAvailableSkins) * 100).toFixed(2);

        $('#totalSkinText').text(`${state.totalSkins} / ${state.totalAvailableSkins} | ${state.collectionPercentage} %`);
    }

    // Collect skin names for search functionality
    function collectSkinNames() {
        state.skinNameList = $('.swTopBarAvatarImageContainer.clickAble.swTopBarImageContainer')
            .map(function() {
                return this.classList.item(this.classList.length - 1);
            })
            .get()
            .slice(2, -1);
    }

    // Handle search input
    function handleSearchInput(searchList) {
        const $containers = $('.swTopBarAvatarImageContainer.clickAble.swTopBarImageContainer');

        $containers.removeClass("hidden");

        if (searchList != null) {
            $containers.each(function() {
                let lastClass = this.classList.item(this.classList.length - 1);

                if (lastClass === "selected") {
                    lastClass = this.classList.item(this.classList.length - 2);
                    $(this).parent().find(".swTopBarAvatarSkinContainer").css("width", "0px");
                }

                if (!searchList.includes(lastClass)) {
                    $(this).addClass("hidden");
                }
            });
        }

        $('#swTopBarContentContainer').scrollLeft(0);
    }

    // Apply skin filtering based on checkboxes
    function filterSkins() {
        setupQuickBuy();
        clearTimeout(state.searchTimeout);

        // Hide all tiles initially
        $('.swAvatarTile').addClass('hidden');

        const allTiersSelected = state.filters.tier0 && state.filters.tier1 &&
                                state.filters.tier2 && state.filters.tier3;
        const noTiersSelected = !state.filters.tier0 && !state.filters.tier1 &&
                               !state.filters.tier2 && !state.filters.tier3;

        if (!state.filters.locked) {
            // Unlocked skins filtering
            filterUnlockedSkins();

            // Show all if all tiers selected or none selected
            if (allTiersSelected || noTiersSelected) {
                $('.swAvatarTile').removeClass('hidden');
            }
        } else {
            // Locked skins filtering
            filterLockedSkins();

            // Special case for all tiers or no tiers
            if (allTiersSelected || noTiersSelected) {
                $('.swAvatarTile:not(.unlocked)').removeClass('hidden');
                $('.swAvatarTile.unlocked').addClass('hidden');
            }
        }
    }

    // Set up quick buy functionality
    function setupQuickBuy() {
        $(".swAvatarTilePrice").each(function() {
            const priceText = $(this).text();
            const validPrices = ["10,000", "40,000", "50,000", "250,000", "290,000", "20", "60", "200", "700"];

            if (!$(this).parent().hasClass('secondRow') && validPrices.includes(priceText)) {
                $(this).parent().off('click').on('click', buySkin);
            }
        });
    }

    // Filter unlocked skins
    function filterUnlockedSkins() {
        if (state.filters.tier0) {
            $('.swAvatarTile.unlocked .swAvatarTileRarityColor.hide').closest('.hidden').removeClass('hidden');
        }
        if (state.filters.tier1) {
            $('.swAvatarTile .swAvatarTileRarityColor.tier1').closest('.hidden').removeClass('hidden');
        }
        if (state.filters.tier2) {
            $('.swAvatarTile .swAvatarTileRarityColor.tier2').closest('.hidden').removeClass('hidden');
        }
        if (state.filters.tier3) {
            $('.swAvatarTile .swAvatarTileRarityColor.tier3').closest('.hidden').removeClass('hidden');
        }
    }

    // Filter locked skins
    function filterLockedSkins() {
        if (state.filters.tier0) {
            $('.swAvatarTilePrice').each(function() {
                const price = $(this).text();
                if (["10,000", "40,000", "50,000", "250,000", "290,000"].includes(price) ||
                    (price === '700' && !$(this).parent().hasClass('secondRow'))) {
                    $(this).closest('.hidden').removeClass('hidden');
                }
            });
        }
        if (state.filters.tier1) {
            $('.swAvatarTilePrice').each(function() {
                if ($(this).text() === '20' && !$(this).parent().hasClass('hide')) {
                    $(this).closest('.hidden').removeClass('hidden');
                }
            });
        }
        if (state.filters.tier2) {
            $('.swAvatarTilePrice').each(function() {
                if ($(this).text() === '60' && !$(this).parent().hasClass('hide')) {
                    $(this).closest('.hidden').removeClass('hidden');
                }
            });
        }
        if (state.filters.tier3) {
            $('.swAvatarTilePrice').each(function() {
                if ($(this).text() === '200' && !$(this).parent().hasClass('hide')) {
                    $(this).closest('.hidden').removeClass('hidden');
                }
            });
        }
    }

    // Quick buy skin functionality
    function buySkin() {
        setTimeout(() => {
            $("#swRightColumnActionButtonText").click();
        }, 100);
    }

    // Apply CSS styles
    function applyStyles() {
        AMQ_addStyle(`
            #skinSearch {
                display: flex;
                flex-direction: column;
                align-items: center;
            }
            #skinTiers {
                display: flex;
                justify-content: space-between;
                margin: 15px;
                padding-bottom: 20px;
            }
            .spContainer {
                display: flex;
                flex-direction: column;
                align-items: center;
            }
            #swRightColumnTotalSkin {
                margin-bottom: 10px;
            }
            .swAvatarTile:nth-of-type(4n) {
                margin-right: 1.5%;
            }
            .swAvatarTile {
                width: ${config.skinWidth};
                margin-right: 1.5%;
            }
            #spTextBox {
                background-color: #424242;
                margin-top: 15px;
            }
            .skinTierText {
                font-weight: bold;
            }
            #pityLevelInfo {
                color: #86cefa;
                font-weight: bold;
                margin-top: 5px;
                text-align: center;
            }
        `);
    }

    // Register script with AMQ
    AMQ_addScriptData({
        name: "Skin Plus",
        author: "Mxyuki",
        version: config.version,
        link: "https://github.com/Mxyuki/AMQ-Scripts/raw/main/amqSkinPlus.user.js",
        description: `
            <p>This script helps you in the AMQ Skins Store.</p>
            <p>Features:</p>
            <ul>
                <li>Total Skins Counter with collection percentage</li>
                <li>Tier filtering for both unlocked and locked skins</li>
                <li>Search bar to filter skins by name</li>
                <li>Fast buy feature - click on price to buy</li>
                <li>Pity system calculator - shows levels needed to reach pity</li>
            </ul>
        `
    });
})();
