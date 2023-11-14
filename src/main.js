const { Builder, By, Key, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

async function searchForTime() {
    let driver = await new Builder()
        .forBrowser('chrome')
        .setChromeOptions(new chrome.Options().windowSize({ width: 1024, height: 768 }))
        .build();

    try {
        await driver.get('https://www.bahn.de/buchung/fahrplan/suche#sts=true&so=M%C3%BChlacker&zo=Bruchsal&kl=2&r=13:16:KLASSENLOS:1&soid=A%3D1%40O%3DM%C3%BChlacker%40X%3D8846105%40Y%3D48953195%40U%3D81%40L%3D8000339%40B%3D1%40p%3D1699466899%40&zoid=A%3D1%40O%3DBruchsal%40X%3D8589651%40Y%3D49124619%40U%3D81%40L%3D8000055%40B%3D1%40p%3D1699466899%40&sot=ST&zot=ST&soei=8000339&zoei=8000055&hd=2023-11-14T18:30:39&hza=D&ar=false&s=true&d=false&hz=%5B%5D&fm=false&bp=false');

        const shadowHost = await driver.findElement(By.css('div:nth-child(1)'));
        const shadowRoot = await driver.executeScript('return arguments[0].shadowRoot', shadowHost);

        const consentButtonSelector = '#consent-layer > div.consent-layer__btn-container > button.btn.btn--secondary.js-accept-all-cookies';
        const consentButton = await shadowRoot.findElement(By.css(consentButtonSelector));

        await driver.wait(until.elementIsEnabled(consentButton), 10000);

        await consentButton.click();

        const timeElement = await driver.wait(until.elementLocated(By.className('reiseplan__uebersicht-uhrzeit-sollzeit')), 10000);

        const datetimeValue = await timeElement.getAttribute('datetime');

        if (datetimeValue === '18:24') {
            console.log('Die Uhrzeit ist 18:24.');
        } else {
            console.log('Die Uhrzeit ist nicht 18:24.');
        }
    } catch (error) {
        console.error('Fehler aufgetreten:', error);
    } finally {
        await driver.quit();
    }
}

searchForTime();
