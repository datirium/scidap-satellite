import { BrowserWindow, screen as electronScreen, ipcMain, app } from 'electron';

const Store = require('electron-store');
import { spawn, exec } from 'child_process';

import * as path from 'path';
import * as url from 'url';
import * as os from 'os';
import * as keytar from 'keytar';

const semver = require('semver');
const xbytes = require('xbytes');
const fs = require("fs");
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
    pm2MonitIntervalId;
    dockerMonitIntervalId;
    diskMonitIntervalId;
    tokenMonitorIntervalId;
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
            this.getToken()                            // waits until token can be retrieved from the keychain
                .then((token) => {
                    this.loadSettings(this.cwd, this.defaultSettingsLocation);
                    this.settings.satelliteSettings.rcServerToken = token;
                    this.chainStartPM2Services().then((v) => Log.info(`services started ${JSON.stringify(v)}`));
                }).catch((err) => {
                    Log.error(`Got error ${err}`);
                });
        }
    }


    /**
     * resolves when token is found
     */
    getToken() {
        return new Promise((resolve, reject) => {
            const tokenMonitorIntervalId = setInterval(() => {
                keytar.getPassword('scidap-satellite', 'token')
                    .then((token) => {
                        if (token) {
                            Log.info('Token is found');
                            clearInterval(tokenMonitorIntervalId);
                            this.send('token-monit', true);
                            resolve(token);
                        } else {
                            Log.info('Token not found');
                            this.send('token-monit', false);
                        }
                    });
            }, 2000);
        });
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
     * Parses formatted docker stats stdout into JSON object
     */
    parseDockerStats(raw_data){
        let nCPU = 1;                                                                                  // number of CPUs available for Docker
        let dockerStats = raw_data.split('\n')
            .filter(line => !!line)                                                                    // to skip empty lines
            .reduce((collected, line) => {
                let raw_params = line.split('\t');
                if (raw_params.length == 1){                                                           // if only one item is present it's nCPU
                    nCPU = parseInt(raw_params[0]);
                    return collected;
                };
                const [containerId, cpuUsagePerc, memUsagePerc, memInfoIEC, pids] = raw_params;
                if (containerId) {                                                                     // sometime docker stats reports empty container id when it just started
                    const [memUsageIEC, memLimitIEC] = memInfoIEC.replace(/\s/g,'').split('/');        // need to remove spaces
                    collected[containerId] = {
                        cpuUsagePerc: parseFloat(cpuUsagePerc),
                        memUsagePerc: parseFloat(memUsagePerc),
                        memUsageMB: parseInt(xbytes.parse(memUsageIEC).convertTo('MB')),               // Docker reports in IEC format - KiB, MiB, TiB, etc, we need MB
                        memLimitMB: parseInt(xbytes.parse(memLimitIEC).convertTo('MB')),
                        cpuLimitNum: nCPU,
                        cpuUsageFrac: parseFloat(cpuUsagePerc)/nCPU,                                   // scaled to the number of CPUs available
                        pids: parseInt(pids)
                    };
                };
                return collected;
            }, {});
        return dockerStats;
    }


    /**
     * resolves when docker is up
     */
    async checkDockerIsUp() {
        const env_var: any = {
            HOME: app.getPath('home'),
            PATH: this.settings.executables.pathEnvVar
        };

        if (this.dockerMonitIntervalId) {                // to prevent from running several intervals
            clearInterval(this.dockerMonitIntervalId);
        };
        return new Promise((resolve, reject) => {
            this.dockerMonitIntervalId = setInterval(() => {
                exec(
                    'docker info --format "{{.NCPU}}" && docker stats --no-stream --format "{{.ID}}\t{{.CPUPerc}}\t{{.MemPerc}}\t{{.MemUsage}}\t{{.PIDs}}"',
                    { env: env_var },
                    (error, stdout, stderr) => {
                        if (error || stderr) {
                            this.send('docker-monit', false);                 // false for docker is not running
                        } else {
                            let dockerStats = this.parseDockerStats(stdout);
                            this.send('docker-monit', dockerStats);           // either {} or real docker statistics
                            resolve(dockerStats);                             // promises cannot recur, so it's safe to resolve it multiple times
                        }
                    }
                );
            }, 1500);
        });
    }

    /**
     * resolves only when all required folders exist
     * sends disk-monit report in a form of {location: true/false}
     */
    async checkDiskIsAvailable() {
        if (this.diskMonitIntervalId) {
            clearInterval(this.diskMonitIntervalId);
        };
        let locationsToCheck = [
            this.settings.satelliteSettings.systemRoot,
            ...Object.values(this.settings.defaultLocations)
        ];
        return new Promise((resolve, reject) => {
            this.diskMonitIntervalId = setInterval(() => {
                let chain = Promise.resolve({});                                                            // sets inittial value for report to {}
                for (let location of locationsToCheck) {
                    chain = chain.then((report) => {
                        return new Promise((resolve, reject) => {
                            fs.access(location, fs.constants.R_OK | fs.constants.W_OK | fs.constants.X_OK,  // rwx access to the folder
                                (error: any) => {
                                    report[location] = !error;
                                    resolve(report);
                                }
                            );
                        });
                    });
                };
                chain.then(
                    (report) => {
                        this.send('disk-monit', report);
                        if (Object.keys(report).every((k) => report[k])) {  // true if all is true or if locationsToCheck was []
                            resolve(report);                                // promises cannot recur, so it's safe to resolve it multiple times
                        };
                    }
                );
            }, 1500);
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
            await this.checkDockerIsUp();
            await this.checkDiskIsAvailable();
            return await this.restartPM2program(getRunConfiguration(this.settings));
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


    /**
     * It used to fail when token wasn't found, now it will wait for it.
     * After user enter his email/password and token will be saved, this
     * function will continue execution.
     *
     * When run after pressing on "Save and Restart" button, we set
     * skipFolderCreation to true, so the function waitForInitConfiguration
     * won't be executed as it's not the real initial satellite configuration
     * and we don't need to create any new folders and set up proxy for
     * fastq-dump. UI won't allow to select folders that don't exist, so no
     * need to create them.
     */
    async satelliteInit(skipFolderCreation=false) {
        this.getToken()                                                      // waits until token can be retrieved from the keychain
            .then((token) => {
                Log.info('Running initial configuration');
                this.loadSettings(this.cwd, this.defaultSettingsLocation);   // reload settings in case something was changed
                this.settings.satelliteSettings.rcServerToken = token;
                if (!skipFolderCreation){
                    waitForInitConfiguration(this.settings);
                }
                this.store.set('initComplete', true);
                return this.chainStartPM2Services();
            })
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
