// ==UserScript==
// @name         LowerToUpper
// @namespace    https://github.com/Mxyuki/
// @version      0.2
// @description  Change LowerCase to UpperCase
// @author       Miyuki
// @match        https://animemusicquiz.com/*
// @require      https://raw.githubusercontent.com/TheJoseph98/AMQ-Scripts/master/common/amqScriptInfo.js
// ==/UserScript==

var a = '';

(function() {

    window.addEventListener("keydown", checkKeyPress, false)
function checkKeyPress(key) {
//lower to upper
    if(key.keyCode == '45'){
    a = document.getElementById("qpAnswerInput").value;
                  if (a.length > 0) {
      quiz.skipClicked();
      $("#qpAnswerInput").val(a.toUpperCase());
      quiz.answerInput.submitAnswer(true);
    }
    }
//upper to lower
        if(key.keyCode == '46'){
    a = document.getElementById("qpAnswerInput").value;
                  if (a.length > 0) {
      quiz.skipClicked();
      $("#qpAnswerInput").val(a.toLowerCase());
      quiz.answerInput.submitAnswer(true);
    }
    }
}
})();

    AMQ_addScriptData({
        name: "Co-op Farn",
        author: "Miyuki",
        description: `

            <p>Change lowercase to uppercase.</p>
        `
    });
