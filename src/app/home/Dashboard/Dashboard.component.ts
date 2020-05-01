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

    processes = ['satellite', 'airflow-scheduler', 'airflow-apiserver', 'aria2c', 'mongod', 'mongo-express'];

    _satelliteSettings;

    pm2Monit;
    pm2MonitAdopted = {};
    token;
    pm2;
    subs;

    constructor(
        public _electronService: ElectronService,
        private _zone: NgZone,
        private _http: HttpClient) {

        super();


        if (this.store.has('satelliteSettings')) {
            this._satelliteSettings = this.store.get('satelliteSettings');
        }


        this.tracked = this._electronService.pm2Monit().subscribe((list) => {
            this._zone.run(() => {
                this.pm2Monit = list.args[0];
            });
        });

    }

    get isAllUp(): boolean {
        if (!this.pm2Monit) {
            return false;
        }
        return !this.pm2Monit.find((process) => process.pm2_env.status !== 'online');
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
    monitorPM2_2(): Observable<any> {

        return timer(0, 1000).pipe(
            filter(() => {
                if (!this._satelliteSettings && this.store.has('satelliteSettings')) {
                    this._satelliteSettings = this.store.get('satelliteSettings');
                }
                return !!this._satelliteSettings;
            }),
            switchMap(() => bindCallback(this._electronService.pm2.list)()
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
