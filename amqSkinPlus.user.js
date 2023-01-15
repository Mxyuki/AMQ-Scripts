// ==UserScript==
// @name         AMQ Skin Plus
// @namespace    https://github.com/Mxyuki/AMQ-Scripts
// @version      3.3.0
// @description  Display in the skin Area, The Number of skin you have, The total number of skin in the game, And the percentage of skin you possess, Also let you filter skins by Tier, and also let you Filter Skins by Name.
// @author       Mxyuki
// @match        https://animemusicquiz.com/*
// @require      https://raw.githubusercontent.com/TheJoseph98/AMQ-Scripts/master/common/amqScriptInfo.js
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

let skinWidth = "10%";

let total = 0;
let total2 = 0;
let collection = 0;

let locked = false;
let tier0 = false;
let tier1 = false;
let tier2 = false;
let tier3 = false;

let timeoutId;

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
                <p id="totalSkinText">${total} / ${total2} | ${collection} %</p>
            </div>
        </div>
    `);

    $("#spTextBox").keyup(function(event) {
          textboxProcess(spInput.currentSubList);
    });

    $('#swContentAvatarContainer').on('change', function() {
        skinFiltering();
    });

    let spInput = new AmqAwesomeplete(document.querySelector("#spTextBox"), {list: skinNameList, minChars: 1, maxItems: 5});

    var target = document.querySelector("#swContentAvatarContainer");
    var observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            mutationProcess(mutation);
        });
    });
    var config = { childList: true };
    observer.observe(target, config);

    checkboxCheck();
    applyStyles();
}

function mutationProcess(mutation){
    if (mutation.type === 'childList') {
        for(let i=0; i< mutation.addedNodes.length; i++){
            let node = mutation.addedNodes[i];
            if(node.classList && !node.classList.contains("previewTile")) {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(skinFiltering, 100);
            }
        }
    }
}

function countSkins(){

    total = 0;
    total2 = 0;

    $('.swTopBarAvatarImageContainer > .swTopBarUnlockStatusContainer > .swTopBarUnlockStatusAmountContainerOuter > .swTopBarUnlockStatusAmountContainer > .swTopBarUnlockStautsNumberContainer > .swTopBarUnlockStatusUnlocked').each(function() {
        total += parseInt($(this).text());
    });

    $('.swTopBarAvatarImageContainer > .swTopBarUnlockStatusContainer > .swTopBarUnlockStatusAmountContainerOuter > .swTopBarUnlockStatusAmountContainer > .swTopBarUnlockStautsNumberContainer > .swTopBarUnlockStatusTotal').each(function() {
        total2 += parseInt($(this).text());
    });

    total = total - 45;
    total2 = total2 - 105;
    collection = ((total/total2)*100).toFixed(2);

    if($('#totalSkinText'))$('#totalSkinText').text(`${total} / ${total2} | ${collection} %`);
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
            margin-right: 1.5%;
        }
        .swAvatarTile {
            width: ${skinWidth};
            margin-right: 1.5%;
        }
        #spTextBox{
            background-color: #424242;
            margin-top: 15px;
        }
        .skinTierText {
             font-weight: bold;
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

    $(".swAvatarTilePrice").each(function() {
        if(!$(this).parent().hasClass('secondRow') && ["10,000", "40,000", "50,000", "250,000", "290,000", "20", "60", "200", "700"].includes($(this).text())){
            $(this).parent().click(buySkin);
        }
    });

    clearTimeout(timeoutId);

    $('.swAvatarTile.swMainContent.floatingContainer.clickAble.unlocked .swAvatarTileTypeContainer .swAvatarTileType.rightLeftTopBottom .swAvatarTileRarityColor.hide').parent().parent().parent().addClass('hidden');
    $('.swAvatarTile.swMainContent.floatingContainer.clickAble .swAvatarTileTypeContainer .swAvatarTileType.rightLeftTopBottom .swAvatarTileRarityColor.hide').parent().parent().parent().addClass('hidden');
    $('.swAvatarTile.swMainContent.floatingContainer.clickAble .swAvatarTileTypeContainer .swAvatarTileType.rightLeftTopBottom .swAvatarTileRarityColor.tier1').parent().parent().parent().addClass('hidden');
    $('.swAvatarTile.swMainContent.floatingContainer.clickAble .swAvatarTileTypeContainer .swAvatarTileType.rightLeftTopBottom .swAvatarTileRarityColor.tier2').parent().parent().parent().addClass('hidden');
    $('.swAvatarTile.swMainContent.floatingContainer.clickAble .swAvatarTileTypeContainer .swAvatarTileType.rightLeftTopBottom .swAvatarTileRarityColor.tier3').parent().parent().parent().addClass('hidden');

    if(!locked){

        if(tier0) $('.swAvatarTile.swMainContent.floatingContainer.clickAble.unlocked .swAvatarTileTypeContainer .swAvatarTileType.rightLeftTopBottom .swAvatarTileRarityColor.hide').closest('.hidden').removeClass('hidden');
        if(tier1) $('.swAvatarTile.swMainContent.floatingContainer.clickAble .swAvatarTileTypeContainer .swAvatarTileType.rightLeftTopBottom .swAvatarTileRarityColor.tier1').closest('.hidden').removeClass('hidden');
        if(tier2) $('.swAvatarTile.swMainContent.floatingContainer.clickAble .swAvatarTileTypeContainer .swAvatarTileType.rightLeftTopBottom .swAvatarTileRarityColor.tier2').closest('.hidden').removeClass('hidden');
        if(tier3) $('.swAvatarTile.swMainContent.floatingContainer.clickAble .swAvatarTileTypeContainer .swAvatarTileType.rightLeftTopBottom .swAvatarTileRarityColor.tier3').closest('.hidden').removeClass('hidden');

        if(!tier0 && !tier1 && !tier2 && !tier3 || tier0 && tier1 && tier2 && tier3){
            $('.swAvatarTile.swMainContent.floatingContainer.clickAble .swAvatarTileTypeContainer .swAvatarTileType.rightLeftTopBottom .swAvatarTileRarityColor.hide').closest('.hidden').removeClass('hidden');
            $('.swAvatarTile.swMainContent.floatingContainer.clickAble .swAvatarTileTypeContainer .swAvatarTileType.rightLeftTopBottom .swAvatarTileRarityColor.tier1').closest('.hidden').removeClass('hidden');
            $('.swAvatarTile.swMainContent.floatingContainer.clickAble .swAvatarTileTypeContainer .swAvatarTileType.rightLeftTopBottom .swAvatarTileRarityColor.tier2').closest('.hidden').removeClass('hidden');
            $('.swAvatarTile.swMainContent.floatingContainer.clickAble .swAvatarTileTypeContainer .swAvatarTileType.rightLeftTopBottom .swAvatarTileRarityColor.tier3').closest('.hidden').removeClass('hidden');
        }
    }
    else{
        if(tier0){
            $('.swAvatarTilePrice').each(function() {
                if (["10,000", "40,000", "50,000", "250,000", "290,000"].includes($(this).text())){
                    $(this).closest('.hidden').removeClass('hidden');
                }
                else if($(this).text() === '700'){
                    if(!$(this).parent().hasClass('secondRow')) $(this).closest('.hidden').removeClass('hidden');
                }
            });
        }
        if(tier1){
            $('.swAvatarTilePrice').each(function() {
                if ($(this).text() === '20' && !$(this).parent().hasClass('hide')) {
                    $(this).closest('.hidden').removeClass('hidden');
                }
            });
        }
        if(tier2){
            $('.swAvatarTilePrice').each(function() {
                if ($(this).text() === '60' && !$(this).parent().hasClass('hide')) {
                    $(this).closest('.hidden').removeClass('hidden');
                }
            });
        }
        if(tier3){
            $('.swAvatarTilePrice').each(function() {
                if ($(this).text() === '200' && !$(this).parent().hasClass('hide')) {
                    $(this).closest('.hidden').removeClass('hidden');
                }
            });
        }
        if(!tier0 && !tier1 && !tier2 && !tier3 || tier0 && tier1 && tier2 && tier3){
            $('.swAvatarTile.swMainContent.floatingContainer.clickAble .swAvatarTileTypeContainer .swAvatarTileType.rightLeftTopBottom .swAvatarTileRarityColor.hide').closest('.hidden').removeClass('hidden');
            $('.swAvatarTile.swMainContent.floatingContainer.clickAble.unlocked .swAvatarTileTypeContainer .swAvatarTileType.rightLeftTopBottom .swAvatarTileRarityColor.hide').parent().parent().parent().addClass('hidden');
        }
    }
}

function getSkinsNames(){
    skinNameList = $('.swTopBarAvatarImageContainer.clickAble.swTopBarImageContainer').map(function() {
        return this.classList.item(this.classList.length - 1);
    }).get();
    skinNameList = skinNameList.slice(2, -1);
}

function textboxProcess(searchList){
    if(searchList != null){
        $('.swTopBarAvatarImageContainer.clickAble.swTopBarImageContainer').each(function() {
            this.classList.remove("hidden");
        });
        $('.swTopBarAvatarImageContainer.clickAble.swTopBarImageContainer').each(function() {
            let lastClass = this.classList.item(this.classList.length - 1);
            if(lastClass == "selected"){
                lastClass = this.classList.item(this.classList.length - 2);
                $(this).parent().find(".swTopBarAvatarSkinContainer").css("width", "0px");
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

function buySkin(){
    setTimeout(function() {
        document.getElementById("swRightColumnActionButtonText").click()
    }, 100);
}

new Listener("unlock avatar", (payload) => {
    countSkins();
    skinFiltering();
}).bindListener();

AMQ_addScriptData({
    name: "Skin Plus",
    author: "Mxyuki",
    description: `
        <p>This script help you in the AMQ Skins Store.</p>
        <p>How to use it ?</p>
        <p>Total Skins Counter : Just count the number of skins you have and make a % of collection</p>
        <img src="https://i.imgur.com/1wfrCvF.png">
        <p>Tier Filter : When a Skin is Display you are able to filter by Skin Tier</p>
        <p>Unlocked Skins Filter</p>
        <img src="https://i.imgur.com/yWT44em.png" alt="Unlocked Skins Tier Filter">
        <img src="https://i.imgur.com/dH9Bl9b.png" alt="Unlocked Skins Tier Filter">
        <p>Locked Skins Filter</p>
        <img src="https://i.imgur.com/Uuh5Hl8.png" alt="Locked Skins Tier Filter">
        <img src="https://i.imgur.com/MzPyDfI.png" alt="Locked Skins Tier Filter">
        <p>Search Bar : Allow you to Filter Skins at the top by the Skin Name</p>
        <img src="https://i.imgur.com/RYVGHII.png" alt="Skin Search Bar">
        <img src="https://i.imgur.com/5tEbNM8.png" alt="Filtered Top Bar">
        <p>Fast Buy : Just click on the Price of a Skin to Buy it</p>
        <img src="https://i.imgur.com/bOcAFtc.png" alt="Fast Buy">
        <p>Skins Width : Allow you to change the size of the Skins</p>
        <img src="https://i.imgur.com/Do7Yra3.png" alt="Skin Width">
    `
});
