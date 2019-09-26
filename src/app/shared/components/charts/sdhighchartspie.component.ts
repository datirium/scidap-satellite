/**
 * export class SDHighchartsPie {}
 * @Component({
 *     selector: 'sd-highcharts-pie',
 *     template: `<sd-highcharts [config]="_config" [data]="data" [panel]="panel"></sd-highcharts>`,
 * })
 **/
import {
    Component,
    Input
} from '@angular/core';


export const PIECOLORS = ['#b3de69', '#99c0db', '#fb8072', '#fdc381'];

const PIE_CONFIG = {
    "chart": {
        type: 'pie',
        width: 120,
        height: 120,
        backgroundColor: null,
        skipClone: true
    },
    tooltip: {
        pointFormat: '<b>{point.percentage:.2f}%</b>'
    },
    plotOptions: {
        pie: {
            allowPointSelect: false,
            animation: false,
            cursor: 'pointer',
            dataLabels: {
                padding: 0,
                format: '{point.percentage:.0f}%',
                style: {"color": "contrast", "fontSize": "8px", "fontWeight": "bold", "textOutline": "none" },
                distance: -15,
                verticalAlign: 'middle',
                enabled: true
            },
            showInLegend: false
        }
    },
    title: {"text": ""},
    subtitle: {"text": ""},
    exporting: {"enabled": false},
    series: [{
        "data": []
    }],
    legend: {"enabled": false},
    credits: {"enabled": false},
    colors: PIECOLORS
};

/**
 *
 **/
@Component({
    selector: 'sd-highcharts-pie',
    template: `<sd-highcharts [config]="_config" [data]="data" [panel]="panel"></sd-highcharts>`,
})
export class SDHighchartsPie {

    @Input()
    data;

    @Input()
    panel = false;

    public _config;
    @Input()
    set config(v) {
        if (!v) { return; }

        this._config = {...PIE_CONFIG, ...v};

        this._config.credits = {...this._config.credits,
            enabled: false
        };

        this._config.chart = {...this._config.chart,
            type: 'pie'
        };
    }
}
