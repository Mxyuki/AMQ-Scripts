// ==UserScript==
// @name         AMQ Chat Image To Link
// @namespace    http://tampermonkey.net/
// @version      0.3
// @description  Make that you can drag or paste a file in amq chat to get a litterbox file added to your amq message. (kitty is a leagend btw)
// @author       Mxyuki
// @match        https://animemusicquiz.com/*
// @downloadURL  https://github.com/Mxyuki/AMQ-Scripts/raw/main/amqChatImageToLink.user.js
// @updateURL    https://github.com/Mxyuki/AMQ-Scripts/raw/main/amqChatImageToLink.user.js
// ==/UserScript==

if (document.querySelector("#loginPage")) return;

const textarea = document.getElementById('gcInput');

textarea.ondrop = (dropArea) => {
    dropArea.preventDefault();

    const file = dropArea.dataTransfer.files[0];

    const formData = new FormData();

    formData.append('fileToUpload', file);
    formData.append('reqtype', 'fileupload');
    formData.append('time', '1h');

    fetch('https://litterbox.catbox.moe/resources/internals/api.php', {
        method: 'POST',
        body: formData
    }).then((response) => {
        return response.text();
    }).then((data) => {
        console.log(data);
        textarea.value += data;
    });
}

textarea.addEventListener('paste', (pasteArea) => {
  pasteArea.preventDefault();

  const file = pasteArea.clipboardData.files[0];

  if (!file) {
    const pastedText = pasteArea.clipboardData.getData('text');
    textarea.value += pastedText;
  } else {
    const formData = new FormData();

    formData.append('fileToUpload', file);
    formData.append('reqtype', 'fileupload');
    formData.append('time', '1h');

    fetch('https://litterbox.catbox.moe/resources/internals/api.php', {
        method: 'POST',
        body: formData
    }).then((response) => {
        return response.text();
    }).then((data) => {
        textarea.value += data;
    });
  }
});
