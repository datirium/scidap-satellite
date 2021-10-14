import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { ClarityModule } from '@clr/angular';

import { TranslateModule } from '@ngx-translate/core';

import { MomentModule } from 'ngx-moment';
import { PageNotFoundComponent, LoginComponent, BytesPipe, DockerStatsComponent } from './components/';

import { WebviewDirective } from './directives/';

@NgModule({
  declarations: [PageNotFoundComponent, WebviewDirective, LoginComponent, BytesPipe, DockerStatsComponent],
  imports: [
    CommonModule,
    BrowserModule,
    BrowserAnimationsModule,
    FormsModule,
    ReactiveFormsModule,
    ClarityModule,
    TranslateModule,
    MomentModule
  ],
  exports: [TranslateModule, MomentModule, WebviewDirective, LoginComponent, BytesPipe, DockerStatsComponent]
})
export class SharedModule {}
