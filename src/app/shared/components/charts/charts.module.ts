import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { SDHighcharts } from './sdhighcharts.component';
import { SDHighchartsBoxPlot } from './sdhighchartsboxplot.component';
import { SDHighchartsLine } from './sdhighchartsline.component';
import { SDHighchartsPie } from './sdhighchartspie.component';
import { SDHighchartsScatter } from './sdhighchartsscatter.component';


@NgModule({
    declarations: [
        SDHighcharts,
        SDHighchartsBoxPlot,
        SDHighchartsLine,
        SDHighchartsPie,
        SDHighchartsScatter
    ],
    exports: [
        SDHighchartsBoxPlot,
        SDHighchartsLine,
        SDHighchartsPie,
        SDHighchartsScatter
    ],
    imports: [
        CommonModule
    ]
})
export class SciDAPChartsModule {}

