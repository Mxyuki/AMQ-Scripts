function checkScriptVersion(scriptName, scriptVersion) {
    let scriptVersionCheck = JSON.parse(localStorage.getItem('scriptVersionCheck')) || {};

    if (!(scriptName in scriptVersionCheck)) {
        scriptVersionCheck[scriptName] = scriptVersion;
        localStorage.setItem('scriptVersionCheck', JSON.stringify(scriptVersionCheck));
    } else {
        const storedVersion = scriptVersionCheck[scriptName];
        if (storedVersion !== scriptVersion) {
            popoutMessages.displayStandardMessage(scriptName, `Updated from version ${storedVersion} → ${scriptVersion}`);
            scriptVersionCheck[scriptName] = scriptVersion;
            localStorage.setItem('scriptVersionCheck', JSON.stringify(scriptVersionCheck));
        }
    }
}
window.checkScriptVersion = checkScriptVersion;
