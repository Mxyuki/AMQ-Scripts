// ==UserScript==
// @name         AMQ T Chat
// @namespace    https://github.com/Mxyuki/AMQ-Scripts
// @version      0.1
// @description  Make an Ingame button at the top left of the chat to Toggle the chat.
// @description  If there is a message in the chat a Blue Box Shaddow will appear to tell you.
// @description  I made it for my screen that is a 2560x1440 but it should work for a 1920x1080 too.
// @description  Some issue might happen sometime, and idk how to solve them and too lazy to find how to solve them because they are minors problems, just avoid zooming in and zooming out too much and it should be ok.
// @author       Mxyuki
// @match        https://animemusicquiz.com/*
// ==/UserScript==

if (document.querySelector("#loginPage")) return;

let isHidden = false;

const qpAvatarRow = $('#qpAvatarRow');
qpAvatarRow.css('padding-bottom', '5%');

const newButton = $('<button/>', {
    id: 'CHbutton',
});

const chevronIcon = $('<i/>', {
    id: 'CHfa',
    class: 'fa fa-chevron-right',
});

newButton.append(chevronIcon);

newButton.on('click', function() {
    console.log($('#gameChatPage > .col-xs-9'));
    const CHfa = $('#CHfa');
    const gameChatContainer = $('#gameChatContainer');
    const CHbutton = $('#CHbutton');
    if(isHidden){
        CHfa.removeClass();
        CHfa.addClass('fa fa-chevron-right');
        gameChatContainer.removeClass('hidden');
        $('.gamePage').css('width', '100%');
        CHbutton.css('box-shadow', 'none');
        isHidden = !isHidden;
    }
    else {
        CHfa.removeClass();
        CHfa.addClass('fa fa-chevron-left');
        gameChatContainer.addClass('hidden');
        $('.gamePage').css('width', '133.5%');
        isHidden = !isHidden;
    }
    console.log(isHidden);
});

newButton.css({
    color: '#d9d9d9',
    backgroundColor: '#1b1b1b',
    height: '30px',
    width: '30px',
    position: 'absolute',
    right: '35px',
    transform: 'skewX(-35deg)',
    border: 'none',
    zIndex: '-1',
});

$('#qpOptionContainer').append(newButton);

new Listener("Game Chat Message", (a) => {
	if(isHidden){
        const CHbutton = $('#CHbutton');
        CHbutton.css('box-shadow', '0 0 5px 4px #85a4e2');
    }
}).bindListener();

new Listener("game chat update", (a) => {
    if(isHidden){
        const CHbutton = $('#CHbutton');
        CHbutton.css('box-shadow', '0 0 5px 4px #85a4e2');
    }
}).bindListener();
