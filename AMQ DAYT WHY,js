// ==UserScript==
// @name         AMQ Dayt WHY
// @namespace    https://github.com/Mxyuki
// @version      0.2
// @description  To add back short name, because WHY DAYT.
// @author       Mxyuki
// @match        https://animemusicquiz.com/*
// ==/UserScript==

let x;

window.addEventListener("keydown", checkKeyPress, false)
function checkKeyPress(key) {

    //If enter is pressed
    if (key.keyCode == '13') {

      //Get the answer
      x = document.getElementById("qpAnswerInput").value;

       //Change answer to lowercase to match with the if
       x = x.toLowerCase();

        //Denyuden
        if (x == 'denyuden'){
          $("#qpAnswerInput").val('Densetsu no Yuusha no Densetsu');
        }

        //MahoYome
        if (x == 'mahoyome'){
          $("#qpAnswerInput").val('Mahōtsukai no Yome');
        }

        //Cardcaptor Sakura
        if (x == 'sakura'){
          $("#qpAnswerInput").val('Cardcaptor Sakura');
        }

        //Meitantei Conan
        if (x == 'conan'){
          $("#qpAnswerInput").val('Meitantei Conan');
        }

        //Kimisen
        if (x == 'kimisen'){
          $("#qpAnswerInput").val('Kimi to Boku no Saigo no Senjō, Arui wa Sekai ga Hajimaru Seisen');
        }

        //Inari konkon
        if (x == 'inari'){
          $("#qpAnswerInput").val('Inari, Konkon, Koi Iroha.');
        }

        //Noucome
        if (x == 'noucome'){
          $("#qpAnswerInput").val('Ore no Nōnai Sentakushi ga, Gakuen Love Come o Zenryoku de Jama Shiteiru');
        }

        //UBW
        if (x == 'ubw'){
          $("#qpAnswerInput").val('Fate/stay night: Unlimited Blade Works');
        }

        //oreshura
        if (x == 'oreshura'){
          $("#qpAnswerInput").val('Ore no Kanojo to Osananajimi ga Shuraba Sugiru');
        }



  }
}

