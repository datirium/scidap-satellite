export const chartMemUsageMBConfig = () => (
  {
    chart: {
      type: 'area',
      height: 120
    },
    title: {
      text: null
    },
    time: {
      useUTC: false
    },    
    plotOptions: {
      area: {
        marker: {
          enabled: false
        }
      },
      series: {
        enableMouseTracking: false
      }
    },
    xAxis: {
      type: 'datetime',
      tickPixelInterval: 150
    },
    yAxis: {
      title: {
        text: 'Memory, MB'
      },
      min: 0,
      max: 100
    },
    series: [
      {
        name: 'Memory',
        color: {
          linearGradient: { x1: 0, x2: 0, y1: 0, y2: 1 },
          stops: [
            [0, '#666ad1'],
            [1, '#d1d9ff']
          ]
        },
        data: []
      }
    ],
    legend: {
      enabled: false
    },
    exporting: {
      enabled: false
    },
    credits: {
      enabled: false
    }
  }
);

export const chartMemCpuUsagePercConfig = () => (
  {
    chart: {
      type: 'bullet',
      height: 120
    },
    title: {
      text: null
    },
    plotOptions: {
      area: {
        marker: {
          enabled: false
        }
      },
      series: {
        enableMouseTracking: false
      }
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
      title: null,
      min: 0,
      max: 100,
      labels: { format: '{value}%' },
      opposite: true
    },
    series: [
      {
        color: {
          linearGradient: { x1: 0, x2: 0, y1: 0, y2: 1 },
          stops: [
            [0, '#666ad1'],
            [1, '#FFFFFF']
          ]
        },
        targetOptions: {
          width: '120%'
        },
        data: [
          {
            y: 0,
            target: 0
          }
        ]
      },
      {
        color: {
          linearGradient: { x1: 0, x2: 0, y1: 0, y2: 1 },
          stops: [
            [0, '#48a999'],
            [1, '#FFFFFF']
          ]
        },
        targetOptions: {
          width: '120%'
        },
        data: [
          {
            y: 0,
            target: 0
          }
        ]
      }
    ],
    legend: {
      enabled: false
    },
    exporting: {
      enabled: false
    },
    credits: {
      enabled: false
    }
  }
);