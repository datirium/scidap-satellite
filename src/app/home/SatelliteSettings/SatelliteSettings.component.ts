import { Component, OnInit, NgZone } from '@angular/core';
import { ElectronService } from '../../core/services';
import { Subject, Observable, Subscriber } from 'rxjs';

const Store = require('electron-store');


@Component({
    selector: 'app-satellite-settings',
    templateUrl: './SatelliteSettings.component.html',
    styleUrls: ['./SatelliteSettings.component.scss']
})
export class SatelliteSettingsComponent implements OnInit {

    commonSettings;
    advancedSettings;

    dataDirectory;

    globalSettings = {};

    airflowSettings: any = {};
    portchecked = {};
    portcheck;
    skipng;
    satelliteSettings = {
        port: 3069,
        scidapRoot: '',
        scidapSSLPort: 3070,
        airflowAPIPort: 8080,
        aria2cPort: 6800,
        mongoPort: 27017,
        pm2Port: 9615,
        baseUrl: '',
        sslCert: '',
        sslKey: '',
        triggerDag: 'http://127.0.0.1:8080/api/experimental/dags/{dag_id}/dag_runs',
        localFiles: true
    };

    public store = new Store();

    constructor(
        private _electronService: ElectronService,
        private _zone: NgZone
    ) {
        this.portcheck = this._electronService.remote.require('tcp-port-used');
        this.satelliteSettings = {
            ...this.satelliteSettings,
            scidapRoot: this._electronService.remote.app.getPath('home') + '/scidap',
            baseUrl: 'http://localhost:3069/'
        };

        this.airflowSettings = {
            ...this.airflowSettings,
            AIRFLOW_HOME: this._electronService.remote.app.getPath('userData') + '/airflow',
            init_commands: [
                `airflow initdb`,
                `airflow connections -a --conn_id process_report --conn_uri http://localhost:${this.satelliteSettings.port} --conn_extra "{\"endpoint\":\"/airflow/\"}"`
            ]
        };
        if (this.store.has('skipng')) {
            this.skipng = this.store.get('skipng');
        }
        if (this.store.has('airflowSettings')) {
            this.airflowSettings = {
                ...this.airflowSettings,
                ...this.store.get('airflowSettings')
            };
        }
        if (this.store.has('satelliteSettings')) {
            this.satelliteSettings = {
                ...this.satelliteSettings,
                ...this.store.get('satelliteSettings')
            };
        }
    }

    ngOnInit() {
        console.log(this._electronService.remote.app.getPath('home'));
    }


    openDirectoryDialog() {
        this._electronService.remote.dialog.showOpenDialog({ properties: ['openDirectory'] }).then(({ filePaths, ...other }) => {
            console.log(filePaths, other);
            this.satelliteSettings.scidapRoot = filePaths[0];
        });
    }

    openCertDialog(v) {
        this._electronService.remote.dialog.showOpenDialog({ properties: ['openFile'] }).then(({ filePaths, ...other }) => {
            console.log(filePaths, other);
            if (1 === v) {
                this.satelliteSettings.sslCert = filePaths[0];
            } else {
                this.satelliteSettings.sslKey = filePaths[0];
            }
        });
    }

    doFinish() {

        const url = new URL(this.satelliteSettings.triggerDag);
        if (!url.port) {
            url.port = '8080';
        }
        this.satelliteSettings.airflowAPIPort = parseInt(url.port, 10);

        this.store.set('airflowSettings', this.airflowSettings);
        this.store.set('satelliteSettings', this.satelliteSettings);

        const _ret = new Promise((resolve, reject) => {
            this._electronService.ipcRenderer.on('satellite-init', (d, ...args) => {
                resolve(args);
            });
        });

        this._electronService.ipcRenderer.send('satellite-init', 'init');

        return _ret;
    }

    /**
     *
     * @param port
     */
    checkPort(port) {
        if (!port) {
            return true;
        }

        if (this.portchecked.hasOwnProperty(+port)) {
            return this.portchecked[+port];
        }

        this.portchecked[+port] = false;
        this.portcheck.check(+port, '127.0.0.1').then((inUse) => {
            this.portchecked[+port] = inUse;
        });

        return this.portchecked[+port];
    }

    checkURLPort(url) {
        const _url = new URL(url);
        if (!_url.port) {
            return true;
        }
        return this.checkPort(+_url.port);
    }
}
