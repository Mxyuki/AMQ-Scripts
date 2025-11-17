// ==UserScript==
// @name         AMQ Skin Plus
// @namespace    https://github.com/Mxyuki/AMQ-Scripts
// @version      4.0.1
// @description  Enhanced skin management for AMQ with filtering, search, statistics, and pity calculator
// @author       Mxyuki
// @match        https://*.animemusicquiz.com/*
// @require      https://github.com/Mxyuki/AMQ-Scripts/raw/refs/heads/main/amqCheckScriptVersion.js
// @require      https://github.com/joske2865/AMQ-Scripts/raw/master/common/amqScriptInfo.js
// @downloadURL  https://github.com/Mxyuki/AMQ-Scripts/raw/main/amqSkinPlus.user.js
// @updateURL    https://github.com/Mxyuki/AMQ-Scripts/raw/main/amqSkinPlus.user.js
// ==/UserScript==

(function() {
    'use strict';

    if ($("#loginPage").length) return;

    const CONFIG = {
        version: "4.0.1",
        skinWidth: "10%",
        initCheckInterval: 500,
        searchDebounceDelay: 100,
        buyClickDelay: 100,
        ticketsPerLevel: 1,
        ticketsPerBonusLevel: 6,
        bonusLevelInterval: 10,
        pityTicketCost: 2
    };

    const TIER_PRICES = {
        tier0: ["10,000", "30,000", "40,000", "50,000", "250,000", "280,000", "290,000", "700"],
        tier1: ["20"],
        tier2: ["60"],
        tier3: ["200"]
    };

    const SELECTORS = {
        loadingScreen: "#loadingScreen",
        skinContainer: "#swContentAvatarContainer",
        topBarContainer: "#swTopBarContentContainer",
        topBarContent: "#swTopBarContentContainerInner",
        avatarContainer: ".swTopBarAvatarContainer.leftRightButtonTop",
        skinTile: ".swAvatarTile",
        skinPrice: ".swAvatarTilePrice",
        searchBox: "#spTextBox",
        buyButton: "#swRightColumnActionButtonText",
        pityInfo: "#pityLevelInfo",
        totalSkinText: "#totalSkinText",
        rightColumnBottom: "#swRightColumnBottomInner",
        pityContainer: "#swResonanceProgressBarContainer",
        currentPity: "#swResonancePointCurrent",
        maxPity: "#swResonancePointTarget",
        ticketCount: "#currencyTicketText",
        playerLevel: "#xpLevelContainer .levelText"
    };

    class SkinManager {
        constructor() {
            this.state = {
                totalSkins: 0,
                totalAvailableSkins: 0,
                collectionPercentage: 0,
                filters: {
                    locked: false,
                    tier0: false,
                    tier1: false,
                    tier2: false,
                    tier3: false
                },
                skinNameList: [],
                searchTimeout: null,
                awesomeplete: null,
                currentPity: 0,
                maxPity: 0,
                ticketCount: 0,
                playerLevel: 0
            };
        }

        initialize() {
            checkScriptVersion("AMQ Skin Plus", CONFIG.version);

            this.updateSkinCounts();
            this.collectSkinNames();
            this.updatePityData();

            this.createUI();
            this.setupEventListeners();
            this.setupMutationObserver();
            this.applyStyles();
        }

        <!-- Skin Statistics Management -->
        updateSkinCounts() {
            let unlockedCount = 0;
            let totalCount = 0;

            $(SELECTORS.topBarContent + ' ' + SELECTORS.avatarContainer).each(function() {
                const $container = $(this);
                const avatarClass = $container.find('.swTopBarImageContainer').attr('class')?.split(' ').pop();

                if (!avatarClass || avatarClass === 'swTopBarImageContainer') return;

                const unlocked = parseInt($container.find('.swTopBarUnlockStatusUnlocked').first().text() || 0);
                const total = parseInt($container.find('.swTopBarUnlockStatusTotal').first().text() || 0);

                unlockedCount += unlocked;
                totalCount += total;
            });

            this.state.totalSkins = unlockedCount;
            this.state.totalAvailableSkins = totalCount;
            this.state.collectionPercentage = totalCount > 0
                ? ((unlockedCount / totalCount) * 100).toFixed(2)
                : 0;

            this.updateSkinDisplay();
        }

        updateSkinDisplay() {
            $(SELECTORS.totalSkinText).text(
                `${this.state.totalSkins} / ${this.state.totalAvailableSkins} | ${this.state.collectionPercentage} %`
            );
        }

        collectSkinNames() {
            this.state.skinNameList = $('.swTopBarAvatarImageContainer.clickAble.swTopBarImageContainer')
                .map(function() {
                    return this.classList.item(this.classList.length - 1);
                })
                .get()
                .slice(2, -1);
        }

        <!-- Pity System Management -->
        updatePityData() {
            this.state.currentPity = parseInt($(SELECTORS.currentPity).text()) || 0;
            this.state.maxPity = parseInt($(SELECTORS.maxPity).text()) || 0;
            this.state.ticketCount = parseInt($(SELECTORS.ticketCount).text()) || 0;
            this.state.playerLevel = parseInt($(SELECTORS.playerLevel).first().text()) || 0;
        }

        calculateLevelsForPity() {
            const pityRemaining = this.state.maxPity - this.state.currentPity;
            const ticketsNeeded = pityRemaining * CONFIG.pityTicketCost;
            const ticketsRemaining = ticketsNeeded - this.state.ticketCount;

            if (ticketsRemaining <= 0) {
                return {
                    levelsNeeded: 0,
                    finalLevel: this.state.playerLevel
                };
            }

            let ticketsAccumulated = 0;
            let levelsNeeded = 0;
            let currentLevel = this.state.playerLevel;

            while (ticketsAccumulated < ticketsRemaining) {
                currentLevel++;
                levelsNeeded++;

                ticketsAccumulated += (currentLevel % CONFIG.bonusLevelInterval === 0)
                    ? CONFIG.ticketsPerBonusLevel
                    : CONFIG.ticketsPerLevel;
            }

            return {
                levelsNeeded,
                finalLevel: this.state.playerLevel + levelsNeeded
            };
        }

        updatePityCalculator() {
            this.updatePityData();
            const pityCalc = this.calculateLevelsForPity();
            $(SELECTORS.pityInfo).text(`${pityCalc.levelsNeeded} levels needed (${pityCalc.finalLevel})`);
        }

        <!-- UI Creation -->
        createUI() {
            this.createMainUI();
            this.createPityCalculator();
            this.initializeSearch();
        }

        createMainUI() {
            const ui = `
                <div id="skinSearch">
                    <input id="spTextBox" type="text" placeholder="Search Skin">
                </div>
                <div id="skinTiers">
                    ${this.createTierCheckbox("Locked", "spLockedCheckbox")}
                    ${this.createTierCheckbox("Tier 0", "spTier0Checkbox")}
                    ${this.createTierCheckbox("Tier 1", "spTier1Checkbox")}
                    ${this.createTierCheckbox("Tier 2", "spTier2Checkbox")}
                    ${this.createTierCheckbox("Tier 3", "spTier3Checkbox")}
                </div>
                <div id="swRightColumnTotalSkin">
                    <div id="swRightColumnTotalSkinArea" class="text-center" style="margin-top: -20px;">
                        <h1 style="font-size: 25px;">Total Skins:</h1>
                        <p id="totalSkinText">${this.state.totalSkins} / ${this.state.totalAvailableSkins} | ${this.state.collectionPercentage} %</p>
                    </div>
                </div>
            `;

            $(SELECTORS.rightColumnBottom).prepend(ui);
        }

        createTierCheckbox(label, id) {
            const formattedId = id.replace("Checkbox", "");
            return `
                <div class="spContainer">
                    <p id="${formattedId}" class="skinTierText">${label}</p>
                    <div class="customCheckbox spCheckbox">
                        <input id="${id}" type="checkbox">
                        <label for="${id}">
                            <i class="fa fa-check" aria-hidden="true"></i>
                        </label>
                    </div>
                </div>
            `;
        }

        createPityCalculator() {
            const pityCalc = this.calculateLevelsForPity();
            const pityHtml = `<p id="pityLevelInfo">${pityCalc.levelsNeeded} levels needed (${pityCalc.finalLevel})</p>`;
            $(SELECTORS.pityContainer).after(pityHtml);
        }

        initializeSearch() {
            this.state.awesomeplete = new AmqAwesomeplete(document.querySelector(SELECTORS.searchBox), {
                list: this.state.skinNameList,
                minChars: 1,
                maxItems: 5
            });
        }

        <!-- Event Listeners -->
        setupEventListeners() {
            this.setupSearchListener();
            this.setupContainerListener();
            this.setupCheckboxListeners();
            this.setupGameListeners();
            this.setupPityObservers();
        }

        setupSearchListener() {
            $(SELECTORS.searchBox).on("keyup", () => {
                this.handleSearchInput(this.state.awesomeplete.currentSubList);
            });
        }

        setupContainerListener() {
            $(SELECTORS.skinContainer).on("change", () => {
                this.filterSkins();
            });
        }

        setupCheckboxListeners() {
            const checkboxMappings = [
                { selector: "#spLockedCheckbox", filter: "locked" },
                { selector: "#spTier0Checkbox", filter: "tier0" },
                { selector: "#spTier1Checkbox", filter: "tier1" },
                { selector: "#spTier2Checkbox", filter: "tier2" },
                { selector: "#spTier3Checkbox", filter: "tier3" }
            ];

            checkboxMappings.forEach(({ selector, filter }) => {
                $(selector)
                    .prop("checked", this.state.filters[filter])
                    .on("click", () => {
                        this.state.filters[filter] = !this.state.filters[filter];
                        this.filterSkins();
                    });
            });
        }

        setupGameListeners() {
            new Listener("unlock avatar", () => {
                this.updateSkinCounts();
                this.filterSkins();
            }).bindListener();

            new Listener("quiz xp credit gain", () => {
                const newLevel = parseInt($(SELECTORS.playerLevel).first().text()) || 0;
                if (newLevel !== this.state.playerLevel) {
                    this.state.playerLevel = newLevel;
                    this.updatePityCalculator();
                }
            }).bindListener();
        }

        setupPityObservers() {
            const observeTargets = [SELECTORS.currentPity, SELECTORS.maxPity, SELECTORS.ticketCount];

            observeTargets.forEach(selector => {
                const target = document.querySelector(selector);
                if (target) {
                    new MutationObserver(() => this.updatePityCalculator()).observe(target, {
                        childList: true,
                        characterData: true,
                        subtree: true
                    });
                }
            });
        }

        setupMutationObserver() {
            const targetNode = document.querySelector(SELECTORS.skinContainer);
            const observer = new MutationObserver(mutations => {
                mutations.forEach(mutation => {
                    if (mutation.type === 'childList') {
                        for (let node of mutation.addedNodes) {
                            if (node.classList && !node.classList.contains("previewTile")) {
                                clearTimeout(this.state.searchTimeout);
                                this.state.searchTimeout = setTimeout(() => this.filterSkins(), CONFIG.searchDebounceDelay);
                                break;
                            }
                        }
                    }
                });
            });

            observer.observe(targetNode, { childList: true });
        }

        <!-- Search Functionality -->
        handleSearchInput(searchList) {
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

            $(SELECTORS.topBarContainer).scrollLeft(0);
        }

        <!-- Skin Filtering -->
        filterSkins() {
            this.setupQuickBuy();
            clearTimeout(this.state.searchTimeout);

            $(SELECTORS.skinTile).addClass('hidden');

            const allTiersSelected = this.state.filters.tier0 && this.state.filters.tier1 &&
                                    this.state.filters.tier2 && this.state.filters.tier3;
            const noTiersSelected = !this.state.filters.tier0 && !this.state.filters.tier1 &&
                                   !this.state.filters.tier2 && !this.state.filters.tier3;

            if (!this.state.filters.locked) {
                this.filterUnlockedSkins();
                if (allTiersSelected || noTiersSelected) {
                    $(SELECTORS.skinTile).removeClass('hidden');
                }
            } else {
                this.filterLockedSkins();
                if (allTiersSelected || noTiersSelected) {
                    $(SELECTORS.skinTile + ':not(.unlocked)').removeClass('hidden');
                    $(SELECTORS.skinTile + '.unlocked').addClass('hidden');
                }
            }
        }

        filterUnlockedSkins() {
            if (this.state.filters.tier0) {
                $(SELECTORS.skinTile + '.unlocked .swAvatarTileRarityColor.hide').closest('.hidden').removeClass('hidden');
            }
            if (this.state.filters.tier1) {
                $(SELECTORS.skinTile + ' .swAvatarTileRarityColor.tier1').closest('.hidden').removeClass('hidden');
            }
            if (this.state.filters.tier2) {
                $(SELECTORS.skinTile + ' .swAvatarTileRarityColor.tier2').closest('.hidden').removeClass('hidden');
            }
            if (this.state.filters.tier3) {
                $(SELECTORS.skinTile + ' .swAvatarTileRarityColor.tier3').closest('.hidden').removeClass('hidden');
            }
        }

        filterLockedSkins() {
            const filterByTier = (tier, priceArray) => {
                if (!this.state.filters[tier]) return;

                $(SELECTORS.skinPrice).each(function() {
                    const price = $(this).text();
                    const isSecondRow = $(this).parent().hasClass('secondRow');
                    const isHidden = $(this).parent().hasClass('hide');

                    if (tier === 'tier0') {
                        if (priceArray.includes(price) && (price !== '700' || !isSecondRow)) {
                            $(this).closest('.hidden').removeClass('hidden');
                        }
                    } else {
                        if (priceArray.includes(price) && !isHidden) {
                            $(this).closest('.hidden').removeClass('hidden');
                        }
                    }
                });
            };

            filterByTier('tier0', TIER_PRICES.tier0);
            filterByTier('tier1', TIER_PRICES.tier1);
            filterByTier('tier2', TIER_PRICES.tier2);
            filterByTier('tier3', TIER_PRICES.tier3);
        }

        <!-- Quick Buy Feature -->
        setupQuickBuy() {
            const validPrices = [...TIER_PRICES.tier0, ...TIER_PRICES.tier1, ...TIER_PRICES.tier2, ...TIER_PRICES.tier3];

            $(SELECTORS.skinPrice).each(function() {
                const priceText = $(this).text();
                const $parent = $(this).parent();

                if (!$parent.hasClass('secondRow') && validPrices.includes(priceText)) {
                    $parent.off('click').on('click', () => {
                        setTimeout(() => {
                            $(SELECTORS.buyButton).click();
                        }, CONFIG.buyClickDelay);
                    });
                }
            });
        }

        <!-- Styling -->
        applyStyles() {
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
                    width: ${CONFIG.skinWidth};
                }
                #swContentAvatarContainer{
                    column-gap: 1.5%;
                }
                .swAvatarTile:nth-of-type(4n) {
                    margin-right: 0%;
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
    }

    <!-- Script Initialization -->
    const initInterval = setInterval(() => {
        if ($(SELECTORS.loadingScreen).hasClass("hidden")) {
            const skinManager = new SkinManager();
            skinManager.initialize();
            clearInterval(initInterval);
        }
    }, CONFIG.initCheckInterval);

    <!-- Script Registration -->
    AMQ_addScriptData({
        name: "Skin Plus",
        author: "Mxyuki",
        version: CONFIG.version,
        link: "https://github.com/Mxyuki/AMQ-Scripts/raw/main/amqSkinPlus.user.js",
        description: `
            <p>Enhanced skin management for AMQ.</p>
            <p>Features:</p>
            <ul>
                <li>Total skins counter with collection percentage</li>
                <li>Tier filtering for unlocked and locked skins</li>
                <li>Search bar to filter skins by name</li>
                <li>Quick buy feature - click on price to purchase</li>
                <li>Pity system calculator - shows levels needed to reach pity</li>
            </ul>
        `
    });
})();
