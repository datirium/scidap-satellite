import { Component, OnInit, ViewChild, NgZone } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { ClrWizard } from '@clr/angular';

import { ElectronService } from '../core/services';
import { BaseComponent } from '../core/lib/base.component';

const Store = require('electron-store');

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent extends BaseComponent implements OnInit {

  @ViewChild('wizard', { static: true }) wizard: ClrWizard;

  public form: FormGroup;
  public xlOpen = true;

  public email;
  public password;

  public showWarning = false;
  public _login = false;
  public _newuser = false;

  public store = new Store();

  _loginData = {};
  set loginData(v: any) {
    this._loginData = v;

    if (v.email) {
      this.store.set('email', v.email);
    }

    if (v.password) {
      this.store.set('password', v.password);
    }
  }

  get loginData() {
    return this._loginData;
  }

  constructor(
    private formBuilder: FormBuilder,
    private _electronService: ElectronService,
    private _zone: NgZone) {

      super();
      this.restoreSaved();
  }

  private restoreSaved() {
    const m = { email: '', password: '' };
    if (this.store.get('email')) {
      console.log(this.store.get('email'));
      m.email = this.store.get('email');
    }

    if (this.store.get('password')) {
      console.log(this.store.get('password'));
      m.password = this.store.get('password');
    }

    this._loginData = m;
  }

  public handleDangerClick(): void {
    this.wizard.finish();
  }


  public doCustomClick(buttonType: string): void {
    if ("custom-next" === buttonType) {
      this.wizard.next();
    }

    if ("custom-previous" === buttonType) {
      this.wizard.previous();
    }

    if ("custom-danger" === buttonType) {
      this.showWarning = true;
    }
  }
  ngOnInit() {
  }

  goToLogin() {
    this._login = true;
    this._newuser = false;
    this.wizard.next();
  }

  goToNewUser() {
    this._login = false;
    this._newuser = true;
    this.wizard.next();
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
      console.log(this.loginData);
      this._electronService.login(this.loginData.email, this.loginData.password).subscribe(
        (er) => {
          this._zone.run(() => {
            if (!er) {
              console.log('logged in!');
              this._showError = false;
              this._submitting = false;
              this.wizard.next();
              return;
            }
            if (er['error'] === 1000) {
              // let self = this;
              console.log('email is not verified');
              // this._dialogService
              //   .openConfirm({
              //     title: 'Email has not been verified!',
              //     message: "Would you like to repeat verification email?",
              //     acceptButton: "Repeat email"
              //   })
              //   .afterClosed()
              //   .subscribe((accept: boolean) => {
              //     if (accept) {
              //       self._accounts
              //         .sendVerificationEmail(self.loginForm.controls['email'].value)
              //         .then(() => self._submitting = false);
              //     }
              //   });

            } else {
              console.log({ title: 'User can\'t be logged in!', message: er.message });
              // this._dialogService.openAlert({ title: "User can't be logged in!", message: er.message });
            }
            this._submitting = false;
          });
        });

    }
  }
}
