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

    menuText = 'Check for updates';
    buttonText = 'update';
    skipng = false;

    dockerMonit;
    isDockerUp = null;

    public cogBadge = false;
    public updateAvailable = false;
    public tokenIsMissing = false;
    public updateNotAvailable = false;
    readyToInstall = false;

    public showWarning = false;
    public errorMessage;
    public _login = false;
    public _newuser = false;

    public store = new Store();

    public step = 0;

    initInProgress = false;

    downloadPercent;
    downloadSpeed;
    showProgress;
    checkPressed;

    pm2Monit;
    pm2MonitAdopted = {};
    token;

    keytar;

    _loginData = {};
    set loginData(v: any) {
        if (!v || Object.keys(v).length === 0) {
            return;
        }
        this._loginData = v;

        console.log(v);

        if (v.hasOwnProperty('rememberMe')) {
            console.log('has Property!');

            if (v.rememberMe) {
                if (v.email) {
                    this.store.set('email', v.email);
                }

                if (v.password) {
                    this.keytar.setPassword('scidap-satellite', 'password', v.password).catch((e) => console.log(e));
                }
                this.store.set('rememberMe', v.rememberMe);
            } else if (v.rememberMe === false) {
                this.keytar.deletePassword('scidap-satellite', 'password');
                this.store.set('email', '');
            }
        }
    }

    get loginData() {
        return this._loginData;
    }

    /**
     *
     * @param _electronService
     * @param _zone
     */
    constructor(
        public _electronService: ElectronService,
        private _zone: NgZone
    ) {

        super();

        this.keytar = this._electronService.remote.require('keytar');
        this.tracked = this._electronService.tokenMonit().subscribe((list) => {
            this._zone.run(() => {
                this.tokenIsMissing = !list.args[0];  // always true/false
            });
        });
        this.tracked = this._electronService.dockerMonit().subscribe((list) => {
            this._zone.run(() => {
                this.dockerMonit = list.args[0];  // either false when docker is not running or object with docker statistics (could be also {})
                this.isDockerUp = !!this.dockerMonit;
            });
        });
        this.subscribeUpdates();
        this.restoreSaved();
    }

    /**
     *
     */
    private restoreSaved() {
        const m = { email: '', password: '', rememberMe: false };

        if (!this.store.has('initComplete') || !this.store.get('initComplete')) {
            this.wizardOpen = true;

            m.email = this.store.get('email', null);

            Promise.all([
                this.keytar.getPassword('scidap-satellite', 'password'),
                this.keytar.getPassword('scidap-satellite', 'token')])
                .then((d) => {
                    [m.password, this.token] = d;
                    this._loginData = m;
                }).catch((e) => {
                    console.log(e);
                });

        } else {

            this.keytar.getPassword('scidap-satellite', 'token')
                .then((token) => {
                    this.token = token;
                }).catch((e) => {
                    console.log(e);
                });
        }

        if (this.store.has('email')) {
            m.email = this.store.get('email');
        }

        if (this.store.has('rememberMe')) {
            m.rememberMe = this.store.get('rememberMe');
            if (m.rememberMe) {
                this._loginData = m;
            }
        }

        if (this.store.has('airflowSettings')) {
            this._airflowSettings = this.store.get('airflowSettings');
        }

        if (this.store.has('satelliteSettings')) {
            this._satelliteSettings = this.store.get('satelliteSettings');
        }
    }


    changeState(state) {
        if (this.step > parseInt(this.wizard.navService.currentPage._id, 10)) {
            this.step = parseInt(this.wizard.navService.currentPage._id, 10);
        }
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
        if (this.token && this.wizard) {
            this.wizard.pageCollection.pagesAsArray.find(page => {
                if (page._id === this.pageSettings._id) {
                    return true;
                }
                page.completed = true;
                return false;
            });
            this.wizard.navService.currentPage = this.pageSettings;
        }
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

    /**
     *
     */
    doLoginOrRegister(buttonType) {
        if ('login' === buttonType) {
            if (this.skipng) {
                this.store.set('skipng', true);

                this.wizard.pageCollection.pagesAsArray.find(page => {
                    if (page._id === this.pageSettings._id) {
                        return true;
                    }
                    page.completed = true;
                    return false;
                });
                this.wizard.navService.currentPage = this.pageSettings;
            } else {
                this.store.set('skipng', false);
                this.goToLogin();
            }
        }
        if ('new-user' === buttonType) {
            this.goToNewUser();
        }
    }

    /**
     *
     */
    doLogin(runFromWizard = true) {
        if (this.loginData && this.loginData.email && this.loginData.password) {
            console.log('Login data:', this.loginData.email, this.loginData.password !== '');
            this.tracked = this._electronService.login(this.loginData.email, this.loginData.password)
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
                            if (runFromWizard) {
                                setTimeout(() => this.changeState(2), 10);
                            } else {
                                this.tracked = this._electronService.satCreateGetToken().subscribe(
                                    (token) => {
                                        if (token && !token.error) {
                                            this.keytar.setPassword('scidap-satellite', 'token', token);
                                        }
                                    }
                                );
                            }
                        });
                    });

        }
    }

    /**
     *
     * @param buttonType
     */
    doAgree(buttonType) {
        if ('cancel' === buttonType) {
            console.log('send app quit');
        }

        this.tracked = this._electronService.satCreateGetToken().subscribe(
            (token) => {
                console.log(token);
                if (token && !token.error) {
                    this.keytar.setPassword('scidap-satellite', 'token', token);
                    this.changeState(3);
                }
            }
        );
        //
    }

    /**
     *
     */
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

    /**
     *
     */
    subscribeUpdates() {
        this.tracked = this._electronService.updatesNews().subscribe(({ res, ...args }) => {
            args = args.args;

            console.log(res, args);

            if ('update-available' === res) {
                this.cogBadge = true;
                this.updateAvailable = true;
                this.menuText = 'Downloading updates';
            }

            if ('update-not-available' === res && !this.readyToInstall) {
                this.checkPressed = false;
                this.cogBadge = false;
                this.updateNotAvailable = true;
                this.menuText = 'Check for updates';
                this.doNoUpdate();
            }

            if ('download-progress' === res) {
                this._zone.run(() => {
                    [this.downloadPercent, this.downloadSpeed] = args as any;
                });
                // if (this.downloadPercent === 100 || this.downloadPercent === '100') {
                //     res = 'update-downloaded';
                //     this.showProgress = false;
                // }
            }

            if ('update-downloaded' === res) {
                this.checkPressed = false;
                this.cogBadge = true;
                this.updateAvailable = true;
                this.menuText = 'Install updates';
                this.buttonText = 'Install';
                this.readyToInstall = true;
                if (this.showProgress) {
                    this.doUpdate();
                }
                this.showProgress = false;
            }

            if ('update-error' === res) {
                this.checkPressed = false;
                this.showProgress = false;
                this.updateAvailable = true;
                this._showError = true;
                this.cogBadge = false;
                this.readyToInstall = false;
                this.menuText = 'Check for updates';
            }


        });
    }

    checkUpdates() {
        if (this.checkPressed) { return; }
        this.checkPressed = true;

        if (this.readyToInstall) {
            this._electronService.installUpdates();
        }

        if (!this.updateAvailable && !this.readyToInstall) {
            this._electronService.checkForUpdates();
        }
    }

    doUpdate() {

        if (this.readyToInstall) {
            this._electronService.installUpdates();
        } else {
            this.updateAvailable = true;
            this.cogBadge = false;
            this.showProgress = true;
        }

    }

    doNoUpdate() {
        const appVersion = this._electronService.remote.app.getVersion();
        this._electronService.remote.dialog.showMessageBox(
            {
                type: 'info',
                title: 'About',
                message: `Scientific Data Analysis Platform`,
                detail: `There are currently no updates available.\nSciDAP Satellite version ${appVersion} \n\n\u00A9 Datirium, LLC`,
                buttons: ['Ok']
            }).then((index) => {
                console.log();
            });
    }

    doAbout() {
        const appVersion = this._electronService.remote.app.getVersion();
        this._electronService.remote.dialog.showMessageBox(
            {
                type: 'info',
                title: 'About',
                message: `Scientific Data Analysis Platform`,
                detail: `SciDAP Satellite (version: ${appVersion}) delivered by Datirium, LLC`,
                buttons: ['Ok']
            }).then((index) => {
                console.log();
            });
    }

    doWebUiWindow() {
        this._electronService.webUiWindow();
    }

    // doMongoExpressWindow() {
    //     this._electronService.mongoExpressWindow();
    // }
}
