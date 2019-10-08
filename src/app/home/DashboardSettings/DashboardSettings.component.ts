import { Component, OnInit } from '@angular/core';
import { ElectronService } from '../../core/services';

@Component({
  selector: 'app-dashboard-settings',
  templateUrl: './DashboardSettings.component.html',
  styleUrls: ['./DashboardSettings.component.scss']
})
export class DashboardSettingsComponent implements OnInit {

  initInProgress;
  constructor(
    public _electronService: ElectronService,
  ) { }

  ngOnInit() {
  }

  saveAndRestart() {
    this._electronService.ipcRenderer.send('restart-programs');
  }
}
