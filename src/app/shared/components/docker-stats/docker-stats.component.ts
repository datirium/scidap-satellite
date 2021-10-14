import { Component, OnInit, Input, AfterViewInit, OnChanges, SimpleChanges } from '@angular/core';
import { chartMemUsageMBConfig, chartMemCpuUsagePercConfig } from './default-plot-config';
import { Subject } from 'rxjs';

const Highcharts = require('highcharts');
require('highcharts/highcharts-more')(Highcharts);
require('highcharts/modules/exporting')(Highcharts);
require('highcharts/modules/offline-exporting')(Highcharts);
require('highcharts/modules/bullet')(Highcharts);


@Component({
  selector: 'docker-stats',
  templateUrl: './docker-stats.component.html',
  styleUrls: ['./docker-stats.component.scss']
})
export class DockerStatsComponent implements OnInit, AfterViewInit, OnChanges {

  @Input('stats')
  stats;
  
  @Input('history')
  history = 50;

  private dataChanges: Subject<any> = new Subject();
  private chartMemUsageMB;
  private chartMemCpuUsagePerc;

  constructor() {
    this.dataChanges.subscribe(_ => this.onDataChanges(_));
  }

  ngOnInit() {
    this.chartMemUsageMB = Highcharts.chart('memUsageMB', chartMemUsageMBConfig());
    this.chartMemCpuUsagePerc = Highcharts.chart('memCpuUsagePerc', chartMemCpuUsagePercConfig());
  }

  ngAfterViewInit() {
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.dataChanges.next(changes);
  }

  /*
  * We also check for this.chartMemUsageMB && this.chartMemCpuUsagePerc, because when using this
  * component with ngIf it looks like changes may come before the component is created
  */
  onDataChanges(changes: SimpleChanges){
    if (changes && changes.stats && changes.stats.currentValue && this.chartMemUsageMB && this.chartMemCpuUsagePerc) {
      const stats = changes.stats.currentValue;
      const sumMemUsageMB = Object.values(stats).reduce((sum, {memUsageMB}) => sum + memUsageMB, 0);
      const memLimitMB = Object.values(stats).reduce((_, {memLimitMB}) => memLimitMB, 0);  // should be the same for all containers
      const sumMemUsagePerc = Object.values(stats).reduce((sum, {memUsagePerc}) => sum + memUsagePerc, 0);
      const sumCpuUsageFrac = Object.values(stats).reduce((sum, {cpuUsageFrac}) => sum + cpuUsageFrac, 0);
      let shift = false;
      if (this.chartMemUsageMB.series[0].data.length >= this.history){
        shift = true;
      }
      this.chartMemUsageMB.series[0].addPoint([(new Date()).getTime(), sumMemUsageMB], true, shift);
      this.chartMemUsageMB.yAxis[0].update({max: memLimitMB}, true);
      this.chartMemCpuUsagePerc.series[0].addPoint(['%', sumMemUsagePerc, sumMemUsagePerc], true, true, false);
      this.chartMemCpuUsagePerc.series[1].addPoint(['%', sumCpuUsageFrac, sumCpuUsageFrac], true, true, false);
    }
  }
}
