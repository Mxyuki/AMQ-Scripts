// ==UserScript==
// @name         AMQ PlayButton Change
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Change how the Solo, Multi and Nexus button are diplayed
// @author       Mxyuki
// @match        https://animemusicquiz.com/
// ==/UserScript==

if (document.getElementById("startPage")) return;

// Select the mpPlayButton element
const mpPlayButton = document.getElementById('mpPlayButton');

// Remove the data-toggle and data-target attributes
mpPlayButton.removeAttribute('data-toggle');
mpPlayButton.removeAttribute('data-target');

// Select the h1 element and remove it from the mpPlayButton element
const h1Element = mpPlayButton.querySelector('h1');
mpPlayButton.removeChild(h1Element);

// Create the Solo button
const soloButton = document.createElement('button');
soloButton.textContent = 'Solo';
soloButton.onclick = () => { hostModal.displayHostSolo(); };
soloButton.classList.add('miyuButton');
soloButton.id = 'miyuSolo';

// Create the Multi button
const multiButton = document.createElement('button');
multiButton.textContent = 'Multi';
multiButton.onclick = () => { viewChanger.changeView('roomBrowser'); };
multiButton.classList.add('miyuButton');
multiButton.id = 'miyuMulti';

// Create the Nexus button
const nexusButton = document.createElement('button');
nexusButton.textContent = 'Nexus';
nexusButton.onclick = () => { viewChanger.changeView('nexus'); };
nexusButton.classList.add('miyuButton');
nexusButton.id = 'miyuNexus';

// Append the buttons to the mpPlayButton element
mpPlayButton.appendChild(soloButton);
mpPlayButton.appendChild(multiButton);
mpPlayButton.appendChild(nexusButton);

// Add some styles to the buttons to make them take up equal space and align horizontally
mpPlayButton.style.display = 'flex';
mpPlayButton.style.justifyContent = 'space-between';

mpPlayButton.style.removeProperty('display');

// Select the style element that you want to add the rule to
const styleElement = document.querySelector('style');

// Get the CSSStyleSheet object for the style element
const styleSheet = styleElement.sheet;

// Add the rule to the style sheet
styleSheet.insertRule('.miyuButton { width: 33.33%; background-color: transparent; border: none; }', styleSheet.cssRules.length);

styleSheet.insertRule('#mainMenu.button { display: flex; }', styleSheet.cssRules.length);

const buttons = document.querySelectorAll('#mainMenu > .button');

// Iterate over the elements and change their CSS
buttons.forEach(button => {
  button.style.display = 'flex';
  button.style.marginLeft = '15%';
});
