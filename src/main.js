const request = require('request');

const clientId = '49ccaf8e2fc7960810ddc1cfbbac6b56';
const clientSecret = '08d201b8c6cb2a97d70ec080408b6590';
const evanoNumber = '8000053';

const options = {
    method: 'GET',
    url: `https://apis.deutschebahn.com/db-api-marketplace/apis/timetables/v1/fchg/${evanoNumber}`,
    headers: {
        'DB-Client-Id': clientId,
        'DB-Api-Key': clientSecret,
        accept: 'application/xml'
    }
};

request(options, function (error, response, body) {
    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Response:', response.statusCode, response.headers);
        if (body) {
            console.log('Body:', body);
        }
    }
});
