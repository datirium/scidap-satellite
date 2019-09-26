import { Component, OnInit, ViewChild, NgZone, AfterViewInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { ClrWizard, ClrWizardPage } from '@clr/angular';

import { switchMap, filter, merge, catchError } from 'rxjs/operators';

import { of as observableOf, BehaviorSubject, Observable, Subject, bindCallback, combineLatest, timer } from 'rxjs';

import { ElectronService } from '../core/services';
import { BaseComponent } from '../core/lib/base.component';

import { SatelliteSettingsComponent } from './SatelliteSettings/SatelliteSettings.component';

const Store = require('electron-store');

@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.scss']
})
export class HomeComponent extends BaseComponent implements OnInit, AfterViewInit {

    @ViewChild('wizard', { static: false }) wizard: ClrWizard;
    @ViewChild('settings', { static: false }) pageSettings: ClrWizardPage;

    @ViewChild('satelliteSettings', { static: false }) satelliteSettings: SatelliteSettingsComponent;

    public form: FormGroup;
    public wizardOpen = false;

    public email;
    public password;
    public rememberMe;

    satIdAssigned;
    _airflowSettings;
    _satelliteSettings;

    public showWarning = false;
    public errorMessage;
    public _login = false;
    public _newuser = false;

    public store = new Store();

    public step = 0;

    initInProgress = false;

    processes = ['pm2-http-interface', 'aria2c', 'mongod', 'airflow-scheduler', 'airflow-apiserver', 'satellite'];
    pm2Monit;
    pm2MonitAdopted = {};
    token;

    _loginData = {};
    set loginData(v: any) {
        this._loginData = v;

        if (v.email) {
            this.store.set('email', v.email);
        }

        if (v.password) {
            this.store.set('password', v.password);
        }

        if (v.rememberMe) {
            this.store.set('rememberMe', v.rememberMe);
        }
    }

    get loginData() {
        return this._loginData;
    }

    constructor(
        private formBuilder: FormBuilder,
        private _electronService: ElectronService,
        private _zone: NgZone,
        private _http: HttpClient) {

        super();

        this.restoreSaved();
    }

    /**
     *
     */
    private restoreSaved() {
        const m = { email: '', password: '', rememberMe: false };

        if (!this.store.has('initComplete') || !this.store.get('initComplete')) {
            this.wizardOpen = true;
        }

        if (this.store.get('email')) {
            console.log(this.store.get('email'));
            m.email = this.store.get('email');
        }

        if (this.store.get('password')) {
            console.log(this.store.get('password'));
            m.password = this.store.get('password');
        }

        if (this.store.get('rememberMe')) {
            console.log(this.store.get('rememberMe'));
            m.rememberMe = this.store.get('rememberMe');
        }

        if (this.store.get('token')) {
            console.log(this.store.get('token'));
            this.token = this.store.get('token');
        }

        this._loginData = m;


        if (this.store.has('airflowSettings')) {
            this._airflowSettings = JSON.parse(this.store.get('airflowSettings'));
        }

        if (this.store.has('satelliteSettings')) {
            this._satelliteSettings = JSON.parse(this.store.get('satelliteSettings'));
        }

    }


    changeState(state) {
        if (this.step >= state) {
            return;
        }
        this.step = state;
        this._zone.run(() => this.wizard.next());
    }

    /**
     *
     */
    ngOnInit() {
    }

    ngAfterViewInit(): void {
        if (this.token) {
            this.wizard.pageCollection.pagesAsArray.find(page => {
                if (page._id === this.pageSettings._id) {
                    return true;
                }
                page.completed = true;
                return false;
            });
            this.wizard.navService.currentPage = this.pageSettings;
        }

        // if (!this.wizardOpen) {
        //     this.monitorPM2().subscribe((v) => {
        //         console.log(v);
        //         this.pm2Monit = v;
        //         const _pm2MonitAdopted = {};
        //         this.pm2Monit.processes.forEach(element => {
        //             _pm2MonitAdopted[element.name] = element;
        //         });
        //         this.pm2MonitAdopted = _pm2MonitAdopted;
        //     });

        //     // timer(0, 1000).pipe(
        //     //     switchMap(() => this._http.get(`http://localhost:${this._satelliteSettings.pm2Port}`, { responseType: 'json' })),
        //     //     catchError(error => {
        //     //         console.log(error);
        //     //         return observableOf({ error, series: null });
        //     //     }));
        // }
    }



    /**
     *
     */
    goToLogin() {
        this._login = true;
        this._newuser = false;
        this.changeState(1);
    }

    goToNewUser() {
        this._login = false;
        this._newuser = true;
        this.changeState(1);
    }

    doLoginOrRegister(buttonType) {
        if ('login' === buttonType) {
            this.goToLogin();
        }
        if ('new-user' === buttonType) {
            this.goToNewUser();
        }
    }

    doLogin() {
        if (this.loginData && this.loginData.email && this.loginData.password) {
            console.log('Login data:', this.loginData);
            this._electronService.login(this.loginData.email, this.loginData.password)
                .pipe(
                    switchMap((er: any) => {
                        if (!er) {
                            console.log('logged in!');
                            this._zone.run(() => {
                                this._showError = false;
                                this._submitting = false;
                                this.errorMessage = false;
                            });
                            return combineLatest([this._electronService.profileSubscribe(), this._electronService.labSubscribe()]);
                        }
                        this._zone.run(() => {
                            if (er['error'] === 1000) {
                                // let self = this;
                                console.log('email is not verified');
                                this.errorMessage = 'Email has not been verified!';
                            } else {
                                console.log({ title: 'User can\'t be logged in!', message: er.message });
                                this.errorMessage = `User can't be logged in! ${er.message}`;
                            }
                        });
                        return observableOf({ error: er.error, message: er.message } as any);
                    }),
                    filter((v) => v[0] && !v[0].error)

                )
                .subscribe(
                    ([user, lab]) => {
                        console.log(user, lab);
                        this._zone.run(() => {
                            if (lab && lab.satellite_id) {
                                this.satIdAssigned = true;
                            }
                            this._submitting = false;
                            setTimeout(() => this.changeState(2), 10);
                        });
                    });

        }
    }

    doAgree(buttonType) {
        if ('cancel' === buttonType) {
            console.log('send app quit');
        }

        this._electronService.satCreateGetToken().subscribe(
            (token) => {
                console.log(token);
                if (token && !token.error) {
                    this.store.set('token', token);
                    this.changeState(3);
                }
            }
        );
        //
    }

    doSettings() {
        this.initInProgress = true;
        this.satelliteSettings.doFinish().then((v) => {
            this.initInProgress = false;
            console.log(v);

            if (this.store.get('initComplete', false)) {
                this.wizard.close();
                this.wizardOpen = false;
            } else {
                console.log('initComplete false');
            }
            if (v[0] !== 'complete') {
                console.log('Error in init');
            }
        });
    }
}
