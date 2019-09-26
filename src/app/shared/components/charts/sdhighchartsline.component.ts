/**
 * export class SDHighchartsLine {}
 * @Component({
 *    selector: 'sd-highcharts-line',
 *    template: `<sd-highcharts [config]="config" [data]="data"></sd-highcharts>`,
 * })
 **/
import {
    Component,
    Input,
    OnInit
} from '@angular/core';

@Component({
    selector: 'sd-highcharts-line',
    template: `<sd-highcharts [config]="_config" [data]="data" [panel]="panel"></sd-highcharts>`,
})
export class SDHighchartsLine {

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
            type: 'line'
        };
    }
}
