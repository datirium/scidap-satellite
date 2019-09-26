/**
 * export class SDHighchartsScatter {}
 * @Component({
 *     selector: 'sd-highcharts-scatter',
 *     template: `<sd-highcharts [config]="_config" [data]="data" [panel]="panel"></sd-highcharts>`,
 * })
 **/
import {
    Component,
    Input
} from '@angular/core';


/**
 *
 **/
@Component({
    selector: 'sd-highcharts-scatter',
    template: `<sd-highcharts [config]="_config" [data]="data" [panel]="panel"></sd-highcharts>`,
})
export class SDHighchartsScatter {

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
            type: 'scatter'
        };
    }
}
