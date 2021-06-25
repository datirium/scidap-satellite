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

  restartInProgress = false;
  constructor(
    public _electronService: ElectronService,
  ) { }

  ngOnInit() {
  }

  saveAndRestart() {
    this.restartInProgress = true;
    this.satelliteSettings.doRestart().then((v) => {
        console.log('restart-programs response', v);
        this.restartInProgress = false;
        if (v[0] !== 'complete') {
            console.log('Error in restart');
        }
    });
  }

}
