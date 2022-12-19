// ==UserScript==
// @name         EloBot
// @namespace    https://github.com/Mxyuki/AMQ-Scripts
// @version      0.1.1
// @description  Bored so i try to make a Bot that make an elo system room
// @author       Mxyuki
// @match        https://animemusicquiz.com/
// @grant        none
// ==/UserScript==

let eloList =[];
let playerList =[];

if (document.getElementById("startPage")) return;

new Listener("New Player", (payload) => {
    let name = payload.name;
    let id = payload.gamePlayerId;
    playerList.push({name: name, id: id});
    if(name != "Miyuki_Damon"){
        let player = eloList.find(p => p.name === name);
        if(player){
            console.log("name: " + name);
            console.log("id:   " + id);
            console.log("elo:  " + player.elo);
        }
        else{
            eloList.push({name: name, elo: 0});
        }
    }
}).bindListener();

new Listener("Spectator Change To Player", (payload) => {
    let name = payload.name;
    let id = payload.gamePlayerId;
    playerList.push({name: name, id: id});
    if(name != "Miyuki_Damon"){
        let player = eloList.find(p => p.name === name);
        if(player){
            console.log("name: " + name);
            console.log("id:   " + id);
            console.log("elo:  " + player.elo);
        }
        else{
            eloList.push({name: name, elo: 0});
        }
    }
}).bindListener();

new Listener("answer results", (payload) => {

    payload.players.forEach((x) => {
        console.log(x.gamePlayerId);
        console.log(x.correct);
    });
}).bindListener();
