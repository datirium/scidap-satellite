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

    satelliteSettings: any = {};
    defaultLocations: any = {};
    airflowSettings: any = {};

    portchecked = {};
    portcheck;
    skipng;    // maybe don't need it here
    
    public store = new Store();

    constructor(
        public _electronService: ElectronService,
        private _zone: NgZone
    ) {

        this.portcheck = this._electronService.remote.require('tcp-port-used');

        if (this.store.has('skipng')) {
            this.skipng = this.store.get('skipng');
        }

        this.satelliteSettings = this.store.get('satelliteSettings', null)
        this.defaultLocations = this.store.get('defaultLocations', null)
        this.airflowSettings = this.store.get('airflowSettings', null)

    }

    ngOnInit() {
        console.log(this._electronService.remote.app.getPath('home'));
    }


    openDirectoryDialog(v: any) {
        this._electronService.remote.dialog.showOpenDialog({ properties: ['openDirectory'] }).then(({ filePaths, ...other }) => {
            console.log(filePaths, other);
            if (other && other.canceled){
                return;                     // do nothing if Cancel button was pressed
            };
            if (1 === v) {
                this.satelliteSettings.systemRoot = filePaths[0];
            } else if (2 === v) {
                this.airflowSettings.cwl__tmp_folder = filePaths[0];
            } else {
                this.defaultLocations.pgdata = filePaths[0];
            }
        });
    }

    // openCertDialog(v) {
    //     this._electronService.remote.dialog.showOpenDialog({ properties: ['openFile'] }).then(({ filePaths, ...other }) => {
    //         console.log(filePaths, other);
    //         if (1 === v) {
    //             this.satelliteSettings.sslCert = filePaths[0];
    //         } else {
    //             this.satelliteSettings.sslKey = filePaths[0];
    //         }
    //     });
    // }

    doSave() {
        this.store.set('satelliteSettings', this.satelliteSettings);
        this.store.set('defaultLocations', this.defaultLocations);
        this.store.set('airflowSettings', this.airflowSettings);
    }

    doFinish() {

        this.doSave();

        const _ret = new Promise((resolve, reject) => {
            this._electronService.ipcRenderer.on('satellite-init', (d, ...args) => {
                resolve(args);
            });
        });

        this._electronService.ipcRenderer.send('satellite-init', 'init');

        return _ret;
    }

    doRestart() {

        this.doSave();

        const _ret = new Promise((resolve, reject) => {
            this._electronService.ipcRenderer.on('restart-programs', (d, ...args) => {
                resolve(args);
            });
        });

        this._electronService.ipcRenderer.send('restart-programs');

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
