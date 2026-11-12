export default {
  alertTitle: '告警列表样例',
  profileTitle: '样例点位廓线',
  updated: '更新时间',
  selectedTime: '选中时间',
  colHeight: '高度',
  colType: '报警类型',
  colLevel: '警报等级',
  alertEmpty: '暂无告警',
  tileUrl: '瓦片地址',
  sectionHint: '垂面解析已开启，单击地图选取廓线点',
  deviceMark: '设备',
  alertHeightMissing: '无法识别该告警的高度',
  alertTypeMissing: '无法识别该告警的类型',
  alertHeightUnavailable: '高度 {height} m 不在当前可选高度层中',
    tooltip: {
    height: '高度',
    speed: '风速',
    direction: '风向',
    missing: '缺测',
    warnType: '报警类型',
    warnLevel: '报警等级',
    warnValue: '报警值'
  },
  histogram: {
    title: '风速分布',
    speed: '风速',
    frequency: '频率',
    empty: '当前高度没有可统计的风速'
  },
  ruler: {
    height: '高度 (m)',
    east: '东西向 (km)',
    north: '南北向 (km)'
  },
  legend: {
    title: '色标配置',
    range: '数值范围',
    min: '最小',
    max: '最大',
    mode: '断档方式',
    uniform: '均分断档',
    manual: '手动断档',
    presets: '预设色条',
    colors: '色条',
    cancel: '取消',
    confirm: '确定',
    invalidRange: '最大值必须大于最小值',
    invalidStops: '断档必须从小到大',
    invalidColor: '请为每一档选择颜色',
    presetNames: {
      spectrum: '蓝-绿-黄-橙-红',
      coldWarm: '冷-暖',
      greenYellow: '绿-黄',
      grayscale: '灰阶',
      hikvision: '海康蓝',
      turbo: 'Turbo'
    }
  },
  types: {
    gale: '大风',
    shearH: '水平切变',
    shearV: '垂直切变'
  },
  levels: {
    light: '轻度',
    medium: '中度',
    severe: '重度'
  }
}
