import { Injectable } from '@angular/core';

// If you import a module but never use any of the imported values other than as TypeScript types,
// the resulting javascript file will look as if you never imported the module at all.
import { ipcRenderer, webFrame, remote } from 'electron';
import * as childProcess from 'child_process';
import * as fs from 'fs';
import { Tracking } from '../../lib/tracking';
declare let ServiceConfiguration: any;

import { of as observableOf, BehaviorSubject, Observable, Subject, bindCallback, Subscriber } from 'rxjs';

import { debounceTime, filter, map, catchError } from 'rxjs/operators';

const Store = require('electron-store');
const store = new Store();

declare var __meteor_runtime_config__;

export const Labs: Mongo.Collection<any> = new Mongo.Collection<any>('labs');

export interface LoginOptions {
    usernameOrEmail?: any;
    password?: string;
    requestPermissions?: Array<string>;
    loginStyle?: string;
    loginUrl?: string;
    clientId?: string;
}

export let AuthProvider = {
    FACEBOOK: 'facebook',
    GOOGLE: 'google',
    TWITTER: 'twitter',
    GITHUB: 'github',
    PASSWORD: 'password',
    SCIDAP: 'scidap',
    SCIDAPSATELLITE: 'scidapsatellite'
};

export let _AuthProvider = {
    'facebook': 'loginWithFacebook',
    'google': 'loginWithGoogle',
    'twitter': 'loginWithTwitter',
    'github': 'loginWithGithub',
    'password': 'loginWithPassword',
    'scidapsatellite': 'loginWithScidapSatellite',
    'scidap': 'loginWithSciDAP'
};

@Injectable({
    providedIn: 'root'
})
export class ElectronService extends Tracking {
    ipcRenderer: typeof ipcRenderer;
    webFrame: typeof webFrame;
    remote: typeof remote;
    childProcess: typeof childProcess;
    shell;
    fs: typeof fs;
    currentUser;
    currentUserId;
    currentUserProfile = {};

    get isElectron() {
        return window && window.process && window.process.type;
    }

    constructor() {
        super();
        // Conditional imports
        if (this.isElectron) {
            this.ipcRenderer = window.require('electron').ipcRenderer;
            this.webFrame = window.require('electron').webFrame;
            this.remote = window.require('electron').remote;
            this.shell = window.require('electron').shell;

            this.childProcess = window.require('child_process');
            this.fs = window.require('fs');
        }
    }



    /**
   *
   * @param {string} provider - "google", "facebook", ...
   * @param {LoginOptions} loginOptions {password:"", usernameOrEmail:""}
   * @returns {Observable<any>}
   */
    loginWith(provider: string, loginOptions?: LoginOptions): Observable<any> {

        const options = loginOptions || {};
        const errorMsg = `[AccountsService]: accounts-${provider} pkg is not installed`;

        if (!this.isProvider(provider) &&
            provider !== AuthProvider.SCIDAP &&
            provider !== AuthProvider.PASSWORD) {
            throw new Error(errorMsg);
        }

        if (provider === AuthProvider.SCIDAP) {
            const scidapObservable = bindCallback(function (callback) {
                Accounts['callLoginMethod']({
                    methodArguments: [{ email: options['usernameOrEmail'], pass: options['password'], scidap: true }],
                    userCallback: callback
                } as any);
            });
            return scidapObservable();
        }

        const accountObservable: any = bindCallback(Meteor[_AuthProvider[provider]]);

        if (provider === AuthProvider.PASSWORD) {
            return accountObservable(options['usernameOrEmail'], options['password']);
        }

        return accountObservable({ ...this._getDefaultOptions(provider), ...options });
    }

    isProvider(provider: string) {
        const c = ServiceConfiguration.configurations.findOne({ service: provider });
        return Meteor[_AuthProvider[provider]] && c;
    }

    /**
     *
     * @param {string} email
     * @param {string} password
     * @param {boolean} corp
     * @returns {Observable<any>}
     */
    login(email: string, password: string, corp = false): Observable<any> {
        if (corp) {
            return this.loginWith(AuthProvider.SCIDAP, { usernameOrEmail: email, password: password, loginStyle: '' });
        } else {
            return this.loginWith(AuthProvider.PASSWORD, { usernameOrEmail: { email: email }, password: password, loginStyle: '' });
        }
    }

    private _getDefaultOptions(provider: string): LoginOptions {
        const loginOptions = <LoginOptions>({ loginStyle: 'popup' }); // popup, redirect

        if (provider !== AuthProvider.TWITTER) {
            loginOptions.requestPermissions = ['email'];
        }

        if (provider === AuthProvider.GOOGLE) {
            loginOptions.requestPermissions.push(
                'https://www.googleapis.com/auth/drive.file',
                'https://www.googleapis.com/auth/plus.me',
                'https://www.googleapis.com/auth/plus.login',
                'https://www.googleapis.com/auth/userinfo.profile',
                'https://www.googleapis.com/auth/drive.readonly'
            ); // 'aboutMe,birthday,emails,name,organizations,verified'
        }
        if (provider === AuthProvider.GITHUB) {
            loginOptions.requestPermissions.push('public_repo', 'repo');
        }
        if (provider === AuthProvider.FACEBOOK) {
            loginOptions.requestPermissions.push('user_likes');
        }
        return loginOptions;
    }

    /**
     *  Initial subscription to account profile
     * @returns {Observable<any>}
     */
    public profileSubscribe(): Observable<any> {
        return this.MeteorSubscribeAutorun('accounts/profile', () => {
            this.currentUser = Meteor.user();
            this.currentUserId = Meteor.userId();
            if (this.currentUser) {
                this.currentUserProfile = this.currentUser['profile'];
            }

            if (this.currentUserProfile['picture'] && !this.currentUserProfile['picture'].startsWith('https://')) {
                this.currentUserProfile['picture'] = __meteor_runtime_config__.ROOT_URL + this.currentUserProfile['picture'];
            }

            return this.currentUser;
        });
    }

    /**
     *  Initial subscription to labs
     * @returns {Observable<any>}
     */
    public labSubscribe(): Observable<any> {
        return this.MeteorSubscribeAutorun('lab/owned', () => {
            const lab = Labs.findOne({});
            console.log(lab);
            return lab;
        });
    }

    /**
     *  Either gets token or creates satellite
     * @returns {Observable<any>}
     */
    public satCreateGetToken(): Observable<any> {
        return this.MeteorCall('satellite/create/private');
    }

    webUiWindow() {
        this.ipcRenderer.send('webui-window');
    }

    mongoExpressWindow() {
        this.ipcRenderer.send('mongo-express-window');
    }


    installUpdates() {
        this.ipcRenderer.send('quit-and-install');
    }

    checkForUpdates() {
        this.ipcRenderer.send('checking-for-update');
    }

    updatesNews() {
        return Observable.create((observer: Subscriber<any>) => {

            this.ipcRenderer.on('update-available', (d, ...args) => {
                observer.next({ res: 'update-available' });
            });

            this.ipcRenderer.on('update-not-available', (d, ...args) => {
                observer.next({ res: 'update-not-available' });
            });

            this.ipcRenderer.on('update-downloaded', (d, ...args) => {
                observer.next({ res: 'update-downloaded', args: args });
            });

            this.ipcRenderer.on('update-error', (d, ...args) => {
                observer.next({ res: 'update-error', args: args });
            });

            this.ipcRenderer.on('download-progress', (d, ...args) => {
                observer.next({ res: 'download-progress', args: args });
            });



            return () => {
                this.ipcRenderer.removeAllListeners('update-available');
                this.ipcRenderer.removeAllListeners('update-not-available');
                this.ipcRenderer.removeAllListeners('update-downloaded');
                this.ipcRenderer.removeAllListeners('update-error');
                this.ipcRenderer.removeAllListeners('download-progress');
                observer.complete();
            };
        });
    }

    openExternal(url) {
        this.shell.openExternal(url);
    }

}
