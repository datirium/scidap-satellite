
import {
    Component,
    Input,
    ViewChild,
    SimpleChange,
    Output,
    EventEmitter, AfterViewInit, OnDestroy, ElementRef
} from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

import { BaseComponent } from '../../../core/lib/base.component';

const Highcharts = require('highcharts');
require('highcharts/highcharts-more')(Highcharts);
require('highcharts/modules/exporting')(Highcharts);
require('highcharts/modules/offline-exporting')(Highcharts);

/**
 *
 **/
@Component({
    selector: 'sd-highcharts',
    template: `
    <!--<div [class.panel]="panel" [class.panel-white]="panel">-->
    <div #highcharts ></div>
    <!--</div>-->
  `,
  host: {
      "class": 'push-right-xs'
    //   "style": "min-height: 66vh;"
  }
})
export class SDHighcharts extends BaseComponent implements AfterViewInit, OnDestroy {
    private _buildChart = new Subject();

    public _config;
    private _configPassed;

    private chart = null;
    private _data;

    private configLoad;

    @ViewChild('highcharts', {static: true})
    private highcharts;

    @Output()
    load: EventEmitter<any> = new EventEmitter();

    @Input()
    panel = true;

    @Input()
    set config(v) {
        if (!v) { return; }

        this._config = {...v};
        this._config.chart = {...v.chart};

        if (v.series && v.series.length > 0) {
            this._config.series = [...v.series];
            this._data = true;
        } else {
            this._config.series = [];
        }

        if ( typeof this._config.rebuild === 'undefined') {
            this._config.rebuild = true;
        }

        if (!this._config.chart.events) {
            this._config.chart.events = {};
        } else {
            this._config.chart.events = {...v.chart.events};
        }

        if ( typeof this._config.chart.events.load === 'function') {
            this.configLoad = this._config.chart.events.load;
        }
        this._config.chart.events.load = (e) => { this.onHighchartsLoad(e); };
        this._config.chart.renderTo = this.highcharts.nativeElement;

        this._buildChart.next();
    }

    @Input()
    set data(v) {
        if (!v) { return; }

        if (!this._config || !this._config.series) { return; }

        v.forEach((d, i) => {
            // this.chart.series[i].setData(d);
            this._config.series[i].data = d;
        });
        // console.log(this._config);
        this._data = v;
        this._buildChart.next();
    }

    constructor(
        private elementRef: ElementRef
    ) {
        super();
        this.configLoad = () => { };
        this.tracked = this._buildChart.asObservable().pipe(debounceTime(100)).subscribe((a) => this.buildChart(a));
    }

    ngAfterViewInit() {
        if (!this._config || !this._config.chart) {
            throw new Error('No chart data');
        }
        this._config.chart.renderTo = this.highcharts.nativeElement;
        // resize work around
        this._buildChart.next();
    }

    public ngOnDestroy() {
        // super.ngOnDestroy();
        // this.chart.destroy();
    }

    onHighchartsLoad(e) {
        if (!e) { return; }

        try {
            this.configLoad();
        } catch (er) {
            console.log(er);
        }
        this.load.emit(e);
    }

    buildChart(a) {
        if (!this._config || !this._config.chart.renderTo) { return; }

        if (this.chart && this._config.rebuild) {
            this.chart.hideLoading();
        }
        if (this.chart) {
            this.chart.destroy();
        }

        this.chart = new Highcharts.Chart(this._config);
        if (!this._data && this._config.rebuild) {
            this.chart.showLoading();
        }
    }
}
