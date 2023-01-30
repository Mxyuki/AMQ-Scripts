// ==UserScript==
// @name         AMQ TypoFactory
// @namespace    https://github.com/Mxyuki
// @version      1.0
// @description  Most useless amq script, but you can mess with your answer so it's fun.
// @author       Mxyuki
// @match        https://animemusicquiz.com/*
// @require      https://raw.githubusercontent.com/TheJoseph98/AMQ-Scripts/master/common/amqWindows.js
// ==/UserScript==

if (document.getElementById("startPage")) return;

let loadInterval = setInterval(() => {
    if (document.getElementById("loadingScreen").classList.contains("hidden")) {
        setup();
        clearInterval(loadInterval);
    }
}, 500);

let savedText;
let colors = ["#CBE4F9", "#CDF5F6", "#EFF9DA", "#F9EBDF", "#F9D8D6", "#D6CDEA"];

function setup() {
    let oldWidth = $("#qpOptionContainer").width();
    $("#qpOptionContainer").width(oldWidth + 35);

    $("#qpOptionContainer > div").append($(`<div id="qpTypoFactory" class="clickAble qpOption"><i aria-hidden="true" class="fa fa-bars qpMenuItem" style="margin-right: 5px; width: 27px;"></i></div>`)
        .click(() => {
            if (typoWindow.isVisible()) {
                typoWindow.close();
            }
            else {
                typoWindow.open();
            }
        })
        .popover({
            content: "Typo Factory",
            trigger: "hover",
            placement: "bottom"
        })
    );

    let typoWindow = new AMQWindow({
        title: "Typo Factory",
        width: 350,
        height: 250,
        zIndex: 1054,
        draggable: true
    });

    typoWindow.addPanel({
        width: 1.0,
        height: 100,
        position: {
            x: 0,
            y: 20
        },
        id: "tfPanel"
    });

    typoWindow.addPanel({
        width: 1.0,
        height: 50,
        position: {
            x: 0,
            y: 110
        },
        id: "tfPanelSave"
    });

    typoWindow.panels[0].panel.append(
        $(`<div id="tfButtonPanel"></div>`)
        .append(
            $(`<button class="btn btn-primary tfButton" style="margin-left: 5px; margin-top: 5px;">Typo</button>`).click(function () {
                typo();
                buttonColor();
            })
        )
        .append(
            $(`<button class="btn btn-primary tfButton" style="margin-left: 5px; margin-top: 5px;">Case</button>`).click(function () {
                randomCase();
                buttonColor();
            })
        )
        .append(
            $(`<button class="btn btn-primary tfButton" style="margin-left: 5px; margin-top: 5px;">Reverse</button>`).click(function () {
                reverse();
                buttonColor();
            })
        )
        .append(
            $(`<button class="btn btn-primary tfButton" style="margin-left: 5px; margin-top: 5px;">Space</button>`).click(function () {
                space();
                buttonColor();
            })
        )
        .append(
            $(`<button class="btn btn-primary tfButton" style="margin-left: 5px; margin-top: 5px;">Kwe Mode</button>`).click(function () {
                kweMode();
                buttonColor();
            })
        )
        .append(
            $(`<button class="btn btn-primary tfButton" style="margin-left: 5px; margin-top: 5px;">Shuffle</button>`).click(function () {
                wordShuffle();
                buttonColor();
            })
        )
    );

    typoWindow.panels[1].panel.append(
        $(`<div id="tfSavePanel"></div>`)
        .append(
            $(`<button class="btn btn-primary tfButton" style="margin-left: 5px; margin-top: 5px;">Save</button>`).click(function () {
                save();
                buttonColor();
            })
        )
        .append(
            $(`<button class="btn btn-primary tfButton" style="margin-left: 5px; margin-top: 5px;">Apply</button>`).click(function () {
                apply();
                buttonColor();
            })
        )
    );

    buttonColor();

}

function typo(){
    console
    let string = $("#qpAnswerInput").val();
        function shuffleString(str, numOfChars) {
            let shuffled = str.split('');
            let indices = [];
            for (let i = 0; i < numOfChars; i++) {
                let randomIndex = Math.floor(Math.random() * shuffled.length);
                indices.push(randomIndex);
            }
            for (let i = 0; i < indices.length; i++) {
                let randomIndex = Math.floor(Math.random() * (indices.length - i)) + i;
                [shuffled[indices[i]], shuffled[indices[randomIndex]]] = [shuffled[indices[randomIndex]], shuffled[indices[i]]];
            }
            return shuffled.join('');
        }
        let words = string.split(" ");
        let shuffledWords = words.map(function(word) {
            return shuffleString(word, 5);
        });
        $("#qpAnswerInput").val(shuffledWords.join(" "));
        quiz.answerInput.submitAnswer(true);
}

function typo(){
    let string = $("#qpAnswerInput").val();
    function shuffleString(str, numOfChars) {
        let shuffled = str.split('');
        let indices = [];
        for (let i = 0; i < numOfChars; i++) {
            let randomIndex = Math.floor(Math.random() * shuffled.length);
            indices.push(randomIndex);
        }
        for (let i = 0; i < indices.length; i++) {
            let randomIndex = Math.floor(Math.random() * (indices.length - i)) + i;
            [shuffled[indices[i]], shuffled[indices[randomIndex]]] = [shuffled[indices[randomIndex]], shuffled[indices[i]]];
        }
            return shuffled.join('');
    }
    let words = string.split(" ");
    let shuffledWords = words.map(function(word) {
        return shuffleString(word, 2);
    });
    $("#qpAnswerInput").val(shuffledWords.join(" "));
    quiz.answerInput.submitAnswer(true);
}

function randomCase(){
    let string = $("#qpAnswerInput").val();
    let upperCase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let lowerCase = 'abcdefghijklmnopqrstuvwxyz';
    let result = '';

    for (let i = 0; i < string.length; i++) {
        let randomNumber = Math.random();
        if (randomNumber > 0.5) {
            if (upperCase.indexOf(string[i]) !== -1) {
                result += string[i];
            } else {
                result += string[i].toUpperCase();
            }
        } else {
            if (lowerCase.indexOf(string[i]) !== -1) {
                result += string[i];
            } else {
                result += string[i].toLowerCase();
            }
        }
    }
    $("#qpAnswerInput").val(result);
    quiz.answerInput.submitAnswer(true);
}

function reverse(){
    let string = $("#qpAnswerInput").val();
    let result = '';
    for (let i = string.length - 1; i >= 0; i--) {
        result += string[i];
    }
    $("#qpAnswerInput").val(result);
    quiz.answerInput.submitAnswer(true);
}

function space(){
    let string = $("#qpAnswerInput").val();
    let result = '';
    for (let i = 0; i < string.length; i++) {
        result += string[i] + ' ';
        }
        $("#qpAnswerInput").val(result);
    quiz.answerInput.submitAnswer(true);
}

function kweMode(){
    let string = $("#qpAnswerInput").val();
    let result = '';
    for (let i = 0; i < string.length; i++) {
        if (string[i].toLowerCase() === 's' || string[i].toLowerCase() === 'x' || string[i].toLowerCase() === 'e') {
            result += string[i];
        }
    }
    $("#qpAnswerInput").val(result);
    quiz.answerInput.submitAnswer(true);
}

function wordShuffle() {
    let string = $('#qpAnswerInput').val();
    let words = string.split(' ');
    for (let i = 0; i < words.length; i++) {
        let j = Math.floor(Math.random() * (words.length - i)) + i;
        [words[i], words[j]] = [words[j], words[i]];
    }
    $('#qpAnswerInput').val(words.join(' '));
    quiz.answerInput.submitAnswer(true);
}

function save(){
    savedText = $("#qpAnswerInput").val();
}

function apply(){
    $("#qpAnswerInput").val(savedText);
    quiz.answerInput.submitAnswer(true);
}

function buttonColor(){
    $('.tfButton').each(function(){
        $(this).css('background-color', colors[Math.floor(Math.random() * colors.length)]);
        $(this).css('color', "#000");
      });
}
