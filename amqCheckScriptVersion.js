function checkScriptVersion(scriptName, scriptVersion) {
    let scriptVersionCheck = JSON.parse(localStorage.getItem('scriptVersionCheck')) || {};

    if (!(scriptName in scriptVersionCheck)) {
        scriptVersionCheck[scriptName] = scriptVersion;
        localStorage.setItem('scriptVersionCheck', JSON.stringify(scriptVersionCheck));
        console.log(`Added ${scriptName} with version ${scriptVersion} to local storage.`);
    } else {
        const storedVersion = scriptVersionCheck[scriptName];
        if (storedVersion !== scriptVersion) {
            scriptVersionCheck[scriptName] = scriptVersion;
            localStorage.setItem('scriptVersionCheck', JSON.stringify(scriptVersionCheck));

            if (typeof popoutMessages !== 'undefined' && typeof popoutMessages.displayStandardMessage === 'function') {
                popoutMessages.displayStandardMessage(scriptName, "updated to version " + scriptVersion);
            }
            console.log(`Updated ${scriptName} to version ${scriptVersion}.`);
        } else {
            console.log(`${scriptName} is up to date (version ${scriptVersion}).`);
        }
    }
}

window.checkScriptVersion = checkScriptVersion;
