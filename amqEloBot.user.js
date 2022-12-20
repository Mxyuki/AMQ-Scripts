// ==UserScript==
// @name         EloBot
// @namespace    https://github.com/Mxyuki/AMQ-Scripts
// @version      0.1.4
// @description  Bored so i try to make a Bot that make an elo system room
// @author       Mxyuki
// @match        https://animemusicquiz.com/
// @grant        none
// ==/UserScript==

let eloList =[];
let playerList =[];
let totalElo = 0;
let avgElo = 0;
let joinPlayer = 0;

if (document.getElementById("startPage")) return;

new Listener("New Player", (payload) => {
    joinPlayer++;
    let name = payload.name;
    let id = payload.gamePlayerId;
    playerList.push({name: name, id: id});
    if(name != "Miyuki_Damon"){
        let player = eloList.find(p => p.name === name);
        if(player){
            totalElo += player.elo;
            avgElo = totalElo / joinPlayer;
            console.log("avgElo: " + avgElo);
            console.log("name: " + name);
            console.log("id:   " + id);
            console.log("elo:  " + player.elo);
            console.log("----------------------------");
        }
        else{
            eloList.push({name: name, elo: 1000});
            totalElo += 1000;
            avgElo = totalElo / joinPlayer;
        }
    }
}).bindListener();



new Listener("Spectator Change To Player", (payload) => {
    joinPlayer++;
    let name = payload.name;
    let id = payload.gamePlayerId;
    playerList.push({name: name, id: id});
    if(name != "Miyuki_Damon"){
        let player = eloList.find(p => p.name === name);
        if(player){
            totalElo += player.elo;
            avgElo = totalElo / joinPlayer;
            console.log("avgElo: " + avgElo);
            console.log("name: " + name);
            console.log("id:   " + id);
            console.log("elo:  " + player.elo);
            console.log("----------------------------");
        }
        else{
            eloList.push({name: name, elo: 1000});
            totalElo += 1000;
            avgElo = totalElo / joinPlayer;
        }
    }
}).bindListener();

new Listener("Player Left", (payload) => {
    joinPlayer--;
    let name = payload.name;
    let id = payload.gamePlayerId;
    if(name != "Miyuki_Damon"){
        let player = eloList.find(p => p.name === name);
        if(player){
            totalElo -= player.elo;
            avgElo = totalElo / joinPlayer;
            console.log("avgElo: " + avgElo);
            console.log("name: " + name);
            console.log("id:   " + id);
            console.log("elo:  " + player.elo);
            console.log("----------------------------");
        }
        else return;
    }
}).bindListener();

new Listener("Player Changed To Spectator", (payload) => {
    joinPlayer--;
    let name = payload.playerDescription.name;
    console.log("nameee: " + name);
    let id = payload.gamePlayerId;
    if(name != "Miyuki_Damon"){
        let player = eloList.find(p => p.name === name);
        if(player){
            totalElo -= player.elo;
            avgElo = totalElo / joinPlayer;
            console.log("avgElo: " + avgElo);
            console.log("name: " + name);
            console.log("id:   " + id);
            console.log("elo:  " + player.elo);
            console.log("----------------------------");
        }
        else return;
    }
}).bindListener();


new Listener("answer results", (payload) => {

    totalElo = 0;

    console.log(payload.songInfo.animeDifficulty);
    let songDifficulty = payload.songInfo.animeDifficulty;
    if(isNaN(songDifficulty)) return;

    payload.players.forEach((x) => {
        console.log(x.gamePlayerId);
        console.log(x.correct);
        let answerId = x.gamePlayerId;
        const answerPlayer = playerList.find((p) => p.id === answerId);
        if (answerPlayer) {
                const eloPlayer = eloList.find((p) => p.name === answerPlayer.name);
                if (eloPlayer) {
                    if(x.correct == true){
                        eloPlayer.elo = Math.round(eloPlayer.elo + 25*( 1 - ( 1 / ( 1 + 10 ** (-( eloPlayer.elo - 30*(100-songDifficulty))/400)))));
                        totalElo += eloPlayer.elo;
                        avgElo = totalElo / joinPlayer;
                    }
                    else{
                        eloPlayer.elo = Math.round(eloPlayer.elo + 25*( 0 - ( 1 / ( 1 + 10 ** (-( eloPlayer.elo - 30*(100-songDifficulty))/400)))));
                        if(eloPlayer.elo <= 0) eloPlayer.elo = 1;
                        totalElo += eloPlayer.elo;
                        avgElo = totalElo / joinPlayer;
                    }
                    console.log("name: " + eloPlayer.name + " elo: " + eloPlayer.elo);
                    console.log("totalElo: " + totalElo + " avgElo: " + avgElo);
                    console.log("----------------------------");
                }
            }

    });
}).bindListener();
