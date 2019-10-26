import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { ClarityModule } from '@clr/angular';

import { HomeRoutingModule } from './home-routing.module';

import { HomeComponent } from './home.component';
import { DashboardComponent } from './Dashboard/Dashboard.component';
import { DashboardSettingsComponent } from './DashboardSettings/DashboardSettings.component';
import { SatelliteSettingsComponent } from './SatelliteSettings/SatelliteSettings.component';
// import { Aria2WebuiComponent } from './Aria2Webui/Aria2Webui.component';

import { SharedModule } from '../shared/shared.module';

@NgModule({
  declarations: [
    HomeComponent,
    DashboardComponent,
    DashboardSettingsComponent,
    SatelliteSettingsComponent,
    // Aria2WebuiComponent
  ],
  imports: [
    CommonModule,
    BrowserModule,
    BrowserAnimationsModule,
    FormsModule,
    ReactiveFormsModule,
    ClarityModule,
    SharedModule, HomeRoutingModule]
})
export class HomeModule {}
