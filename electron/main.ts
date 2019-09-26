import { app, autoUpdater, ipcMain } from 'electron';

import { SatelliteApp } from './SatelliteApp';

import './SatelliteBus';

const appVersion = app.getVersion();
const updateUrl = `https://scidap.com/updates/latest.json`;

const Log = require('electron-log');

try {
    const satelliteApp = new SatelliteApp();
    // This method will be called when Electron has finished
    // initialization and is ready to create browser windows.
    // Some APIs can only be used after this event occurs.
    app.on('ready', () => {
        // let template: any = [
        //   { label: 'Menu 1', submenu: [{ label: 'Menu item 1' }] },
        //   {
        //     label: 'Menu 2',
        //     submenu: [
        //       { label: 'Another Menu item' },
        //       { label: 'One More Menu Item' }]
        //   }];
        // if (process.platform === 'darwin') {

        //   const name = app.getName();
        //   template.unshift({ label: name, submenu: [{ label: 'Quit', accelerator: 'Command+Q', click: function () { app.quit(); } }] });
        // }
        // const menu = Menu.buildFromTemplate(template);
        // Menu.setApplicationMenu(menu);

        satelliteApp.createWindow();
    });

    // Quit when all windows are closed.
    app.on('window-all-closed', () => {
        // On OS X it is common for applications and their menu bar
        // to stay active until the user quits explicitly with Cmd + Q
        if (process.platform !== 'darwin') {
            app.quit();
        }
    });

    app.on('activate', () => {
        // On OS X it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        satelliteApp.createWindow();
    });


    app.on('quit', () => {
        // On OS X it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        satelliteApp.killPM2();
    });

    // TODO: Move update?
    if (process.platform === 'darwin') {

        autoUpdater.setFeedURL({ url: updateUrl, serverType: 'json' });

        autoUpdater.checkForUpdates();
    }

    autoUpdater.addListener('update-available', (event) => {
        Log.info('Update Available', event);
    });

    autoUpdater.addListener('update-downloaded', (event, releaseNotes, releaseName, releaseDate, updateURL) => {

        Log.info('Update Downloaded');
        Log.info('releaseNotes', releaseNotes);
        Log.info('releaseNotes', releaseName);
        Log.info('releaseNotes', releaseDate);
        Log.info('releaseNotes', updateURL);

    });

    autoUpdater.addListener('checking-for-update', (event) => { Log.info('releaseNotes', 'Checking for Update'); });
    autoUpdater.addListener('error', (error) => { Log.info(Error, error); });


    /**
     * change to once!
     */
    ipcMain.on('satellite-init', (event) => {
        Log.info('init');

        satelliteApp.satelliteInit().then( () => {
            event.reply('satellite-init', 'complete');
        }).catch((err) => {
            Log.error(err);
            event.reply('satellite-init', 'error');
        });
    });

    ipcMain.on('restart-program', (event, arg) => {
        Log.info('init');

        satelliteApp.restartPM2program(arg).then( () => {
            event.reply('restart-program', 'complete');
        }).catch((err) => {
            Log.error(err);
            event.reply('restart-program', 'error');
        });
    });

    ipcMain.on('stop-program', (event, arg) => {
        Log.info('init');

        satelliteApp.stopPM2program(arg).then( () => {
            event.reply('stop-program', 'complete');
        }).catch((err) => {
            Log.error(err);
            event.reply('stop-program', 'error');
        });
    });



} catch (e) {
    Log.info(e);
    // Catch Error
    // throw e;
}
