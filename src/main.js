const { Builder, By } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const axios = require('axios'); // Füge das axios-Modul hinzu
const { MessageMedia } = require('whatsapp-web.js');
const config = require('../config.json');
const OPENWEATHER_API_KEY = config.OPENWEATHER_API_KEY;
const OPENWEATHER_LOCATION = config.OPENWEATHER_LOCATION;
async function startAutomation(client, groupId) {
    let isFirstNotificationSent = false;

    const intervalId = setInterval(async () => {
        const currentTime = new Date();


        const isWeekday = !config.WEEKDAYS_ONLY || (config.WEEKDAYS_ONLY && currentTime.getDay() >= 1 && currentTime.getDay() <= 5);

        if (isWeekday && currentTime.getHours() > config.START_TIME_HOUR || (currentTime.getHours() === config.START_TIME_HOUR && currentTime.getMinutes() >= config.START_TIME_MINUTE)) {
            console.log('Es ist nach der geplanten Uhrzeit an einem Werktag. Führe das Skript aus.');

            if (!isFirstNotificationSent && currentTime.getHours() === config.START_TIME_HOUR && currentTime.getMinutes() === config.START_TIME_MINUTE) {
                const result = await searchForTime(config.STARTING_TIME, client, groupId);

                if (result === 'Statusänderung erkannt') {
                    console.log('Statusänderung erkannt. Beende das Intervall.');
                    clearInterval(intervalId);
                }

                isFirstNotificationSent = true;
            }

            if (isFirstNotificationSent && currentTime.getHours() === 6) {

                const result = await searchForTime('22:02', client, groupId);


                if (result === 'Statusänderung erkannt') {
                    console.log('Statusänderung erkannt. Beende das Intervall.');
                    clearInterval(intervalId);
                }
            }
        }
    }, config.INTERVAL_TIME);
}


async function searchForTime(desiredTime, client, groupId) {
    let driver = await new Builder()
        .forBrowser('chrome')
        .setChromeOptions(new chrome.Options().windowSize({ width: 1024, height: 768 }))
        .build();

       try {

        const currentDate = new Date();
        const formattedDate = currentDate.toISOString().split('T')[0];
        const dynamicLink = config.TRAIN_LINK_TEMPLATE.replace('__DATE__', formattedDate);

        await driver.get(dynamicLink);

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
                let intervalId;

                if (isPunctual) {
                    console.log('Die Uhrzeit ist pünktlich.');
                    departureTime = new Date().toLocaleTimeString('de-DE');

                    try {
                        const response = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
                            params: {
                                q: config.OPENWEATHER_LOCATION,
                                appid: OPENWEATHER_API_KEY,
                                units: 'metric',
                                lang: 'de'
                            }
                        });

                        const weatherDescription = response.data.weather[0].description;
                        const temperature = response.data.main.temp;
                        const screenshotFileName = `screenshots_${new Date().getTime()}`;
                        await takeScreenshot(driver, screenshotFileName);
                        const media = MessageMedia.fromFilePath(`./screenshots/${screenshotFileName}.png`);
                        await client.sendMessage(groupId, `Guten Morgen,\nes ist der ${new Date().toLocaleDateString('de-DE')}, heute ist ${getGermanDayOfWeek(new Date())}. Das Wetter wird heute ${weatherDescription} und es wird heute Temperaturen bis zu ${temperature}°C haben.\n Der Zug kommt pünktlich`, {
                            media: media
                        });
                        return 'Statusänderung erkannt';
                    } catch (error) {
                        console.error('Fehler beim Abrufen der Wetterdaten:', error);
                    }
                } else if (isDelayed) {
                    console.log('Die Uhrzeit ist unpünktlich.');

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
                        connectionStatus = await connectionStatusElement.getText();
                        console.log(`Verbindungs Status: ${connectionStatus}`);

                        await client.sendMessage(groupId, `‼️ Zusätzliche EILMELDUNG - ${new Date().toLocaleTimeString('de-DE')}\nEs liegt folgende Meldung vor: ${connectionStatus}`);
                    } catch (error) {
                        console.error('Fehler beim Finden des Verbindungsstatus:', error);

                        // Debugging-Informationen
                        const htmlContent = await containerElement.getAttribute('innerHTML');
                        console.log('HTML-Inhalt des Container-Elements:', htmlContent);
                    }
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

function getGermanDayOfWeek(date) {
    const daysOfWeek = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
    return daysOfWeek[date.getDay()];
}

const fs = require('fs');
const path = require('path');

async function takeScreenshot(driver, fileName) {
    const screenshot = await driver.takeScreenshot();
    const directory = path.join(__dirname, 'screenshots');

    if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory);
    }

    const filePath = path.join(directory, `${fileName}.png`);

    fs.writeFileSync(filePath, screenshot, 'base64');
}
module.exports = { startAutomation, searchForTime };
