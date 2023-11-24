const { DateTime } = require('luxon');
const { Builder, By } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const axios = require('axios');
const { MessageMedia } = require('whatsapp-web.js');
const fs = require('fs');
const path = require('path');
const config = require('../config.json');
const OPENWEATHER_API_KEY = config.OPENWEATHER_API_KEY;
const OPENWEATHER_LOCATION = config.OPENWEATHER_LOCATION;

async function startAutomation(client, groupId) {
    let isNotificationSent = false;

    const intervalId = setInterval(async () => {
        const currentTime = DateTime.local();

        if (isWeekday(currentTime) && isAfterStartTime(currentTime)) {
            console.log('Workday and after start time.');

            if (!isNotificationSent && isTimeToNotify(currentTime, config.START_TIME_HOUR, config.START_TIME_MINUTE)) {
                console.log('Notify.');

                const result = await searchForTime(config.STARTING_TIME, client, groupId);

                if (result === 'Statusänderung erkannt') {
                    console.log('Statusänderung erkannt. Beende das Intervall.');
                    clearInterval(intervalId);
                }

                isNotificationSent = true;
            } else {
                console.log('Noch nicht Zeit für den Benachrichtigungsschritt.');
            }
        } else {
            console.log('No Workday or before start time.');

            if (isWeekday(currentTime)) {
                console.log('Workday and before start time. Starte trotzdem den Benachrichtigungsschritt.');

                const result = await searchForTime(config.STARTING_TIME, client, groupId);

                if (result === 'Statusänderung erkannt') {
                    console.log('Statusänderung erkannt. Beende das Intervall.');
                    clearInterval(intervalId);
                }

                isNotificationSent = true;
            }
        }
    }, config.INTERVAL_TIME);
}

async function searchForTime(desiredTime, client, groupId) {
    const driver = await createChromeDriver();

    try {
        const dynamicLink = config.TRAIN_LINK_TEMPLATE.replace('__DATE__', getFormattedDate());
        await driver.get(dynamicLink);
        await acceptCookies(driver);
        await driver.sleep(2000);
        const containerElements = await driver.findElements(By.className('reisedetails-container'));
        await driver.sleep(2000);

        for (const containerElement of containerElements) {
            const datetimeValue = await containerElement.findElement(By.className('reiseplan__uebersicht-uhrzeit-sollzeit')).getAttribute('datetime');

            if (datetimeValue === desiredTime) {
                console.log(`Die Uhrzeit ${desiredTime} wurde gefunden.`);

                const isPunctual = await checkPunctuality(containerElement);
                const isDelayed = await checkDelay(containerElement);

                if (isPunctual) {
                    console.log('Die Uhrzeit ist pünktlich.');
                    await sendPunctualMessage(client, groupId, driver);
                    return 'Statusänderung erkannt';
                } else if (isDelayed) {
                    console.log('Die Uhrzeit ist unpünktlich.');
                    await sendDelayedMessage(containerElement, client, groupId, driver);
                    return 'Statusänderung erkannt';
                } else {
                    console.log('Die Pünktlichkeit konnte nicht erkannt werden.');
                    await client.sendMessage(groupId, 'Die Pünktlichkeit konnte nicht erkannt werden.');
                }
            }
        }
    } catch (error) {
        console.error('Fehler beim Ausführen des Programms:', error);
    } finally {
        await driver.quit();
    }
}

async function createChromeDriver() {
    return await new Builder()
        .forBrowser('chrome')
        .setChromeOptions(new chrome.Options().windowSize({ width: 1024, height: 768 }))
        .build();
}

async function acceptCookies(driver) {
    await driver.executeScript(() => {
        const consentButton = document.querySelector("body > div:nth-child(1) #consent-layer > div.consent-layer__btn-container > button.btn.btn--secondary.js-accept-all-cookies");
        if (consentButton) {
            consentButton.click();
        }
    });
}

async function checkPunctuality(containerElement) {
    try {
        await containerElement.findElement(By.css('.zeit-anzeige__echtzeit--puenktlich'));
        return true;
    } catch (error) {
        return false;
    }
}

async function checkDelay(containerElement) {
    try {
        const echtzeitElement = await containerElement.findElement(By.css('.zeit-anzeige__echtzeit--unpuenktlich'));
        const delayText = await echtzeitElement.getText();
        return delayText.trim().length > 0;
    } catch (error) {
        console.log('Das Element für unpünktliche Züge wurde nicht gefunden.');
        return false;
    }
}

async function sendPunctualMessage(client, groupId, driver) {
    const response = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
        params: {
            q: config.OPENWEATHER_LOCATION,
            appid: OPENWEATHER_API_KEY,
            lang: 'de',
            units: 'metric'
        }
    });

    const weatherDescription = response.data.weather[0].description;
    const temperature = response.data.main.temp;
    await(2000);
    const screenshotFileName = `screenshot_${new Date().getTime()}`;
    await takeScreenshot(driver, screenshotFileName);
    const media = MessageMedia.fromFilePath(`./screenshots/${screenshotFileName}.png`);
    await client.sendMessage(groupId, `Guten Morgen,\nes ist der ${new Date().toLocaleDateString('de-DE')}, heute ist ${getGermanDayOfWeek(new Date())}. Das Wetter wird heute ${weatherDescription} und es wird heute Temperaturen bis zu ${temperature}°C haben.\n Der Zug kommt pünktlich`, {
        media: media
    });
}

async function sendDelayedMessage(containerElement, client, groupId, driver) {
    const echtzeitElement = await containerElement.findElement(By.css('.zeit-anzeige__echtzeit--unpuenktlich'));
    const delayText = await echtzeitElement.getText();
    const screenshotFileName = `screenshot_${new Date().getTime()}`;
    await takeScreenshot(driver, screenshotFileName);
    const media = MessageMedia.fromFilePath(`./screenshots/${screenshotFileName}.png`);
    await client.sendMessage(groupId, `‼️ EILMELDUNG - ${new Date().toLocaleTimeString('de-DE')}\nDer Zug nach Bruchsal RB17B hat Verspätung und fährt erst um ${delayText.trim()} später los.`, {
        media: media
    });

    try {
        const connectionStatusElement = await containerElement.findElement(By.css('.reise-ereignis-zusammenfassung__message-text'));
        const connectionStatus = await connectionStatusElement.getText();
        console.log(`Verbindungs Status: ${connectionStatus}`);

        await client.sendMessage(groupId, `‼️ Zusätzliche EILMELDUNG - ${new Date().toLocaleTimeString('de-DE')}\nEs liegt folgende Meldung vor: ${connectionStatus}`);
    } catch (error) {
        console.error('Fehler beim Finden des Verbindungsstatus:', error);

        const htmlContent = await containerElement.getAttribute('innerHTML');
        console.log('HTML-Inhalt des Container-Elements:', htmlContent);
    }
}

function isAfterStartTime(currentTime) {
    const targetTime = DateTime.fromObject({
        hour: config.START_TIME_HOUR,
        minute: config.START_TIME_MINUTE,
    });

    return currentTime > targetTime;
}

function isTimeToNotify(currentTime, targetHour, targetMinute) {
    return currentTime.hour === targetHour && currentTime.minute === targetMinute;
}

function getFormattedDate() {
    const currentDate = new Date();
    const formattedDate = currentDate.toISOString().split('T')[0];
    return formattedDate;
}

function getGermanDayOfWeek(date) {
    const daysOfWeek = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
    return daysOfWeek[date.getDay()];
}

function isWeekday(date) {
    return date.weekday >= 1 && date.weekday <= 5;
}

async function takeScreenshot(driver, fileName) {
    try {
        await driver.sleep(2000);

        const screenshot = await driver.takeScreenshot();
        const directory = path.join(__dirname, 'screenshots');

        if (!fs.existsSync(directory)) {
            fs.mkdirSync(directory);
        }

        const filePath = path.join(directory, `${fileName}.png`);

        fs.writeFileSync(filePath, screenshot, 'base64');
        console.log(`Screenshot erfolgreich erstellt: ${filePath}`);
    } catch (error) {
        console.error('Fehler beim Erstellen des Screenshots:', error);
    }
}

module.exports = { startAutomation, searchForTime };
