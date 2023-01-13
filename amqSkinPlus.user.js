// ==UserScript==
// @name         AMQ Skin Plus
// @namespace    https://github.com/Mxyuki/AMQ-Scripts
// @version      0.4
// @description  Display in the skin Area, The Number of skin you have, The total number of skin in the game, And the percentage of skin you possess, Also let you filter skins by Tier.
// @author       Mxyuki
// @match        https://animemusicquiz.com/*
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

function setup(){

    var total = 0;
    var total2 = 0;
    var collection = 0;

    $(".swAvatarTile:nth-of-type(4n)").css("margin-right", "6.5%");

    if($('#swRightColumnTotalSkinArea')) $('#swRightColumnTotalSkinArea').remove();

    $('.swTopBarAvatarImageContainer > .swTopBarUnlockStatusContainer > .swTopBarUnlockStatusAmountContainerOuter > .swTopBarUnlockStatusAmountContainer > .swTopBarUnlockStautsNumberContainer > .swTopBarUnlockStatusUnlocked').each(function() {
        total += parseInt($(this).text());
    });

    $('.swTopBarAvatarImageContainer > .swTopBarUnlockStatusContainer > .swTopBarUnlockStatusAmountContainerOuter > .swTopBarUnlockStatusAmountContainer > .swTopBarUnlockStautsNumberContainer > .swTopBarUnlockStatusTotal').each(function() {
        total2 += parseInt($(this).text());
    });

    total = total - 45;
    total2 = total2 - 105;
    collection = ((total/total2)*100).toFixed(2);

    console.log(total + " / " + total2);
    console.log("Collection : " + ((total/total2)*100).toFixed(2) + "%");

    $('#swRightColumnBottomInner').prepend(`
        <div id="skinTiers" style="display: flex; justify-content: space-between; margin: 15px">
             <p id="skinTier1" class="skinTierButtom">Tier 1</p>
             <p id="skinTier2" class="skinTierButtom">Tier 2</p>
             <p id="skinTier3" class="skinTierButtom">Tier 3</p>
             <p id="skinTierAll" class="skinTierButtom">All</p>
        </div>
        <div id="swRightColumnTotalSkin" style="margin-bottom: 10px">
            <div id="swRightColumnTotalSkinArea" class="text-center" style="margin-top: -20px;">
                <h1 style="font-size: 25px;">Total Skins:</h1>
                 ${total} / ${total2} | ${collection} %
            </div>
        </div>
    `);
    $(document).on("click", "#skinTier1", function(){
        tierOne();
    });
    $(document).on("click", "#skinTier2", function(){
        tierTwo();
    });
    $(document).on("click", "#skinTier3", function(){
        tierThree();
    });
    $(document).on("click", "#skinTierAll", function(){
        tierAll();
    });

    $(".skinTierButtom").hover(
        function() {
            $(this).css("cursor", "pointer");
        },
        function() {
            $(this).css("cursor", "default");
        }
    );

    $("#skinTier1").css({
        "color": "#757575",
        "font-size": "18px"
    });
    $("#skinTier2").css({
        "color": "#757575",
        "font-size": "18px"
    });
    $("#skinTier3").css({
        "color": "#757575",
        "font-size": "18px"
    });
    $("#skinTierAll").css({
        "font-size": "18px"
    });

}

function tierOne(){

    console.log("test");

    $('.swAvatarTile.swMainContent.floatingContainer.clickAble .swAvatarTileTypeContainer .swAvatarTileType.rightLeftTopBottom .swAvatarTileRarityColor.tier1').parent().parent().parent().removeClass('hidden');

    $('.swAvatarTile.swMainContent.floatingContainer.clickAble .swAvatarTileTypeContainer .swAvatarTileType.rightLeftTopBottom .swAvatarTileRarityColor.hide').parent().parent().parent().addClass('hidden');
    $('.swAvatarTile.swMainContent.floatingContainer.clickAble .swAvatarTileTypeContainer .swAvatarTileType.rightLeftTopBottom .swAvatarTileRarityColor.tier2').parent().parent().parent().addClass('hidden');
    $('.swAvatarTile.swMainContent.floatingContainer.clickAble .swAvatarTileTypeContainer .swAvatarTileType.rightLeftTopBottom .swAvatarTileRarityColor.tier3').parent().parent().parent().addClass('hidden');

    $(".swAvatarTile:nth-of-type(4n)").css("margin-right", "6.5%");

    $("#skinTier1").css("color", "#000");

    $("#skinTier2").css("color", "#757575");
    $("#skinTier3").css("color", "#757575");

}

function tierTwo(){
    $('.swAvatarTile.swMainContent.floatingContainer.clickAble .swAvatarTileTypeContainer .swAvatarTileType.rightLeftTopBottom .swAvatarTileRarityColor.tier2').parent().parent().parent().removeClass('hidden');

    $('.swAvatarTile.swMainContent.floatingContainer.clickAble .swAvatarTileTypeContainer .swAvatarTileType.rightLeftTopBottom .swAvatarTileRarityColor.hide').parent().parent().parent().addClass('hidden');
    $('.swAvatarTile.swMainContent.floatingContainer.clickAble .swAvatarTileTypeContainer .swAvatarTileType.rightLeftTopBottom .swAvatarTileRarityColor.tier1').parent().parent().parent().addClass('hidden');
    $('.swAvatarTile.swMainContent.floatingContainer.clickAble .swAvatarTileTypeContainer .swAvatarTileType.rightLeftTopBottom .swAvatarTileRarityColor.tier3').parent().parent().parent().addClass('hidden');

    $(".swAvatarTile:nth-of-type(4n)").css("margin-right", "6.5%");

    $("#skinTier2").css("color", "#000");

    $("#skinTier1").css("color", "#757575");
    $("#skinTier3").css("color", "#757575");

}
function tierThree(){
    $('.swAvatarTile.swMainContent.floatingContainer.clickAble .swAvatarTileTypeContainer .swAvatarTileType.rightLeftTopBottom .swAvatarTileRarityColor.tier3').parent().parent().parent().removeClass('hidden');

    $('.swAvatarTile.swMainContent.floatingContainer.clickAble .swAvatarTileTypeContainer .swAvatarTileType.rightLeftTopBottom .swAvatarTileRarityColor.hide').parent().parent().parent().addClass('hidden');
    $('.swAvatarTile.swMainContent.floatingContainer.clickAble .swAvatarTileTypeContainer .swAvatarTileType.rightLeftTopBottom .swAvatarTileRarityColor.tier1').parent().parent().parent().addClass('hidden');
    $('.swAvatarTile.swMainContent.floatingContainer.clickAble .swAvatarTileTypeContainer .swAvatarTileType.rightLeftTopBottom .swAvatarTileRarityColor.tier2').parent().parent().parent().addClass('hidden');

    $(".swAvatarTile:nth-of-type(4n)").css("margin-right", "6.5%");

    $("#skinTier3").css("color", "#000");

    $("#skinTier1").css("color", "#757575");
    $("#skinTier2").css("color", "#757575");

}

function tierAll(){
    $('.swAvatarTile.swMainContent.floatingContainer.clickAble .swAvatarTileTypeContainer .swAvatarTileType.rightLeftTopBottom .swAvatarTileRarityColor.hide').parent().parent().parent().removeClass('hidden');
    $('.swAvatarTile.swMainContent.floatingContainer.clickAble .swAvatarTileTypeContainer .swAvatarTileType.rightLeftTopBottom .swAvatarTileRarityColor.tier1').parent().parent().parent().removeClass('hidden');
    $('.swAvatarTile.swMainContent.floatingContainer.clickAble .swAvatarTileTypeContainer .swAvatarTileType.rightLeftTopBottom .swAvatarTileRarityColor.tier2').parent().parent().parent().removeClass('hidden');
    $('.swAvatarTile.swMainContent.floatingContainer.clickAble .swAvatarTileTypeContainer .swAvatarTileType.rightLeftTopBottom .swAvatarTileRarityColor.tier3').parent().parent().parent().removeClass('hidden');

    $(".swAvatarTile:nth-of-type(4n)").css("margin-right", "0");

    $("#skinTier1").css("color", "#757575");
    $("#skinTier2").css("color", "#757575");
    $("#skinTier3").css("color", "#757575");

}

new Listener("ticket roll result", (payload) => {
    setTimeout(function() {
        setup();
    }, 20000);
}).bindListener();

new Listener("unlock avatar", (payload) => {
    setup();
}).bindListener();
