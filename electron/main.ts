import { app, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import { SatelliteApp } from './SatelliteApp';

import './SatelliteBus';

import * as path from 'path';

const appVersion = app.getVersion();
// const updateUrl = `https://scidap.com/updates/`;

const Log = require('electron-log');

autoUpdater.logger = Log;
// Log.transports.file.level = "info";

const args = process.argv.slice(1);
const serve = args.some(val => val === '--serve');


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
    // app.on('window-all-closed', () => {
    //     // On OS X it is common for applications and their menu bar
    //     // to stay active until the user quits explicitly with Cmd + Q
    //     // if (process.platform !== 'darwin') {
    //         app.quit();
    //     // }
    // });
    /* 'before-quit' is emitted when Electron receives
     * the signal to exit and wants to start closing windows */
    app.on('before-quit', () => satelliteApp.willQuitApp = true);

    app.on('activate', () => {
        // On OS X it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        satelliteApp.createWindow();
    });


    app.on('quit', () => {
        satelliteApp.killPM2_2();
    });

    // TODO: Move update?
    if (process.platform === 'darwin') {

        // autoUpdater.setFeedURL({ url: updateUrl, serverType: 'json' } as any);
        // autoUpdater.setFeedURL(updateUrl);

        // autoUpdater.checkForUpdates();
    }

    autoUpdater.addListener('update-available', (event) => {
        Log.info('Update Available');
        satelliteApp.send('update-available');
    });

    autoUpdater.addListener('update-not-available', (event) => {
        Log.info('Update Not Available');
        satelliteApp.send('update-not-available');
    });

    autoUpdater.addListener('update-downloaded', (event, releaseNotes, releaseName, releaseDate, updateURL) => {
        satelliteApp.send('update-downloaded', releaseNotes, releaseName, releaseDate, updateURL);

        Log.info('Update Downloaded');
        Log.info('releaseNotes', releaseNotes);
        Log.info('releaseNotes', releaseName);
        Log.info('releaseNotes', releaseDate);
        Log.info('releaseNotes', updateURL);
    });

    autoUpdater.on('download-progress', (progressObj) => {
        // let log_message = 'Download speed: ' + progressObj.bytesPerSecond;
        // log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
        // log_message = log_message + ' (' + progressObj.transferred + '/' + progressObj.total + ')';
        // Log.debug(log_message);
        satelliteApp.send('download-progress', progressObj.percent, progressObj.bytesPerSecond);
    });

    // autoUpdater.on('download-progress', (progressObj) => {
    //     let log_message = "Download speed: " + progressObj.bytesPerSecond;
    //     log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
    //     log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
    //     sendStatusToWindow(log_message);
    //   })
    // autoUpdater.addListener('checking-for-update', (event) => { Log.info('releaseNotes', 'Checking for Update'); });
    autoUpdater.addListener('error', (error) => {
        Log.info('Error update:', error);
        satelliteApp.send('update-error', error);
    });

    ipcMain.on('webui-window', (event) => {
        satelliteApp.createWebuiWindow();
    });

    // ipcMain.on('mongo-express-window', (event) => {
    //     satelliteApp.createMongoExpressWindow();
    // });


    /**
     * change to once?
     */
    ipcMain.on('satellite-init', (event) => {
        Log.info('satellite-init');

        satelliteApp.satelliteInit().then(() => {
            event.reply('satellite-init', 'complete');
        }).catch((err) => {
            Log.error(err);
            event.reply('satellite-init', 'error');
        });
    });

    ipcMain.on('restart-program', (event, arg) => {
        Log.info('restart-program', arg);

        satelliteApp.restartPM2program(arg).then(() => {
            event.reply('restart-program', 'complete');
        }).catch((err) => {
            Log.error(err);
            event.reply('restart-program', 'error');
        });
    });

    ipcMain.on('stop-program', (event, arg) => {
        Log.info('stop-program', arg);

        satelliteApp.stopPM2program(arg).then(() => {
            event.reply('stop-program', 'complete');
        }).catch((err) => {
            Log.error(err);
            event.reply('stop-program', 'error');
        });
    });

    ipcMain.on('restart-programs', (event, arg) => {
        Log.info('restart-programs');

        satelliteApp.disconnectPM2().then(() => {
            return satelliteApp.satelliteInit(true);          // we run it with true to skip folders creation. Only settings will be updated and services restarted.
        }).then(() => {
            event.reply('restart-programs', 'complete');
        }).catch((err) => {
            Log.error(err);
            event.reply('restart-programs', 'error');
        });
    });

    ipcMain.on('checking-for-update', (event) => {
        Log.info('checking-for-update');
        if (satelliteApp.settings.devel && satelliteApp.settings.devel.mac_update_from_devel) {
            // Need to overwrite default update settings to point to the development versions
            const devUpdateSetting = path.resolve(app.getAppPath(), './dev-app-update.yml');
            autoUpdater.updateConfigPath = devUpdateSetting;
            Log.info('Using development update configurations file', devUpdateSetting);
        }
        if (serve) {
            autoUpdater.checkForUpdates();
        } else {
            autoUpdater.checkForUpdatesAndNotify();
        }
    });

    ipcMain.on('quit-and-install', (event) => {
        Log.info('quit-and-install');
        autoUpdater.quitAndInstall();
    });


} catch (e) {
    Log.info(e);
    // Catch Error
    // throw e;
}
