// ==UserScript==
// @name         AMQ PlayButton Change
// @namespace    https://github.com/Mxyuki/AMQ-Scripts
// @version      0.6
// @description  Change how the Solo, Multi, Jam, Nexus, and Custom buttons are displayed.
// @author       Mxyuki
// @match        https://*.animemusicquiz.com/*
// @require      https://github.com/Mxyuki/AMQ-Scripts/raw/refs/heads/main/amqCheckScriptVersion.js
// @downloadURL  https://github.com/Mxyuki/AMQ-Scripts/raw/main/amqPlayButtonChange.user.js
// @updateURL    https://github.com/Mxyuki/AMQ-Scripts/raw/main/amqPlayButtonChange.user.js
// ==/UserScript==

if ($("#loginPage").length) return;

const version = "0.6";
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

function saveSettings() {
    const settings = {
        visibleButtons: buttonsConfig.map(config => $(`#toggle${config.text}`).prop('checked')),
        fontSize: $('#fontSizeInput').val(),
        showHoverImages: $('#hoverImagesToggle').prop('checked')
    };
    localStorage.setItem('playButtonSettings', JSON.stringify(settings));
}

function loadSettings() {
    const savedSettings = JSON.parse(localStorage.getItem('playButtonSettings'));
    if (savedSettings) {
        buttonsConfig.forEach((config, i) => {
            if (!savedSettings.visibleButtons[i]) $(`#miyu${config.text}`).hide();
            $(`#toggle${config.text}`).prop('checked', savedSettings.visibleButtons[i]);
        });
        $('#fontSizeInput').val(savedSettings.fontSize);
        $('#hoverImagesToggle').prop('checked', savedSettings.showHoverImages);
        $('.miyuButton').css('font-size', `${savedSettings.fontSize}px`);
    }
}

buttonsConfig.forEach(config => {
    const button = $('<button>')
        .addClass('miyuButton')
        .attr('id', `miyu${config.text}`)
        .text(config.text)
        .css('font-size', `${localStorage.getItem('playButtonSettings') ? JSON.parse(localStorage.getItem('playButtonSettings')).fontSize : '24'}px`)
        .on('click', config.action)
        .hover(
            () => $('#hoverImagesToggle').prop('checked') && mpPlayButton.css({ 'background-image': `url("${config.hoverImage}")`, 'background-size': 'cover' }),
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

$("#settingsGraphicContainer").append(`
    <div class="row" style="padding-top: 10px">
        <div id="smPlayButtonSettings" class="col-xs-12" style="display: flex; justify-content: center; text-align: center; margin-bottom: 30px;">
            <div style="width: 100%; max-width: 600px; padding: 10px;">
                <!-- Play Button Change label -->
                <div>
                    <label>Play Button Change Settings:</label>
                </div>
                <!-- Checkboxes with text below -->
                <div style="display: flex; justify-content: center; gap: 50px; flex-wrap: wrap; margin-top: 10px; margin-bottom: 40px;">
                    ${buttonsConfig.map(config => `
                        <div class="customCheckbox" style="display: flex; flex-direction: column; align-items: center; text-align: center;">
                            <input type="checkbox" id="toggle${config.text}" checked>
                            <label for="toggle${config.text}">
                                <i class="fa fa-check" aria-hidden="true"></i>
                            </label>
                            <span style="display: block; margin-top: 25px;">${config.text}</span>
                        </div>
                    `).join('')}
                </div>
                <!-- Font Size input -->
                <div style="margin-top: 20px;">
                    <label>Font Size (px):</label>
                    <input type="number" id="fontSizeInput" value="24" min="10" max="36" style="width: 60px; text-align: center; color: #333;">
                </div>
                <!-- Show Hover Images checkbox centered -->
                <div style="display: flex; justify-content: center; margin-top: 20px;">
                    <div class="customCheckbox" style="display: flex; flex-direction: column; align-items: center; text-align: center;">
                        <input type="checkbox" id="hoverImagesToggle" checked>
                        <label for="hoverImagesToggle">
                            <i class="fa fa-check" aria-hidden="true"></i>
                        </label>
                        <span style="display: block; margin-top: 25px; width: 85px;">Show Hover Images</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
`);

buttonsConfig.forEach(config => {
    $(`#toggle${config.text}`).on('change', function() {
        $(`#miyu${config.text}`).toggle(this.checked);
        saveSettings();
    });
});

$('#fontSizeInput').on('input', function() {
    $('.miyuButton').css('font-size', `${this.value}px`);
    saveSettings();
});

$('#hoverImagesToggle').on('change', saveSettings);

loadSettings();
