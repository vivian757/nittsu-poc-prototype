const value = (label, text, options = {}) => ({ label, kind: 'value', value: text, ...options });
const check = (label, status = '正常') => ({ label, kind: 'check', status });

export const CHECKLIST_DRIVERS = [
  '陳志明', '林建宏', '王俊傑', '張育誠', '黃柏勳', '劉冠廷',
  '李承翰', '吳宗穎', '蔡明哲', '鄭宇翔', '郭俊宏', '彭子軒',
];

export const CHECKLIST_TEMPLATE = [
  {
    title: '基本資料',
    items: [
      value('客戶', '台灣日通物流股份有限公司'),
      value('作業班別', '上班點檢'),
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

const cloneSections = (seed, abnormal, date, plate) => CHECKLIST_TEMPLATE.map((section, sectionIndex) => ({
  ...section,
  items: section.items.map((item, itemIndex) => {
    if (item.label === '日期') return { ...item, value: date };
    if (item.label === '車號') return { ...item, value: plate };
    if (item.kind === 'check' && abnormal && sectionIndex === 1 && itemIndex === (seed % 6)) {
      return { ...item, status: '異常', note: seed % 2 ? '已通報主管，待確認處理方式' : '已安排回場檢查' };
    }
    if (item.kind === 'check' && (seed + itemIndex) % 13 === 0) return { ...item, status: '不適用' };
    if (item.label.startsWith('胎紋')) return { ...item, value: `${(2.4 + (seed % 12) / 10).toFixed(1)} mm` };
    return { ...item };
  }),
}));

const plates = ['NXA-1023', 'NXA-2087', 'NXA-3155', 'NXA-4072', 'NXA-5188', 'NXA-6210', 'NXA-7304', 'NXA-8416'];
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
  return {
    id: `CL-${String(index + 1).padStart(3, '0')}`,
    driver,
    date,
    reportTime: plannedReportTimes[index % plannedReportTimes.length],
    actualReportTime,
    updatedAt: `${date} ${hour}:${minute}`,
    reviewed: actualReportTime !== '-' && (index % 4 === 2 || index % 7 === 0),
    abnormal,
    inspector: inspectors[index % inspectors.length],
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
