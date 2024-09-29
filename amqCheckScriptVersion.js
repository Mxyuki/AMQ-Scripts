function checkScriptVersion(scriptName, scriptVersion) {
    let scriptVersionCheck = JSON.parse(localStorage.getItem('scriptVersionCheck')) || {};

    if (!(scriptName in scriptVersionCheck)) {
        scriptVersionCheck[scriptName] = scriptVersion;
        localStorage.setItem('scriptVersionCheck', JSON.stringify(scriptVersionCheck));
        console.log(`Added ${scriptName} with version ${scriptVersion} to local storage.`);
    } else {
        const storedVersion = scriptVersionCheck[scriptName];
        if (storedVersion !== scriptVersion) {
            // Display the message before updating the version in local storage
            if (typeof popoutMessages !== 'undefined' && typeof popoutMessages.displayStandardMessage === 'function') {
                popoutMessages.displayStandardMessage(scriptName, `${scriptName} has been updated from version ${storedVersion} to ${scriptVersion}`);
            }
            console.log(`${scriptName} has been updated from version ${storedVersion} to ${scriptVersion}.`);

            // Now update the version in local storage
            scriptVersionCheck[scriptName] = scriptVersion;
            localStorage.setItem('scriptVersionCheck', JSON.stringify(scriptVersionCheck));
        } else {
            console.log(`${scriptName} is up to date (version ${scriptVersion}).`);
        }
    }
}

window.checkScriptVersion = checkScriptVersion;
