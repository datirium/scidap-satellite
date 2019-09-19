import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { ClarityModule } from '@clr/angular';

import { TranslateModule } from '@ngx-translate/core';

import { PageNotFoundComponent, LoginComponent, SatelliteSettingsComponent } from './components/';

import { WebviewDirective } from './directives/';

@NgModule({
  declarations: [PageNotFoundComponent, WebviewDirective, LoginComponent, SatelliteSettingsComponent],
  imports: [
    CommonModule,
    BrowserModule,
    BrowserAnimationsModule,
    FormsModule,
    ReactiveFormsModule,
    ClarityModule,
    TranslateModule
  ],
  exports: [TranslateModule, WebviewDirective, LoginComponent, SatelliteSettingsComponent]
})
export class SharedModule {}
