const value = (label, text, options = {}) => ({ label, kind: 'value', value: text, ...options });
const check = (label, status = '正常') => ({ label, kind: 'check', status });

export const CHECKLIST_DRIVERS = [
  '陳志明', '林建宏', '王俊傑', '張育誠', '黃柏勳', '劉冠廷',
  '李承翰', '吳宗穎', '蔡明哲', '鄭宇翔', '郭俊宏', '彭子軒',
  '周柏廷', '許家豪', '高志偉', '林冠宇', '陳建宏', '黃俊傑',
  '張家維', '吳柏翰', '李宗翰', '劉志遠', '王建成', '趙明哲',
];

export const CHECKLIST_TEMPLATE = [
  {
    title: '基本資料',
    items: [
      value('客戶', '台灣日通物流股份有限公司'),
      value('車號', 'NXA-1023'),
      value('日期', '2026/08/12', { readonly: true }),
    ],
  },
  {
    title: '車輛',
    items: [
      check('5 油（燃料油、變速箱油、引擎油、煞車油、動力方向機油）'),
      check('3 水（水箱水、雨刷水、電瓶水）'),
      check('煞車作動'),
      value('胎紋（記錄數值，≥ 1.6 mm）', '3.2 mm'),
      value('胎壓（單位：PSI）', '左前 110 / 右前 111 / 後輪 115'),
      check('大燈、煞車燈及方向燈'),
      check('雨刷及擋風玻璃'),
      check('滅火器（效期、壓力）'),
      check('三角錐與車載安全裝備'),
    ],
  },
  {
    title: '板架',
    items: [
      check('蜂鳴器連接器、卡榫接頭及線路'),
      check('胎紋、胎壓外觀'),
      check('氣源接頭與電源接頭'),
      check('方向燈及煞車燈'),
    ],
  },
  {
    title: '其他',
    items: [
      check('駕駛執照與相關證照'),
      check('安全帽、防護衣與反光背心'),
      check('車身外觀及標示'),
      value('酒測 / 血壓紀錄', '酒測 0.00 mg/L / 血壓 120/80'),
    ],
  },
];

const abnormalTargets = [
  [1, 0], [1, 2], [1, 5], [1, 6], [1, 7],
  [2, 0], [2, 1], [2, 2], [2, 3], [3, 1], [3, 2],
];
const bloodPressures = ['118/76', '121/79', '126/82', '116/74', '132/84', '124/78', '128/80', '119/77'];

const cloneSections = (seed, abnormal, date, plate) => CHECKLIST_TEMPLATE.map((section, sectionIndex) => ({
  ...section,
  items: section.items.map((item, itemIndex) => {
    if (item.label === '日期') return { ...item, value: date };
    if (item.label === '車號') return { ...item, value: plate };
    const abnormalTarget = abnormalTargets[seed % abnormalTargets.length];
    if (item.kind === 'check' && abnormal && sectionIndex === abnormalTarget[0] && itemIndex === abnormalTarget[1]) {
      return { ...item, status: '異常' };
    }
    if (item.kind === 'check' && sectionIndex === 2 && (seed + itemIndex) % 4 === 0) return { ...item, status: '不適用' };
    if (item.label.startsWith('胎紋（記錄數值')) {
      return { ...item, value: `${(2.4 + (seed % 13) / 10).toFixed(1)} mm` };
    }
    if (item.label.startsWith('胎壓（單位')) {
      const left = 108 + (seed % 7);
      const right = 109 + ((seed * 2) % 7);
      const rear = 113 + ((seed * 3) % 8);
      return { ...item, value: `左前 ${left} / 右前 ${right} / 後輪 ${rear}` };
    }
    if (item.label === '酒測 / 血壓紀錄') {
      return { ...item, value: `酒測 0.00 mg/L / 血壓 ${bloodPressures[seed % bloodPressures.length]}` };
    }
    return { ...item };
  }),
}));

const plates = [
  'NXA-1023', 'NXA-2087', 'NXA-3155', 'NXA-4072', 'NXA-5188', 'NXA-6210',
  'NXA-7304', 'NXA-8416', 'NXA-9501', 'NXA-3891', 'NXA-4620', 'NXA-6835',
  'NXA-7742', 'NXA-8264', 'NXA-9073', 'NXA-2348', 'NXA-3567', 'NXA-4196',
  'NXA-5421', 'NXA-6580', 'NXA-7193', 'NXA-8352', 'NXA-9684', 'NXA-2876',
];
const inspectors = ['王日通', '李承翰', '陳怡君', '林冠宇'];
const plannedReportTimes = ['07:30', '07:45', '08:00', '08:15', '16:30', '17:00'];
const actualReportTimes = ['07:26', '-', '07:58', '08:12', '16:38', '-', '07:51', '16:55'];

export const INITIAL_CHECKLIST_RECORDS = Array.from({ length: 24 }, (_, index) => {
  const driver = CHECKLIST_DRIVERS[index % CHECKLIST_DRIVERS.length];
  const date = index < 16 ? '2026/08/12' : index < 21 ? '2026/08/11' : '2026/08/10';
  const hour = index % 3 === 0 ? '18' : '08';
  const minute = String(3 + ((index * 7) % 51)).padStart(2, '0');
  const abnormal = index % 6 === 1 || index % 9 === 4;
  const actualReportTime = actualReportTimes[index % actualReportTimes.length];
  const hasReported = actualReportTime !== '-';
  const reviewed = hasReported && (index % 4 === 2 || index % 7 === 0);
  return {
    id: `CL-${String(index + 1).padStart(3, '0')}`,
    driver,
    date,
    reportTime: plannedReportTimes[index % plannedReportTimes.length],
    actualReportTime,
    updatedAt: hasReported ? `${date} ${hour}:${minute}` : '-',
    reviewed,
    abnormal,
    inspector: reviewed ? inspectors[index % inspectors.length] : null,
    sections: cloneSections(index, abnormal, date, plates[index % plates.length]),
  };
});

export const blankChecklistSections = (date) => CHECKLIST_TEMPLATE.map((section) => ({
  ...section,
  items: section.items.map((item) => {
    if (item.label === '日期') return { ...item, value: date };
    if (item.kind === 'check') return { ...item, status: '正常', note: undefined };
    return { ...item, value: item.readonly ? item.value : '' };
  }),
}));
