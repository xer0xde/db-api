# Train Status Notifier

## Overview

Train Status Notifier is a Node.js script that automates the process of checking the status of a specific train at a given time. It uses Selenium for web scraping to retrieve train status information and sends notifications via WhatsApp using the `whatsapp-web.js` library. Additionally, it provides weather information for the specified location using the OpenWeatherMap API.

## Features

- **Train Status Checking:** The script checks the status (punctual or delayed) of a specific train at a defined time.
- **Weather Information:** Provides weather details for the specified location.
- **WhatsApp Notification:** Sends notifications to a specified WhatsApp group based on the train status.

## Prerequisites

Before running the script, ensure you have the following installed:

- Node.js and npm
- Chrome browser (for Selenium)
- WhatsApp account and QR code scanned for `whatsapp-web.js`

## Installation

1. Clone the repository:

    ```bash
    git clone https://github.com/xer0xde/db-api.git
    ```

2. Install dependencies:

    ```bash
    cd db-api
    npm install
    ```

3. Configure the script:

    Edit the `config.json` file to set your specific configuration details, such as train link, starting time, OpenWeatherMap API key, and group ID.

## Usage

Run the script with the following command:

```bash
node sender.js


The script will automatically execute based on the configured starting time and check the train status.

## Configuration
Edit the config.json file to customize the script behavior. Configuration options include:

- TRAIN_LINK: Link to the train schedule page.
- STARTING_TIME: Time to start checking the train status.
- OPENWEATHER_API_KEY: API key for OpenWeatherMap.
- OPENWEATHER_LOCATION: Location for weather information.
- GROUP_ID: WhatsApp group ID for notifications.
- INTERVAL_TIME: Interval time for script execution.
- START_TIME_HOUR: Hour to start the script.
- START_TIME_MINUTE: Minute to start the script.


# License
This project is licensed under the MIT License - see the LICENSE file for details.
