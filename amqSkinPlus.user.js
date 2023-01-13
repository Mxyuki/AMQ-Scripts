// ==UserScript==
// @name         AMQ Skin Plus
// @namespace    https://github.com/Mxyuki/AMQ-Scripts
// @version      2.4
// @description  Display in the skin Area, The Number of skin you have, The total number of skin in the game, And the percentage of skin you possess, Also let you filter skins by Tier, and also let you Filter Skins by Name.
// @author       Mxyuki
// @match        https://animemusicquiz.com/*
// @require      https://raw.githubusercontent.com/TheJoseph98/AMQ-Scripts/master/common/amqScriptInfo.js
// @downloadURL  https://github.com/Mxyuki/AMQ-Scripts/raw/main/amqSkinPlus.user.js
// @updateURL    https://github.com/Mxyuki/AMQ-Scripts/raw/main/amqSkinPlus.user.js
// ==/UserScript==

if (document.getElementById("startPage")) return;

let loadInterval = setInterval(() => {
    if (document.getElementById("loadingScreen").classList.contains("hidden")) {
        setup();
        clearInterval(loadInterval);
    }
}, 500);

let total = 0;
let total2 = 0;
let collection = 0;

let locked = false;
let tier0 = false;
let tier1 = false;
let tier2 = false;
let tier3 = false;

let skinNameList = [];

function setup(){

    countSkins();
    getSkinsNames();

    $('#swRightColumnBottomInner').prepend(`
        <div id="skinSearch">
            <input id="spTextBox" type="text" placeholder="Search Skin">
        </div>
        <div id="skinTiers">
            <div class="spContainer">
                <p id="skinLocked" class="skinTierButtom">Locked</p>
                <div class="customCheckbox spCheckbox">
                    <input id="spLockedCheckbox" type="checkbox">
                    <label for="spLockedCheckbox">
                        <i class="fa fa-check" aria-hidden="true"></i>
                    </label>
                </div>
            </div>
            <div class="spContainer">
                <p id="skinTier0" class="skinTierButtom">Tier 0</p>
                <div class="customCheckbox spCheckbox">
                    <input id="spTier0Checkbox" type="checkbox">
                    <label for="spTier0Checkbox">
                        <i class="fa fa-check" aria-hidden="true"></i>
                    </label>
                </div>
            </div>
            <div class="spContainer">
                <p id="skinTier1" class="skinTierButtom">Tier 1</p>
                <div class="customCheckbox spCheckbox">
                    <input id="spTier1Checkbox" type="checkbox">
                    <label for="spTier1Checkbox">
                        <i class="fa fa-check" aria-hidden="true"></i>
                    </label>
                </div>
            </div>
            <div class="spContainer">
                <p id="skinTier2" class="skinTierButtom">Tier 2</p>
                <div class="customCheckbox spCheckbox">
                    <input id="spTier2Checkbox" type="checkbox">
                    <label for="spTier2Checkbox">
                        <i class="fa fa-check" aria-hidden="true"></i>
                    </label>
                </div>
            </div>
            <div class="spContainer">
                <p id="skinTier3" class="skinTierButtom">Tier 3</p>
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
                 ${total} / ${total2} | ${collection} %
            </div>
        </div>
    `);

    $("#spTextBox").keyup(function(event) {
          textboxProcess(spInput.currentSubList);
    });

    let spInput = new AmqAwesomeplete(document.querySelector("#spTextBox"), {list: skinNameList, minChars: 1, maxItems: 5});

    checkboxCheck();
    applyStyles();
}

function countSkins(){
    $('.swTopBarAvatarImageContainer > .swTopBarUnlockStatusContainer > .swTopBarUnlockStatusAmountContainerOuter > .swTopBarUnlockStatusAmountContainer > .swTopBarUnlockStautsNumberContainer > .swTopBarUnlockStatusUnlocked').each(function() {
        total += parseInt($(this).text());
    });

    $('.swTopBarAvatarImageContainer > .swTopBarUnlockStatusContainer > .swTopBarUnlockStatusAmountContainerOuter > .swTopBarUnlockStatusAmountContainer > .swTopBarUnlockStautsNumberContainer > .swTopBarUnlockStatusTotal').each(function() {
        total2 += parseInt($(this).text());
    });

    total = total - 45;
    total2 = total2 - 105;
    collection = ((total/total2)*100).toFixed(2);
}

function applyStyles() {
    AMQ_addStyle(`
        #skinSearch{
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        #skinTiers {
            display: flex;
            justify-content: space-between;
            margin: 15px;
            padding-bottom: 20px
        }
        .spContainer {
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        #swRightColumnTotalSkin {
            margin-bottom: 10px
        }
        .swAvatarTile:nth-of-type(4n) {
            margin-right: 6.5%;
        }
    `);
}

function checkboxCheck(){
    $('#spLockedCheckbox').prop('checked', locked).click(() => {
        locked = !locked;
        skinFiltering();
    });
    $('#spTier0Checkbox').prop('checked', tier0).click(() => {
        tier0 = !tier0;
        skinFiltering();
    });
    $('#spTier1Checkbox').prop('checked', tier1).click(() => {
        tier1 = !tier1;
        skinFiltering();
    });
    $('#spTier2Checkbox').prop('checked', tier2).click(() => {
        tier2 = !tier2;
        skinFiltering();
    });
    $('#spTier3Checkbox').prop('checked', tier3).click(() => {
        tier3 = !tier3;
        skinFiltering();
    });
}

function skinFiltering(){
    $('.swAvatarTile.swMainContent.floatingContainer.clickAble.unlocked .swAvatarTileTypeContainer .swAvatarTileType.rightLeftTopBottom .swAvatarTileRarityColor.hide').parent().parent().parent().addClass('hidden');
    $('.swAvatarTile.swMainContent.floatingContainer.clickAble .swAvatarTileTypeContainer .swAvatarTileType.rightLeftTopBottom .swAvatarTileRarityColor.hide').parent().parent().parent().addClass('hidden');
    $('.swAvatarTile.swMainContent.floatingContainer.clickAble .swAvatarTileTypeContainer .swAvatarTileType.rightLeftTopBottom .swAvatarTileRarityColor.tier1').parent().parent().parent().addClass('hidden');
    $('.swAvatarTile.swMainContent.floatingContainer.clickAble .swAvatarTileTypeContainer .swAvatarTileType.rightLeftTopBottom .swAvatarTileRarityColor.tier2').parent().parent().parent().addClass('hidden');
    $('.swAvatarTile.swMainContent.floatingContainer.clickAble .swAvatarTileTypeContainer .swAvatarTileType.rightLeftTopBottom .swAvatarTileRarityColor.tier3').parent().parent().parent().addClass('hidden');

    if(locked){
        $('.swAvatarTile.swMainContent.floatingContainer.clickAble .swAvatarTileTypeContainer .swAvatarTileType.rightLeftTopBottom .swAvatarTileRarityColor.hide').parent().parent().parent().removeClass('hidden');
        $('.swAvatarTile.swMainContent.floatingContainer.clickAble.unlocked .swAvatarTileTypeContainer .swAvatarTileType.rightLeftTopBottom .swAvatarTileRarityColor.hide').parent().parent().parent().addClass('hidden');
    }
    if(tier0) $('.swAvatarTile.swMainContent.floatingContainer.clickAble.unlocked .swAvatarTileTypeContainer .swAvatarTileType.rightLeftTopBottom .swAvatarTileRarityColor.hide').parent().parent().parent().removeClass('hidden');
    if(tier1) $('.swAvatarTile.swMainContent.floatingContainer.clickAble .swAvatarTileTypeContainer .swAvatarTileType.rightLeftTopBottom .swAvatarTileRarityColor.tier1').parent().parent().parent().removeClass('hidden');
    if(tier2) $('.swAvatarTile.swMainContent.floatingContainer.clickAble .swAvatarTileTypeContainer .swAvatarTileType.rightLeftTopBottom .swAvatarTileRarityColor.tier2').parent().parent().parent().removeClass('hidden');
    if(tier3) $('.swAvatarTile.swMainContent.floatingContainer.clickAble .swAvatarTileTypeContainer .swAvatarTileType.rightLeftTopBottom .swAvatarTileRarityColor.tier3').parent().parent().parent().removeClass('hidden');

    if(!locked && !tier0 && !tier1 && !tier2 && !tier3 || locked && tier0 && tier1 && tier2 && tier3){
        $('.swAvatarTile.swMainContent.floatingContainer.clickAble .swAvatarTileTypeContainer .swAvatarTileType.rightLeftTopBottom .swAvatarTileRarityColor.hide').parent().parent().parent().removeClass('hidden');
        $('.swAvatarTile.swMainContent.floatingContainer.clickAble .swAvatarTileTypeContainer .swAvatarTileType.rightLeftTopBottom .swAvatarTileRarityColor.tier1').parent().parent().parent().removeClass('hidden');
        $('.swAvatarTile.swMainContent.floatingContainer.clickAble .swAvatarTileTypeContainer .swAvatarTileType.rightLeftTopBottom .swAvatarTileRarityColor.tier2').parent().parent().parent().removeClass('hidden');
        $('.swAvatarTile.swMainContent.floatingContainer.clickAble .swAvatarTileTypeContainer .swAvatarTileType.rightLeftTopBottom .swAvatarTileRarityColor.tier3').parent().parent().parent().removeClass('hidden');
    }
}

function getSkinsNames(){
    skinNameList = $('.swTopBarAvatarImageContainer.clickAble.swTopBarImageContainer').map(function() {
        return this.classList.item(this.classList.length - 1);
    }).get();
    skinNameList = skinNameList.slice(2, -1);
}

function textboxProcess(searchList){
    if(searchList != ""){
        $('.swTopBarAvatarImageContainer.clickAble.swTopBarImageContainer').each(function() {
            this.classList.remove("hidden");
        });
        $('.swTopBarAvatarImageContainer.clickAble.swTopBarImageContainer').each(function() {
            let lastClass = this.classList.item(this.classList.length - 1);
            if(lastClass == "selected"){
                lastClass = this.classList.item(this.classList.length - 2);
            }
            if(!searchList.includes(lastClass)){
                $(this).addClass("hidden");
            }
          });
    }
    else{
        $('.swTopBarAvatarImageContainer.clickAble.swTopBarImageContainer').each(function() {
            this.classList.remove("hidden");
        });
    }
}

new Listener("unlock avatar", (payload) => {
    skinFiltering();
}).bindListener();
