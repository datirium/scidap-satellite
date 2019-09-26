import {
    Component,
    Input
} from '@angular/core';

/**
 *
 **/
@Component({
    selector: 'sd-highcharts-boxplot',
    template: `<sd-highcharts [config]="_config" [data]="data" [panel]="panel"></sd-highcharts>`,
})
export class SDHighchartsBoxPlot {

    @Input()
    data;

    @Input()
    panel = false;

    public _config;

    @Input()
    set config(v) {
        if (!v) { return; }

        this._config = {...v};

        this._config.chart = {...this._config.chart,
            type: 'boxplot'
        };
    }
}