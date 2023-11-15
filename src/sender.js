// sender.js

const fs = require('fs');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const searchForTime = require('./main'); // Import the scraper function

let sessionData;
const sessionDataPath = './session-data.json';
if (fs.existsSync(sessionDataPath)) {
    sessionData = JSON.parse(fs.readFileSync(sessionDataPath, 'utf8'));
}

const client = new Client({
    authStrategy: new LocalAuth({
        session: sessionData, // Pass the loaded session data if available
        failCallback: () => {
            console.log('Failed to authenticate. Exiting.');
            process.exit(1);
        },
    }),
});

client.on('ready', () => {
    console.log('Client is ready!');

    // Call the function to search for time
    searchForTime('18:02');
});

client.on('message', async (message) => {
    // Log the received message
    console.log(`Received message: ${message.body}`);
});

client.on('qr', (qrCode) => {
    // Display QR code in the console
    qrcode.generate(qrCode, { small: true });

    if (process.platform === 'darwin') {
        exec(`open ${qrCode}`);
    } else if (process.platform === 'win32') {
        exec(`start ${qrCode}`);
    } else {
        console.log('Unable to open QR code. Please scan manually.');
    }
});

client.on('authenticated', (session) => {
    console.log('Authenticated');

    if (session) {
        fs.writeFileSync(sessionDataPath, JSON.stringify(session));
    }
});

client.initialize();
