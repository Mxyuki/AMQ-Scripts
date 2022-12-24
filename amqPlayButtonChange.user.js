// ==UserScript==
// @name         AMQ PlayButton Change
// @namespace    https://github.com/Mxyuki/AMQ-Scripts
// @version      0.3
// @description  Change how the Solo, Multi and Nexus button are displayed
// @author       Mxyuki
// @match        https://animemusicquiz.com/*
// @downloadURL  https://github.com/Mxyuki/AMQ-Scripts/raw/main/amqPlayButtonChange.user.js
// @updateURL    https://github.com/Mxyuki/AMQ-Scripts/raw/main/amqPlayButtonChange.user.js
// ==/UserScript==

if (document.getElementById("startPage")) return;

const mpPlayButton = document.getElementById('mpPlayButton');

mpPlayButton.removeAttribute('data-toggle');
mpPlayButton.removeAttribute('data-target');

const h1Element = mpPlayButton.querySelector('h1');
mpPlayButton.removeChild(h1Element);

const soloButton = createButton('Solo', () => hostModal.displayHostSolo());
const multiButton = createButton('Multi', () => viewChanger.changeView('roomBrowser'));
const nexusButton = createButton('Nexus', () => viewChanger.changeView('nexus'));

mpPlayButton.append(soloButton, multiButton, nexusButton);
mpPlayButton.style.display = 'flex';
mpPlayButton.style.justifyContent = 'space-between';

addButtonHoverStyles(soloButton, 'https://i.imgur.com/ycmLeXE.png');
addButtonHoverStyles(multiButton, 'https://i.imgur.com/D5PGM29.png');
addButtonHoverStyles(nexusButton, 'https://i.imgur.com/idgLUtS.png');

const styleElement = document.querySelector('style');
const styleSheet = styleElement.sheet;

styleSheet.insertRule('.miyuButton { width: 33.33%; background-color: transparent; border: none; }', styleSheet.cssRules.length);
styleSheet.insertRule('#mainMenu.button { display: flex; }', styleSheet.cssRules.length);

mpPlayButton.style.backgroundSize = 'cover';

const buttons = document.querySelectorAll('#mainMenu > .button');

buttons.forEach(button => {
  button.style.display = 'flex';
  button.style.marginLeft = '15%';
});

function createButton(text, onclick) {
  const button = document.createElement('button');
  button.textContent = text;
  button.onclick = onclick;
  button.classList.add('miyuButton');
  button.id = `miyu${text}`;
  return button;
}

function addButtonHoverStyles(button, hoverUrl) {
  button.addEventListener('mouseover', () => {
    mpPlayButton.style.background = `url("${hoverUrl}")`;
  });
  button.addEventListener('mouseout', () => {
    mpPlayButton.style.background = '';
  });
}
