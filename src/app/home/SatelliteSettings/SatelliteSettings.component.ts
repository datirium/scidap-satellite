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

    }

    ngOnInit() {
        console.log(this._electronService.remote.app.getPath('home'));
    }


    openDirectoryDialog() {
        this._electronService.remote.dialog.showOpenDialog({ properties: ['openDirectory'] }).then(({ filePaths, ...other }) => {
            console.log(filePaths, other);
            this.satelliteSettings.systemRoot = filePaths[0];
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
