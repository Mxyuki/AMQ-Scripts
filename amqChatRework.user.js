// ==UserScript==
// @name         AMQ Chat Rework
// @version      0.1
// @description  Remake the AMQ chat more Beautiful
// @description  Still need some work, like adding team chat, and maybe many things that i forgot
// @author       You
// @match        https://animemusicquiz.com/*
// ==/UserScript==

if (document.querySelector("#startPage")) return;

let selfColor = "#39393B";
let otherColor = "#53505a";

function updateChatLook() {
  $("#gcMessageContainer li[id^='gcPlayerMessage-']").each(function() {
    var $message = $(this);
    var $timestamp = $message.find(".gcTimestamp");
    var $badge = $message.find(".chatBadges");
    var $username = $message.find(".gcUserName");
    var $messageContent = $message.find(".gcMessage");

    $message.css("width", "80%");
    $message.css("margin-bottom", "5px");

    var $image = $("<img src='https://i.imgur.com/XTPCaa9.png' style='width: 10%;'>");
    $timestamp.before($image);

    if ($username.text() === selfName) {
      $message.css({
        "text-align": "left",
        "margin-right": "10px",
        "background-color": selfColor,
        "color": "white",
        "float": "right",
        "clear": "both",
        "border-radius": "10px 0 10px 10px"
      });
    } else {
      $message.css({
        "text-align": "left",
        "margin-left": "10px",
        "background-color": otherColor,
        "color": "white",
        "float": "none",
        "clear": "both",
        "border-radius": "0 10px 10px 10px"
      });
    }

    var $headerContainer = $("<div class='message-header'></div>");
    $headerContainer.append($timestamp, $badge, $username);
    $headerContainer.css("display", "flex");
    $headerContainer.css("flex-direction", "row");
    $headerContainer.css("align-items", "center");

    $username.text($username.text().replace(":", ""));

    var $messageContainer = $("<div class='message-container'></div>");
    $messageContainer.append($messageContent);

    $message.html($headerContainer);
    $message.append($messageContainer);
  });
}

updateChatLook();

new Listener("game chat update", function(payload) {
  setTimeout(function() {
    updateChatLook();
  }, 10);
}).bindListener();
