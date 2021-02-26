export const chartMemUsageMBConfig = () => (
  {
    chart: {
      type: 'area',
      height: 150
    },
    plotOptions: {
      series: {
          enableMouseTracking: false
      },
      area: {
        marker: {
          enabled: false
        }
    }
    },
    time: {
      useUTC: false
    },
    title: {
      text: null
    },    
    xAxis: {
      type: 'datetime',
      tickPixelInterval: 150
    },
    yAxis: {
      title: {
        text: 'Memory, MB'
      },
      plotLines: [{
        value: 0,
        width: 1,
        color: '#808080'
      }],
      min: 0,
      max: 100
    },
    legend: {
      enabled: false
    },
    exporting: {
      enabled: false
    },
    credits: {
      enabled: false
    },
    series: [
      {
        name: 'Memory',
        data: [],
        color: {
          linearGradient: { x1: 0, x2: 0, y1: 0, y2: 1 },
          stops: [
            [0, '#666ad1'],
            [1, '#d1d9ff']
          ]
        }
      }
    ]
  }
);

export const chartMemCpuUsagePercConfig = () => (
  {
    chart: {
      type: 'bullet',
      height: 150
    },
    plotOptions: {
      series: {
        enableMouseTracking: false
      }
    },
    title: {
      text: null
    },    
    xAxis: {
      title: {
        text: 'Mem & CPU'
      },
      labels: {
        enabled: false
      }
    },
    yAxis: {
      opposite: true,
      gridLineWidth: 1,
      labels: {
        format: '{value}%'
      },
      title: null,
      min: 0,
      max: 100
    },
    series: [
      {
        data: [{
          y: 0,
          target: 0
        }],
        borderWidth: 0,
        color: {
          linearGradient: { x1: 0, x2: 0, y1: 0, y2: 1 },
          stops: [
            [0, '#666ad1'],
            [1, '#FFFFFF']
          ]
        },
        targetOptions: {
          width: '120%'
        }
      },
      {
        data: [{
          y: 0,
          target: 0
        }],
        borderWidth: 0,
        color: {
          linearGradient: { x1: 0, x2: 0, y1: 0, y2: 1 },
          stops: [
            [0, '#48a999'],
            [1, '#FFFFFF']
          ]
        },
        targetOptions: {
          width: '120%'
        }
      }
    ],
    credits: {
      enabled: false
    },
    legend: {
      enabled: false
    },
    exporting: {
      enabled: false
    }
  }
);