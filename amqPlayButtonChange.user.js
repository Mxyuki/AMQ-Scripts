// ==UserScript==
// @name         AMQ PlayButton Change
// @namespace    https://github.com/Mxyuki/AMQ-Scripts
// @version      0.5
// @description  Change how the Solo, Multi, Jam, Nexus, and Custom buttons are displayed.
// @author       Mxyuki
// @match        https://*.animemusicquiz.com/*
// @require      https://github.com/Mxyuki/AMQ-Scripts/raw/refs/heads/main/amqCheckScriptVersion.js
// @downloadURL  https://github.com/Mxyuki/AMQ-Scripts/raw/main/amqPlayButtonChange.user.js
// @updateURL    https://github.com/Mxyuki/AMQ-Scripts/raw/main/amqPlayButtonChange.user.js
// ==/UserScript==

if ($("#loginPage").length) return;

const version = "0.5";
checkScriptVersion("AMQ PlayButton Change", version);

const mpPlayButton = $('#mpPlayButton');
mpPlayButton.removeAttr('data-toggle data-target').empty();

const buttonsConfig = [
    { text: 'Solo', action: () => hostModal.displayHostSolo(), hoverImage: 'https://i.imgur.com/U0umdCV.png' },
    { text: 'Multi', action: () => viewChanger.changeView('roomBrowser'), hoverImage: 'https://i.imgur.com/Ym8nu2E.png' },
    { text: 'Custom', action: () => customQuizBrowser.show(), hoverImage: 'https://i.imgur.com/QWs6tGm.png' },
    { text: 'Jam', action: () => roomBrowser.fireJoinJamGame(), hoverImage: 'https://i.imgur.com/UUlrX1e.png' },
    { text: 'Nexus', action: () => viewChanger.changeView('nexus'), hoverImage: 'https://i.imgur.com/dMSqgCV.png' }
];

buttonsConfig.forEach(config => {
    const button = $('<button>')
        .addClass('miyuButton')
        .attr('id', `miyu${config.text}`)
        .text(config.text)
        .on('click', config.action)
        .hover(
            () => mpPlayButton.css({ 'background-image': `url("${config.hoverImage}")`, 'background-size': 'cover' }),
            () => mpPlayButton.css({ 'background-image': '', 'background-size': '' })
        );
    mpPlayButton.append(button);
});

mpPlayButton.css({
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    margin: '0 auto',
    marginBottom: '3vh',
    minWidth: '235px',
    maxWidth: '400px'
});

$('<style>').prop('type', 'text/css').html(`
  .miyuButton {
      flex: 1;
      background-color: transparent;
      border: none;
      text-align: center;
      font-size: min(2.5vw, 24px);
      padding: 10px 0;
      margin: 0 5px;
      display: flex;
      justify-content: center;
      align-items: center;
      max-width: 20%;
      box-sizing: border-box;
  }
`).appendTo('head');
