import { Component, OnInit, Output, Input, EventEmitter, AfterViewInit } from '@angular/core';
import { ElectronService } from '../../../core/services';


@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit, AfterViewInit {

  set email(v) {
    this.message = {
      ...this.message,
      email: v
    };
  }

  get email() {
    return this.message.email;
  }

  set password (v) {
    this.message = {
      ...this.message,
      password: v
    };
  }

  get password () {
    return this.message.password;
  }

  set rememberMe(v) {
    this.message = {
      ...this.message,
      rememberMe: v
    };
  }

  get rememberMe () {
    return this.message.rememberMe;
  }

  private messageValue;

  @Output()
  messageChange = new EventEmitter<any>();

  @Input('message')
  get message() {
    return this.messageValue;
  }

  set message(val) {
    this.messageValue = val;
    this.messageChange.emit(this.messageValue);
  }

  constructor(
    public _electronService: ElectronService

  ) {
  }

  ngOnInit() {
  }

  ngAfterViewInit() {
  }
}
