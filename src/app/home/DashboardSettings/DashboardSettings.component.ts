import { Component, OnInit, ViewChild } from '@angular/core';
import { ElectronService } from '../../core/services';

import { SatelliteSettingsComponent } from '../SatelliteSettings/SatelliteSettings.component';
@Component({
  selector: 'app-dashboard-settings',
  templateUrl: './DashboardSettings.component.html',
  styleUrls: ['./DashboardSettings.component.scss']
})
export class DashboardSettingsComponent implements OnInit {

  @ViewChild('satelliteSettings') satelliteSettings: SatelliteSettingsComponent;

  initInProgress;
  constructor(
    public _electronService: ElectronService,
  ) { }

  ngOnInit() {
  }

  saveAndRestart() {
    this.satelliteSettings.doSave();
    this._electronService.ipcRenderer.send('restart-programs');
  }
}
