const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

async function searchForTime(desiredTime) {
    let driver = await new Builder()
        .forBrowser('chrome')
        .setChromeOptions(new chrome.Options().windowSize({ width: 1024, height: 768 }))
        .build();

    try {
        await driver.get('https://www.bahn.de/buchung/fahrplan/suche#sts=true&so=Bruchsal&zo=M%C3%BChlacker&kl=2&r=13:16:KLASSENLOS:1&soid=A%3D1%40O%3DBruchsal%40X%3D8589651%40Y%3D49124619%40U%3D81%40L%3D8000055%40B%3D1%40p%3D1699466899%40&zoid=A%3D1%40O%3DM%C3%BChlacker%40X%3D8846105%40Y%3D48953195%40U%3D81%40L%3D8000339%40B%3D1%40p%3D1699466899%40&sot=ST&zot=ST&soei=8000055&zoei=8000339&hd=2023-11-14T19:54:16&hza=D&ar=false&s=true&d=false&hz=%5B%5D&fm=false&bp=false');

        await driver.sleep(5000);

        await driver.executeScript(
            `document.querySelector("body > div:nth-child(1)").shadowRoot.querySelector("#consent-layer > div.consent-layer__btn-container > button.btn.btn--secondary.js-accept-all-cookies").click();`
        );

        await driver.sleep(5000);

        const containerElements = await driver.findElements(By.className('reisedetails-container'));

        for (const containerElement of containerElements) {
            // Find the sollzeit element within the current container
            const sollzeitElement = await containerElement.findElement(By.className('reiseplan__uebersicht-uhrzeit-sollzeit'));

            const datetimeValue = await sollzeitElement.getAttribute('datetime');

            if (datetimeValue === desiredTime) {
                console.log(`Die Uhrzeit ${desiredTime} wurde gefunden.`);

                const echtzeitElement = await containerElement.findElement(By.css('.zeit-anzeige__echtzeit'));

                const isPunctual = (await echtzeitElement.getAttribute('class')).includes('--puenktlich');
                const isDelayed = (await echtzeitElement.getAttribute('class')).includes('--unpuenktlich');

                if (isPunctual) {
                    console.log('Die Uhrzeit ist pünktlich.');
                } else if (isDelayed) {
                    console.log('Die Uhrzeit ist unpünktlich.');
                } else {
                    console.log('Die Pünktlichkeit konnte nicht erkannt werden.');
                }

                break;
            }
        }
    } finally {
        await driver.quit();
    }
}

searchForTime('20:16');
