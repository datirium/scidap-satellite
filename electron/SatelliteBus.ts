import { BrowserWindow, screen as electronScreen, ipcMain } from 'electron';
import { SatelliteApp } from './SatelliteApp';

const Store = require('electron-store');

import * as path from 'path';
import * as url from 'url';

const pm2 = require('pm2');

const args = process.argv.slice(1);

const store = new Store();

// ipcMain.once('satellite-init', (event) => {
//     console.log('init');
//     console.log('init', JSON.parse(store.get('airflowSettings')));

//     SatelliteApp.
//     event.reply('satellite-init', 'complete');
// });

    // ipcMain.on('synchronous-message', (event, arg) => {
    // console.log(arg) // prints "ping"
    // event.returnValue = 'pong'
    // })
