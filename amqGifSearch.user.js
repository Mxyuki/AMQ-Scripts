// ==UserScript==
// @name         AMQ Gif Search
// @namespace    https://github.com/Mxyuki/AMQ-Scripts
// @version      0.7
// @description  A test to add a gif search fonction on amq to add it to kempanator Chat Plus script
// @author       Mxyuki
// @match        https://animemusicquiz.com/
// @downloadURL  https://github.com/Mxyuki/AMQ-Scripts/raw/main/amqGifSearch.user.js
// @updateURL    https://github.com/Mxyuki/AMQ-Scripts/raw/main/amqGifSearch.user.js
// ==/UserScript==

const TENOR_API_KEY = 'LIVDSRZULELA';
const SEARCH_BAR_ID = 'gcGifTextbox';
const SEARCH_BUTTON_ID = 'search-button';
const GIF_CONTAINER_ID = 'gif-container';

if (document.querySelector("#startPage")) return;

$('.gcInputContainer').append('<div id="gcGifSearcherContainer"></div>');
$('#gcGifSearcherContainer').append('<div id="gcGifSearcherButton" class="clickAble"></div>');
$('#gcGifSearcherButton').append('<i class="fa fa-picture-o" aria-hidden="true"></i>');
$('<div id="gcGifContainer"></div>').insertAfter('#gcMessageContainer');
$('#gcGifContainer').append('<input type="text" id="gcGifTextbox">');
$('#gcGifContainer').append('<button id="search-button">');
$('#gcGifContainer').append('<div id="gif-container">');

$('#gcGifSearcherButton').click(function() {
    $('#gcGifContainer').toggle();
});

$('#gcGifSearcherContainer').css({
    'position': 'absolute',
    'top': '35px',
    'right': '86px',
    'width': '24px',
    'height': '29px'
});

$('#gcGifSearcherButton > i').css({
    'font-size': '25px',
    'color': '#1b1b1b'
});

$('#gcGifContainer').css({
    'height': '190px',
    'width': '100%',
    'display': 'none',
    'position': 'absolute',
    'bottom': '75px',
    'background-color': 'rgba(0, 0, 0, 0.5)'
});

$('#gcGifTextbox').css({
    'width': '85%'
});
$('#search-button').css({
    'width': '15%'
});

$('#search-button').html('Search');

$('#gif-container').css({
    'overflow': 'auto',
    'maxHeight': '175px'
});

$(document).ready(function() {
    $(`#${SEARCH_BUTTON_ID}`).click(function() {
        $('.tenorGif').remove();
        const searchQuery = $(`#${SEARCH_BAR_ID}`).val();
        fetch(`https://api.tenor.com/v1/search?q=${searchQuery}&key=${TENOR_API_KEY}&limit=50`)
            .then(response => response.json())
            .then(data => {
            const gifs = data.results;
            gifs.forEach(gif => {
                const gifUrl = gif.media[0].gif.url;
                const gifImg = $('<img class="tenorGif" lazy>').attr('src', gifUrl);
                $(gifImg).on('click', function() {
                    const textbox = document.getElementById('gcInput');
                    textbox.value += $(this).attr('src');
                    console.log($(this).attr('src'));
                    $('#gcGifContainer').toggle();
                });
                $(`#${GIF_CONTAINER_ID}`).append(gifImg);

                $('.tenorGif').css({
                    'height': '70px',
                    'margin-left': '3px',
                    'margin-bottom': '3px',
                    'border-radius': '5px',
                    'cursor': 'pointer'
                });
            });
        });
    });
});
