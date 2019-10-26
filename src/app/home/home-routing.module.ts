import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';
import { HomeComponent } from './home.component';
import { DashboardComponent } from './Dashboard/Dashboard.component';
// import { SatelliteSettingsComponent } from './SatelliteSettings/SatelliteSettings.component';
import { DashboardSettingsComponent } from './DashboardSettings/DashboardSettings.component';
// import { Aria2WebuiComponent } from './Aria2Webui/Aria2Webui.component';

const routes: Routes = [
    {
        path: 'home',
        component: HomeComponent,
        children: [
            {
                path: 'dashboard',
                component: DashboardComponent
            },
            {
                path: 'settings',
                component: DashboardSettingsComponent
            },
            // {
            //   path: 'aria2web',
            //   component: Aria2WebuiComponent
            // },
            { path: '**', redirectTo: 'dashboard' }
        ]
    }
];

@NgModule({
    declarations: [],
    imports: [CommonModule, RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class HomeRoutingModule { }
