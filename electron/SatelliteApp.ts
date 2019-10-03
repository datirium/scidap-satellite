import { BrowserWindow, screen as electronScreen, ipcMain, app } from 'electron';

const Store = require('electron-store');
import { spawn } from 'child_process';

import * as path from 'path';
import * as url from 'url';
import * as fs from 'fs';
import * as os from 'os';
import * as keytar from 'keytar';

import { parse, stringify } from './IniParser';

import { SatelliteDefault } from './SatelliteDefault';

const pm2 = require('pm2');

const Log = require('electron-log');

const args = process.argv.slice(1);

export class SatelliteApp {
    private win = null;
    private store;

    services_base_path;
    airflow_base_path;
    serve;

    airflowSettings;
    satelliteSettings;
    token;
    initComplete;

    networkInterfaces = [];

    pm2_home;

    /**
     *
     */
    constructor() {
        // const size = electronScreen.getPrimaryDisplay().workAreaSize;
        this.store = new Store({
            defaults: {
                windowBounds: { x: 0, y: 0, width: 800, height: 600 }
            }
        });

        this.serve = args.some(val => val === '--serve');

        this.services_base_path = path.join(__dirname, '../Services/satellite/bin');
        this.airflow_base_path = path.join(__dirname, '../Services/cwl-airflow/');
        if (this.serve) {
            require('electron-reload')(`${__dirname}/../`, {
                electron: require(`${__dirname}/../node_modules/electron`)
            });
            this.services_base_path = path.join(__dirname, '../Services/satellite/bin');
            this.airflow_base_path = path.join(__dirname, '../Services/cwl-airflow/');
        } else {
            this.services_base_path = path.join(app.getAppPath(), '../Services/satellite/bin');
            this.airflow_base_path = path.join(app.getAppPath(), '../Services/cwl-airflow/');

            Log.info(this.services_base_path);
        }

        this.airflowSettings = JSON.parse(this.store.get('airflowSettings', null));
        this.satelliteSettings = JSON.parse(this.store.get('satelliteSettings', null));

        this.pm2_home = path.join(app.getPath('home'), '/.pm2');

        this.initComplete = this.store.get('initComplete', false);

        if (this.initComplete && this.airflowSettings && this.satelliteSettings) {
                keytar.getPassword('scidap-satellite', 'token')
                .then((token) => {
                    if (token) {
                        Log.info('Pm2 started!');
                        this.token = token;
                        // Start PM2!
                        this.chainStartPM2Services().then((v) => Log.info(`services started ${JSON.stringify(v)}`));
                    }
                });
        }
    }

    /**
     *
     */
    createWindow() {
        if (this.win) {
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
            },
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

    /**
     *
     */
    windowEvents() {
        // Emitted when the window is closed.
        this.win.on('closed', () => {
            this.win = null;
        });


        this.win.on('resize', () => {
            const { x, y, width, height } = this.win.getBounds();
            this.store.set('windowBounds', { x, y, width, height });
        });
    }


    /**
     *    PM2
     */

    async connectToPM2() {
        let http_interface = path.join(this.services_base_path, '../../../', 'app/node_modules/pm2/bin/');
        if (this.serve) {
            http_interface = path.join(this.services_base_path, '../../../', 'node_modules/pm2/bin/');
        }
        // const _spawn = spawn(`${this.services_base_path}/node`, [`${http_interface}/HttpInterface.js`], {
        const _spawn = spawn(`${http_interface}/pm2`, ['web'], {
            shell: true,
            env: {
                PM2_API_PORT: this.satelliteSettings.pm2Port,
                // PM2_HOME: this.pm2_home,
                HOME: app.getPath('home'),
                PATH: `${this.services_base_path}:${this.airflow_base_path}/Resources/app/bin:` +
                    `${this.airflow_base_path}/Resources/app_packages/bin:/usr/bin:/bin:/usr/local/bin`,
            }
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
            pm2.web(this.satelliteSettings.pm2Port, (err, proc) => {
                if (err) {
                    reject(new Error(err));
                }
                resolve(proc);
            });
        });
    }

    /**
     *
     */
    startPM2Aria2c() {
        const options = {
            name: 'aria2c',
            script: `${this.services_base_path}/aria2c`,
            args: ['--enable-rpc', '--rpc-listen-all=false', `--rpc-listen-port=${this.satelliteSettings.aria2cPort}`, '--console-log-level=debug'],
            watch: false,
            exec_mode: 'fork_mode',
            cwd: `${this.satelliteSettings.scidapRoot}/files`
        };

        return this.startPM2(options);
    }


    /**
     *
     */
    startPM2Mongod() {
        const options = {
            name: 'mongod',
            script: `${this.services_base_path}/mongod`,
            args: [`--port=${this.satelliteSettings.mongoPort}`, '--bind_ip=127.0.0.1', `--dbpath=${this.satelliteSettings.scidapRoot}/mongodb`],
            watch: false,
            exec_mode: 'fork_mode',
            cwd: `${this.satelliteSettings.scidapRoot}/mongodb`
        };

        return this.startPM2(options);
    }

    /**
     *
     */
    startAirflowScheduler() {
        // -l LOG_FILE, --log-file LOG_FILE
        // Location of the log file

        const options = {
            name: 'airflow-scheduler',
            script: `${this.airflow_base_path}/Resources/python/bin/python3`,
            args: [`${this.airflow_base_path}/Resources/app_packages/bin/airflow`, 'scheduler'],
            interpreter: 'none',
            watch: false,
            exec_mode: 'fork_mode',
            cwd: this.airflowSettings.AIRFLOW_HOME,
            env: {
                PYTHONPATH: `${this.airflow_base_path}/Resources/app:${this.airflow_base_path}/Resources/app_packages`,
                PATH: `${this.airflow_base_path}/Resources/python/bin:${this.airflow_base_path}/Resources/app/bin:` +
                    `${this.airflow_base_path}/Resources/app_packages/bin:/usr/bin:/bin:/usr/local/bin`,
                AIRFLOW_HOME: this.airflowSettings.AIRFLOW_HOME
            }
        };

        return this.startPM2(options);
    }

    /**
     *
     */
    startAirflowAPI() {
        const options = {
            name: 'airflow-apiserver',
            script: `${this.airflow_base_path}/MacOS/apiserver`,
            args: [`--port=${this.satelliteSettings.airflowAPIPort}`],
            interpreter: 'bash',
            watch: false,
            exec_mode: 'fork_mode',
            cwd: `${this.satelliteSettings.scidapRoot}`,
            env: {
                PYTHONPATH: `${this.airflow_base_path}/Resources/app:${this.airflow_base_path}/Resources/app_packages`,
                PATH: `${this.airflow_base_path}/Resources/python/bin:${this.airflow_base_path}/Resources/app/bin:` +
                    `${this.airflow_base_path}/Resources/app_packages/bin:/usr/bin:/bin:/usr/local/bin`,
                AIRFLOW_HOME: this.airflowSettings.AIRFLOW_HOME
            }
        };
        return this.startPM2(options);
    }

    /**
     *
     */
    startSatellite() {
        const options = {
            name: 'satellite',
            // script: `${this.services_base_path}/node`,
            script: `${this.services_base_path}/../main.js`,
            // args: [`${this.services_base_path}/../main.js`],
            interpreter: 'node',
            watch: false,
            exec_mode: 'fork_mode',
            cwd: `${this.satelliteSettings.scidapRoot}`,
            env: {
                MONGO_URL: `mongodb://localhost:${this.satelliteSettings.mongoPort}/scidap-satellite`,
                ROOT_URL: `${this.satelliteSettings.baseUrl}`,
                PORT: `${this.satelliteSettings.port}`,
                METEOR_SETTINGS: this.getSatelliteConf(),
                NODE_OPTIONS: '--trace-warnings --pending-deprecation',
                PATH: `${this.services_base_path}:${this.airflow_base_path}/Resources/app/bin:` +
                    `${this.airflow_base_path}/Resources/app_packages/bin:/usr/bin:/bin:/usr/local/bin`,
            }
        };
        return this.startPM2(options);
    }

    /**
     *
     */
    async chainStartPM2Services(): Promise<any> {
        try {
            await this.connectToPM2();
            await this.startPM2Aria2c();
            await this.startPM2Mongod();
            await this.startAirflowScheduler();
            await this.startAirflowAPI();
            return await this.startSatellite();
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

        let pm2_interface = path.join(this.services_base_path, '../../../', 'app/node_modules/pm2/bin/');
        if (this.serve) {
            pm2_interface = path.join(this.services_base_path, '../../../', 'node_modules/pm2/bin/');
        }

        const _spawn = spawn(`${pm2_interface}/pm2`, ['kill'], {
            shell: true,
            env: {
                HOME: app.getPath('home'),
                PATH: `${this.services_base_path}:${this.airflow_base_path}/Resources/app/bin:` +
                    `${this.airflow_base_path}/Resources/app_packages/bin:/usr/bin:/bin:/usr/local/bin`,
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
                    reject(new Error(err));
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
     * Init saves all settings and starts services for the first time!
     */
    async satelliteInit() {
        this.airflowSettings = JSON.parse(this.store.get('airflowSettings'));
        this.satelliteSettings = JSON.parse(this.store.get('satelliteSettings'));

        Log.info('init airflowSettings:', this.airflowSettings);
        Log.info('init satelliteSettings:', this.satelliteSettings);
        const self = this;

        const init_commands = [
            `airflow initdb`,
            `airflow connections -a --conn_id process_report --conn_uri http://localhost:${this.satelliteSettings.port} --conn_extra "{\"endpoint\":\"/airflow/\"}"`
        ];

        await init_commands.forEach(async (command) => {
            Log.info(command);
            const _spawn = spawn(`${self.airflow_base_path}/MacOS/${command}`, [], {
                shell: true,
                env: {
                    AIRFLOW_HOME: self.airflowSettings.AIRFLOW_HOME
                }
            });
            let _stderr, _stdout;
            // TODO: delete old config!
            _spawn.stdout.on('data', (data) => {
                if (data.toString().includes('`conn_id`=process_report already exists')) {
                }
                _stdout = `${_stdout}${data}`;
            });
            _spawn.stderr.on('data', (data) => {
                _stderr = `${_stderr}${data}`;
            });
            await new Promise((resolve, reject) => {
                _spawn.on('close', (code) => {
                    if (code !== 0) {
                        Log.info(`init command exited with code ${code}`);
                        Log.info(`init stderr ${_stderr}`);
                        reject(code);
                    } else {
                        Log.info(command, 'complete');
                        Log.info(command, _stdout);
                        resolve();
                    }
                });
            });
        });

        const airflowConfig: any = parse(fs.readFileSync(`${self.airflowSettings.AIRFLOW_HOME}/airflow.cfg`, 'utf-8'));
        airflowConfig.core.dag_concurrency = 2;
        airflowConfig.core.dags_are_paused_at_creation = 'False';
        airflowConfig.core.max_active_runs_per_dag = 2;
        airflowConfig.core.load_examples = 'False';
        // conf.set("cwl", "tmp_folder", os.path.join(self.airflow_home, 'tmp'))
        fs.writeFileSync(`${self.airflowSettings.AIRFLOW_HOME}/airflow.cfg`, stringify(airflowConfig, { whitespace: true }));
        fs.mkdirSync(`${self.airflowSettings.AIRFLOW_HOME}/dags`, { recursive: true });
        fs.copyFileSync(`${self.airflow_base_path}/Resources/app/cwl_airflow/dags/clean_dag_run.py`, `${self.airflowSettings.AIRFLOW_HOME}/dags/clean_dag_run.py`);
        fs.mkdirSync(`${this.satelliteSettings.scidapRoot}/files`, { recursive: true });
        fs.mkdirSync(`${this.satelliteSettings.scidapRoot}/mongodb`, { recursive: true });
        this.store.set('initComplete', true);

        const token = await keytar.getPassword('scidap-satellite', 'token');

        if (token) {
            Log.info('Pm2 started!');
            this.token = token;
            return await this.chainStartPM2Services();
        } else {
            return Promise.reject('no token');
        }
    }



    /**
     *
     */
    getSatelliteConf() {
        const satelliteConf = {
            ...SatelliteDefault,
            base_url: this.satelliteSettings.baseUrl,
            rc_server_token: this.token,
            systemRoot: this.satelliteSettings.scidapRoot,
            airflow: {
                trigger_dag: this.satelliteSettings.triggerDag,
                dags_folder: `${this.airflowSettings.AIRFLOW_HOME}/dags/`
            },
            logFile: `${this.airflowSettings.AIRFLOW_HOME}/../satellite-service.log`,
        };

        if (this.satelliteSettings.sslCert && this.satelliteSettings.sslKey && this.satelliteSettings.scidapSSLPort) {
            satelliteConf['SSL'] = {
                'key': this.satelliteSettings.sslKey,
                'cert': this.satelliteSettings.sslCert,
                'port': this.satelliteSettings.scidapSSLPort
            };
        }

        if (this.satelliteSettings.localFiles) {
            satelliteConf.remotes.localfiles = {
                ...satelliteConf.remotes.localfiles,
                base_directory: `${this.satelliteSettings.scidapRoot}/files`
            };
        } else {
            satelliteConf.remotes.localfiles = {
                collection: {},
                publication: 'none'
            };
        }

        return satelliteConf;
    }

    /**
     *
     */
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

    /**
     *
     */
    send(channel, ...arg) {
        this.win.webContents.send(channel, ...arg);
    }
}
