import { BrowserWindow, screen as electronScreen, ipcMain, app } from 'electron';

const Store = require('electron-store');
import { spawn, exec } from 'child_process';

import * as path from 'path';
import * as url from 'url';
import * as os from 'os';
import * as keytar from 'keytar';

const semver = require('semver')
const pm2 = require('pm2');
const Log = require('electron-log');
const args = process.argv.slice(1);

const { waitForInitConfiguration, getRunConfiguration, getSettings } = require('../build-scripts/utilities/configure.js');


export class SatelliteApp {
    private win = null;
    private webUiWin = null;
    private mongoExpressWin = null;
    private store;

    serve;
    settings;
    networkInterfaces = [];
    isDockerUp;
    pm2MonitIntervalId;
    dockerMonitIntervalId;
    // pm2_home;
    cwd;
    defaultSettingsLocation;

    public willQuitApp = false;


    constructor() {
        // const size = electronScreen.getPrimaryDisplay().workAreaSize;
        this.store = new Store({
            defaults: {
                windowBounds: { x: 0, y: 0, width: 800, height: 600 }
            }
        });

        this.serve = args.some(val => val === '--serve');

        this.cwd = path.resolve(app.getAppPath(), '../Services/satellite');
        this.defaultSettingsLocation = path.resolve(app.getAppPath(), './build-scripts/configs/scidap_default_settings.json');
        if (this.serve) {
            require('electron-reload')(`${__dirname}/../`, {
                electron: require(`${__dirname}/../node_modules/electron`)
            });
            this.cwd = path.resolve(__dirname, '../Services/satellite');
            this.defaultSettingsLocation = path.resolve(__dirname, '../build-scripts/configs/scidap_default_settings.json');
        }

        // this.pm2_home = path.join(app.getPath('home'), '.pm2');
        this.runUpdate();

        if (this.store.get('initComplete', false)) {
            keytar.getPassword('scidap-satellite', 'token')
                .then((token) => {
                    if (token) {
                        Log.debug('Token is good');
                        this.loadSettings(this.cwd, this.defaultSettingsLocation);
                        this.settings.satelliteSettings.rcServerToken = token;
                        this.chainStartPM2Services().then((v) => Log.info(`services started ${JSON.stringify(v)}`));
                    } else {
                        Log.debug('No token');
                    }
                }).catch((err) => {
                    Log.error(`Get token error ${err}`);
                });
        }
    }


    runUpdate() {
        const latestUpdate = this.store.get('latestUpdateVersion', null);
        if (!latestUpdate || semver.gt('1.0.12', latestUpdate)) {
            Log.info('Running settings update');
            this.removeDeprecatedSettings();
            this.loadSettings(this.cwd, this.defaultSettingsLocation);
            waitForInitConfiguration(this.settings);                     // the only time consuming part
            this.store.set('latestUpdateVersion', app.getVersion());
        }
    }


    removeDeprecatedSettings() {
        let removeKeys = [                                                             // deprecated or refactored keys that should be either removed or restored to their defaults
            'defaultLocations',
            'meteorSettings',
            'airflowSettings'
        ];
        for (const key of removeKeys) {
            Log.info(`Remove deprecated or refactored settings for ${key}`);
            this.store.delete(key);
        };
        if (this.store.has("satelliteSettings")) {                                     // need to remove deprecated fields
            let satelliteSettings = this.store.get("satelliteSettings");
            removeKeys = [
                'scidapRoot',                                                          // replaced by systemRoot
                'mongoPort',                                                           // no MongoDB anymore
                'mongoCollection',
                'scidapSSLPort',                                                       // replaced by enableSSL
                'sslCert',
                'sslKey'
            ];
            satelliteSettings = Object.keys(satelliteSettings)
                .filter((param) => !removeKeys.includes(param))                            // filter out all removeKeys
                .reduce((filtered, param) => {
                    filtered[param] = satelliteSettings[param];
                    return filtered;
                }, {})
            this.store.set("satelliteSettings", satelliteSettings);
        }
    }


    loadSettings(cwd, defaultSettingsLocation) {
        const skipKeys = [
            'executables',                                                                          // executables can be dynamically changed
            'loadedFrom'                                                                            // we don't want to save it in config.json as it's more like a techinical field
        ];
        this.settings = getSettings(cwd, defaultSettingsLocation);                                  // load default settings
        this.settings.loadedFrom = this.store.path;                                                 // need to overwrite the default loadedFrom to place NJS-Client config and token near config.json
        this.settings.defaultLocations.airflow = path.resolve(app.getPath('userData'), 'airflow');  // need to overwrite the default airflow folder location to place it within ~/Library/Application\ Support/scidap-satellite
        this.settings.airflowSettings = {                                                           // need to overwrite the defaultcwl_tmp_folder location to place it within ~/scidap folder
            ...this.settings.airflowSettings,
            "cwl__tmp_folder": path.resolve(this.settings.satelliteSettings.systemRoot, "cwl_tmp_folder")
        };
        for (const key in this.settings) {                                                           // update defaults if they have been already redefined in config.json
            if (skipKeys.includes(key)) {                                                            // skipped keys won't be saved into config.json
                continue;
            }
            if (this.store.has(key)) {
                let settingsFromStore = this.store.get(key);
                this.settings[key] = {
                    ...this.settings[key],
                    ...settingsFromStore
                };
            };
            this.store.set(key, this.settings[key]);                     // save either defaults or not changed data to config.json
        }
    }


    createWindow() {
        if (this.win) {
            this.win.show();
            return;
        }

        const { x, y, width, height } = this.store.get('windowBounds');

        // Create the browser window.
        this.win = new BrowserWindow({
            x,
            y,
            width,
            height,
            title: 'SciDAP Satellite',
            webPreferences: {
                nodeIntegration: true,
                enableRemoteModule: true
            },
            tabbingIdentifier: 'SciDAP'
        });


        if (this.serve) {
            this.win.loadURL('http://localhost:4200');
            this.win.webContents.openDevTools();
        } else {
            this.win.loadURL(url.format({
                pathname: path.join(__dirname, '../dist/index.html'),
                protocol: 'file:',
                slashes: true
            }));
        }

        this.windowEvents();
        return this.win;
    }


    createWebuiWindow() {
        if (this.webUiWin) {
            return;
        }

        const { x, y, width, height } = this.store.get('windowBounds');

        // Create the browser window.
        this.webUiWin = new BrowserWindow({
            x,
            y,
            width,
            height,
            title: 'WebUI',
            webPreferences: {
                nodeIntegration: true,
            },
            tabbingIdentifier: 'SciDAP'
        });


        if (this.serve) {
            this.webUiWin.loadURL(url.format({
                pathname: path.join(__dirname, '../build/webui-aria2/docs/index.html'),
                protocol: 'file:',
                slashes: true
            }));
        } else {
            this.webUiWin.loadURL(url.format({
                pathname: path.join(__dirname, '../dist/webui-aria2/index.html'),
                protocol: 'file:',
                slashes: true
            }));
        }

        this.webUiWin.on('closed', () => {
            this.webUiWin = null;
        });

        return this.webUiWin;
    }


    // createMongoExpressWindow() {
    //     if (this.mongoExpressWin) {
    //         return;
    //     }

    //     const { x, y, width, height } = this.store.get('windowBounds');

    //     // Create the browser window.
    //     this.mongoExpressWin = new BrowserWindow({
    //         x,
    //         y,
    //         width,
    //         height,
    //         title: 'Mongo Express',
    //         webPreferences: {
    //             nodeIntegration: true,
    //         },
    //         tabbingIdentifier: 'SciDAP'
    //     });


    //     this.mongoExpressWin.loadURL('http://localhost:27083/');

    //     this.mongoExpressWin.on('closed', () => {
    //         this.mongoExpressWin = null;
    //     });

    //     return this.mongoExpressWin;
    // }


    windowEvents() {
        // Emitted when the window is closed.
        this.win.on('close', (e) => {
            if (!this.willQuitApp) {
                /* the user only tried to close the window */
                e.preventDefault();
                this.win.hide();
            }
        });

        this.win.on('closed', (e) => {
            this.win = null;
        });


        this.win.on('resize', () => {
            const { x, y, width, height } = this.win.getBounds();
            this.store.set('windowBounds', { x, y, width, height });
        });
    }


    /**
     * resolves when docker is up
     */
    async checkDockerIsUp() {
        const env_var: any = {
            HOME: app.getPath('home'),
            PATH: this.settings.executables.pathEnvVar
        };

        return new Promise((resolve, reject) => {
            const dockerMonitorIntervalId = setInterval(() => {
                /**
                 * Maybe docker stat and send all the changes to show mem usage etc?
                 */
                exec("docker ps", { env: env_var }, (error, stdout, stderr) => {
                    if (error) {
                        this.isDockerUp = false;
                        this.send('docker-monit', false);
                    }
                    if (stderr) {
                        this.isDockerUp = false;
                        this.send('docker-monit', false);
                    } else {
                        clearInterval(dockerMonitorIntervalId);
                        this.isDockerUp = true;
                        this.send('docker-monit', true);
                        resolve(stdout);
                    }
                });
            }, 2000);
        });
    }


    async connectToPM2() {
        let http_interface = path.join(this.settings.executables.satelliteBin, '../../../', 'app/node_modules/pm2/bin/');
        if (this.serve) {
            http_interface = path.join(this.settings.executables.satelliteBin, '../../../', 'node_modules/pm2/bin/');
        }
        // const _spawn = spawn(`${this.settings.executables.satelliteBin}/node`, [`${http_interface}/HttpInterface.js`], {
        let env_var: any = {
            PM2_API_PORT: this.settings.satelliteSettings.pm2Port,
            // PM2_HOME: this.pm2_home,
            HOME: app.getPath('home'),
            PATH: this.settings.executables.pathEnvVar
        };

        if (this.settings.satelliteSettings.proxy) {
            env_var = {
                ...env_var,
                https_proxy: `${this.settings.satelliteSettings.proxy}`,
                http_proxy: `${this.settings.satelliteSettings.proxy}`,
                no_proxy: `${this.settings.satelliteSettings.noProxy || ''}`
            };
        }

        const _spawn = spawn(`${http_interface}/pm2`, ['ping'], {
            shell: true,
            env: env_var
        });

        _spawn.stderr.on('data', (data) => {
            Log.info(`pm2 god spawn error: ${data}`);
        });

        _spawn.stdout.on('data', (data) => {
            Log.info(`pm2 god spawn: ${data}`);
        });

        await new Promise((resolve, reject) => {
            _spawn.on('close', (code) => {
                if (code !== 0) {
                    Log.info(`pm2 god spawn ${code}`);
                    reject(code);
                } else {
                    Log.info('pm2 god spawned');
                    resolve();
                }
            });
        });

        return new Promise((resolve, reject) => {
            pm2.connect(false, (err) => {
                if (err) {
                    process.exit(2);
                    return reject(new Error(err));
                }
                return resolve();
            });
        });
    }


    /**
     * PM2 start promise wrapper, with options
     * @param options
     */
    startPM2(options) {
        return new Promise((resolve, reject) => {
            pm2.start(options, (err, proc) => {
                if (err) {
                    reject(new Error(err));
                }
                resolve(proc);
            });
        });
    }


    startPM2web() {
        return new Promise((resolve, reject) => {
            pm2.web(this.settings.satelliteSettings.pm2Port, (err, proc) => {
                if (err) {
                    reject(new Error(err));
                }
                resolve(proc);
            });
        });
    }

    /**
     * Starts all the services
     */
    async chainStartPM2Services(): Promise<any> {
        Log.info('Starting PM2 services');
        try {
            await this.connectToPM2();
            if (this.pm2MonitIntervalId) {
                clearInterval(this.pm2MonitIntervalId);
            }
            this.pm2MonitIntervalId = setInterval(() => {
                pm2.list((err, processDescriptionList) => {
                    this.send('pm2-monit', processDescriptionList);
                });
            }, 1000);
            // if (this.dockerMonitIntervalId) {
            //     clearInterval(this.dockerMonitIntervalId);
            // };
            // this.dockerMonitIntervalId = setInterval(() => {
            //     this.checkDocker();
            // }, 3000);
            // while (!this.isDockerUp) {
            //     await new Promise(resolve => setTimeout(resolve, 3000));
            // }
            await this.checkDockerIsUp();
            return await this.startPM2(getRunConfiguration(this.settings));
        } catch (error) {
            Log.info(error);
        }
    }


    killPM2() {
        return new Promise((resolve, reject) => {
            pm2.killDaemon((err) => {
                if (err) {
                    reject(new Error(err));
                }
                return resolve();
            });
        });
    }


    async killPM2_2() {
        let pm2_interface = path.join(this.settings.executables.satelliteBin, '../../../', 'app/node_modules/pm2/bin/');
        if (this.serve) {
            pm2_interface = path.join(this.settings.executables.satelliteBin, '../../../', 'node_modules/pm2/bin/');
        }

        const _spawn = spawn(`${pm2_interface}/pm2`, ['kill'], {
            shell: true,
            env: {
                HOME: app.getPath('home'),
                PATH: this.settings.executables.pathEnvVar
            }
        });

        _spawn.stderr.on('data', (data) => {
            Log.info(`pm2 god kill error: ${data}`);
        });

        _spawn.stdout.on('data', (data) => {
            Log.info(`pm2 god kill: ${data}`);
        });

        await new Promise((resolve, reject) => {
            _spawn.on('close', (code) => {
                if (code !== 0) {
                    Log.info(`pm2 god kill ${code}`);
                    reject(code);
                } else {
                    Log.info('pm2 god kill');
                    resolve();
                }
            });
        });
    }


    disconnectPM2() {
        return new Promise((resolve, reject) => {
            pm2.disconnect((err) => {
                if (err) {
                    // reject(new Error(err));
                    Log.error(err);
                }
                return resolve();
            });
        });
    }


    stopPM2program(id) {
        return new Promise((resolve, reject) => {
            pm2.stop(id, (err) => {
                if (err) {
                    reject(new Error(err));
                }
                return resolve();
            });
        });
    }


    restartPM2program(id) {
        return new Promise((resolve, reject) => {
            pm2.restart(id, (err) => {
                if (err) {
                    reject(new Error(err));
                }
                return resolve();
            });
        });
    }


    async satelliteInit() {
        const token = await keytar.getPassword('scidap-satellite', 'token');
        if (token) {
            Log.info('Running initial configuration');
            this.loadSettings(this.cwd, this.defaultSettingsLocation);               // reload settings in case something was changed
            this.settings.satelliteSettings.rcServerToken = token;
            waitForInitConfiguration(this.settings);
            this.store.set('initComplete', true);
            return await this.chainStartPM2Services();
        } else {
            return Promise.reject('Failed to run initial configuration: no token');
        }
    }


    getInterfaces() {
        const ifaces = os.networkInterfaces();

        Object.keys(ifaces).forEach((iface) => {
            const vals = ifaces[iface];
            if (iface.includes('tun')) {
                return;
            }
            const networkInterface = ifaces[iface]
                .filter(({ family, address, internal }) => {
                    const x: any = address.split('.')[0];
                    const firstNumber = 1 * (x);
                    return family.toLowerCase().indexOf('v4') >= 0 &&
                        !internal &&
                        !address.startsWith('127') &&
                        !address.startsWith('169.254') &&
                        !(firstNumber >= 224 && firstNumber <= 239);
                })
                .map(({ address }) => address);

            if (networkInterface.length > 0) {
                this.networkInterfaces = [...this.networkInterfaces, ...networkInterface];
            }
        });
        return this.networkInterfaces;
    }


    send(channel, ...arg) {
        this.win.webContents.send(channel, ...arg);
    }
}
