// main.js

const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

async function searchForTime(desiredTime, client, groupId) {
    let driver = await new Builder()
        .forBrowser('chrome')
        .setChromeOptions(new chrome.Options().windowSize({ width: 1024, height: 768 }))
        .build();

    try {
        await driver.get('https://www.bahn.de/buchung/fahrplan/suche#sts=true&so=Bretten&zo=Germersheim&kl=2&r=13:16:KLASSENLOS:1&soid=A%3D1%40O%3DBretten%40X%3D8693450%40Y%3D49036903%40U%3D81%40L%3D8000053%40B%3D1%40p%3D1700073955%40&zoid=A%3D1%40O%3DGermersheim%40X%3D8365281%40Y%3D49225398%40U%3D80%40L%3D8000376%40B%3D1%40p%3D1700079959%40&sot=ST&zot=ST&soei=8000053&zoei=8000376&hd=2023-11-17T18:45:57&hza=D&ar=false&s=true&d=false&hz=%5B%5D&fm=false&bp=false');

        await driver.sleep(5000);

        await driver.executeScript(
            `document.querySelector("body > div:nth-child(1)").shadowRoot.querySelector("#consent-layer > div.consent-layer__btn-container > button.btn.btn--secondary.js-accept-all-cookies").click();`
        );

        await driver.sleep(5000);

        const containerElements = await driver.findElements(By.className('reisedetails-container'));

        for (const containerElement of containerElements) {
            const sollzeitElement = await containerElement.findElement(By.className('reiseplan__uebersicht-uhrzeit-sollzeit'));

            const datetimeValue = await sollzeitElement.getAttribute('datetime');

            if (datetimeValue === desiredTime) {
                console.log(`Die Uhrzeit ${desiredTime} wurde gefunden.`);

                const echtzeitElement = await containerElement.findElement(By.css('.zeit-anzeige__echtzeit'));

                const isPunctual = (await echtzeitElement.getAttribute('class')).includes('--puenktlich');
                const isDelayed = (await echtzeitElement.getAttribute('class')).includes('--unpuenktlich');

                let connectionStatus;
                let departureTime;

                if (isPunctual) {
                    console.log('Die Uhrzeit ist pünktlich.');
                    departureTime = new Date().toLocaleTimeString('de-DE');
                    await client.sendMessage(groupId, `‼️ EILMELDUNG - ${departureTime}\nDer Zug nach Bruchsal RB17B hat keine Verspätung und fährt wie geplant um ${departureTime} Uhr los.`);
                } else if (isDelayed) {
                    console.log('Die Uhrzeit ist unpünktlich.');

                    const echtzeitElement = await containerElement.findElement(By.css('.zeit-anzeige__echtzeit--unpuenktlich'));

                    const delayText = await echtzeitElement.getText();

                    await client.sendMessage(groupId, `‼️ EILMELDUNG - ${new Date().toLocaleTimeString('de-DE')}\nDer Zug nach Bruchsal RB17B hat Verspätung und fährt erst um ${delayText.trim()} später los.`);
                } else {
                    console.log('Die Pünktlichkeit konnte nicht erkannt werden.');
                    await client.sendMessage(groupId, 'Die Pünktlichkeit konnte nicht erkannt werden.');
                }

                try {
                    const connectionStatusElement = await containerElement.findElement(By.css('.reise-ereignis-zusammenfassung__message-text'));
                    connectionStatus = await connectionStatusElement.getText();
                    console.log(`Verbindungs Status: ${connectionStatus}`);

                    await client.sendText(groupId, `Verbindungs Status: ${connectionStatus}`);
                } catch (error) {
                    console.log('Verbindungs Status nicht gefunden.');
                }
            }
        }
    } finally {
        await driver.quit();
    }
}

// Export the function for use in other files
module.exports = { searchForTime };
