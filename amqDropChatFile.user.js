// ==UserScript==
// @name         AMQ Chat Drop File
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Make that you can drag a file in amq chat to get a litterbox file added to your amq message. (kitty is a leagend btw)
// @author       Mxyuki
// @match        https://animemusicquiz.com/*
// @downloadURL  https://github.com/Mxyuki/AMQ-Scripts/raw/main/amqDropChatFile.user.js
// @updateURL    https://github.com/Mxyuki/AMQ-Scripts/raw/main/amqDropChatFile.user.js
// ==/UserScript==


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
      const chatbox = document.getElementById('gcInput');
      chatbox.value += data;
  });
}
