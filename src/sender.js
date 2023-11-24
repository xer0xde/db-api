const fs = require('fs');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { startAutomation } = require('./main'); // Correct the import statement
const config = require('../config.json');


let sessionData;
const sessionDataPath = './session-data.json';
if (fs.existsSync(sessionDataPath)) {
    sessionData = JSON.parse(fs.readFileSync(sessionDataPath, 'utf8'));
}

const client = new Client({
    authStrategy: new LocalAuth({
        session: sessionData,
        failCallback: () => {
            console.log('Failed to authenticate. Exiting.');
            process.exit(1);
        },
    }),
});

client.on('ready', () => {
    console.log('Client is ready!');

    // Modify this line to use the actual group ID
    const groupId = config.GROUP_ID;

    // Call the function to search for time
    startAutomation(client, groupId); // Passe die Argumente entsprechend an
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

// Get a list of all chats

client.initialize();


