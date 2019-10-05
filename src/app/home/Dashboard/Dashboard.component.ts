import { Component, OnInit, ViewChild, NgZone, AfterViewInit, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { ClrWizard, ClrWizardPage } from '@clr/angular';

import { switchMap, filter, merge, catchError } from 'rxjs/operators';

import { of as observableOf, BehaviorSubject, Observable, Subject, bindCallback, combineLatest, timer } from 'rxjs';

import { ElectronService } from '../../core/services';
import { BaseComponent } from '../../core/lib/base.component';


const Store = require('electron-store');

@Component({
    selector: 'app-dashboard',
    templateUrl: './Dashboard.component.html',
    styleUrls: ['./Dashboard.component.scss']
})
export class DashboardComponent extends BaseComponent implements OnInit, AfterViewInit, OnDestroy {

    public showWarning = false;
    public errorMessage;

    public store = new Store();

    public step = 0;

    initInProgress = false;

    processes = ['pm2-http-interface', 'aria2c', 'mongod', 'airflow-scheduler', 'airflow-apiserver', 'satellite'];

    _satelliteSettings;

    pm2Monit;
    pm2MonitAdopted = {};
    token;
    pm2;
    subs;

    constructor(
        private _electronService: ElectronService,
        private _zone: NgZone,
        private _http: HttpClient) {

        super();


        if (this.store.has('satelliteSettings')) {
            this._satelliteSettings = this.store.get('satelliteSettings');
        }

        this.tracked = this.monitorPM2().subscribe((v: any) => {
            if (v && v.error) {
                return;
            }
            this.pm2Monit = v;
            const _pm2MonitAdopted = {};
            this.pm2Monit.processes.forEach(element => {
                _pm2MonitAdopted[element.name] = element;
            });
            this.pm2MonitAdopted = _pm2MonitAdopted;
        });

        // timer(0, 1000).pipe(
        //     switchMap(() => this._http.get(`http://localhost:${this._satelliteSettings.pm2Port}`, { responseType: 'json' })),
        //     catchError(error => {
        //         console.log(error);
        //         return observableOf({ error, series: null });
        //     }));

    }

    ngOnInit() {
    }

    ngAfterViewInit(): void {

    }

    ngOnDestroy(): void {
        super.ngOnDestroy();
    }

    /**
     *
     */
    monitorPM2() {

        return timer(0, 1000).pipe(
            filter(() => {
                if (this.store.has('satelliteSettings')) {
                    this._satelliteSettings = this.store.get('satelliteSettings');
                }
                return !!this._satelliteSettings;
            }),
            switchMap(() => this._http.get(`http://localhost:${this._satelliteSettings.pm2Port}`, { responseType: 'json' })
                .pipe(
                    catchError((error) => {
                        console.log(error);
                        return observableOf({ error, series: null });
                    })
                )
            ),
            catchError(error => {
                console.log(error);
                return observableOf({ error, series: null });
            }));
    }

    stopPM2program(id) {
        this._electronService.ipcRenderer.send('stop-program', id);
    }

    startPM2program(id) {
        this._electronService.ipcRenderer.send('restart-program', id);
    }

}
