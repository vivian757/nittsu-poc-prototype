const value = (label, text, options = {}) => ({ label, kind: 'value', value: text, ...options });
const check = (label, checked = true, options = {}) => ({
  label,
  kind: 'confirm',
  checked,
  ...options,
});
const choice = (label, status, choices, options = {}) => ({
  label,
  kind: 'choice',
  status,
  choices,
  ...options,
});

export const CHECKLIST_DRIVERS = [
  '陳志明', '林建宏', '王俊傑', '張育誠', '黃柏勳', '劉冠廷',
  '李承翰', '吳宗穎', '蔡明哲', '鄭宇翔', '郭俊宏', '彭子軒',
  '周柏廷', '許家豪', '高志偉', '林冠宇', '陳建宏', '黃俊傑',
  '張家維', '吳柏翰', '李宗翰', '劉志遠', '王建成', '趙明哲',
];

const routes = [
  'MFC4-2-1', 'MFC4-3', '健生', 'DBC2-2', 'SBK2-1', 'YKK台北',
  '輸出特車', '六和鋁圈', '國瑞移倉', 'SAK1-1', 'MCC6-1', 'SDK1-1',
  'DBC2-1', 'DGC3-01-2', 'MAC4-01', 'MCC8-01', 'MCC8-04', 'SBK2-3',
  'MAC4-03', 'SBK3-1', 'MAC5-1', 'MFC4-1', 'MCC7-2', '26噸廠間車',
];

const plates = [
  '106-W9', 'KLE-3017', 'KLA-0910', 'KLC-1863', 'KLA-0929', 'KPC-8753',
  'KLP-1082', 'KLA-0917', 'KLP-2096', '939-HD', 'KLA-0918', 'KLE-3018',
  'KLJ-7609', 'KLP-3073', 'KLA-0928', 'KLE-2630', 'KLE-2631', 'LAF-688',
  'KLA-0930', 'KLA-0923', '127-ZC', '647-ZU', 'KLA-0909', 'KLP-3656',
];

const inspectors = [
  '內部員工 / 王日通',
  '內部員工 / 李承翰',
  '內部員工 / 陳怡君',
  '內部員工 / 林冠宇',
];
const plannedReportTimes = ['05:30', '06:00', '06:12', '06:30', '07:00', '07:30'];
const arrivalOffsets = [-4, null, 6, null, 8, null, -1, null];
const bloodPressures = ['118/76', '121/79', '126/82', '116/74', '132/84', '124/78', '128/80', '119/77'];

const shiftTime = (time, offset) => {
  const [hour, minute] = time.split(':').map(Number);
  const total = hour * 60 + minute + offset;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

const buildSections = ({
  seed,
  date,
  route,
  plate,
  reportTime,
  actualReportTime,
  preInspector,
  postInspector,
}) => {
  const hasReported = actualReportTime !== '-';
  const reportedValue = (text) => hasReported ? text : '';

  return [
  {
    title: '基本資料',
    readonly: true,
    items: [
      value('路線', route, { readonly: true }),
      value('車號', plate, { readonly: true }),
      value('報到時間', reportTime, { readonly: true }),
      value('實際報到時間', actualReportTime, { readonly: true }),
    ],
  },
  {
    title: '作業前點呼',
    phase: 'pre',
    items: [
      check('安全帽', hasReported, { group: '安全裝備與攜帶文件', groupVariant: 'field-label' }),
      check('反光背心', hasReported),
      check('制服', hasReported),
      check('安全鞋', hasReported),
      check('護目鏡', hasReported),
      check('身份證', hasReported),
      check('堆高機駕照', hasReported),
      check('貨車駕照', hasReported),
      check('行駛日報表', hasReported),
      check('行車紀錄紙', hasReported),
      check('鑰匙＋I-tag', hasReported),
      value('睡眠時間', reportedValue(`${7 + (seed % 3)} 小時`)),
      value('體溫', reportedValue(`${(36.2 + (seed % 5) / 10).toFixed(1)} ℃`)),
      value('血壓', reportedValue(bloodPressures[seed % bloodPressures.length])),
      value('酒測值', reportedValue('0.00 mg/L')),
      value('服藥', reportedValue('無')),
      choice('可否出車', reportedValue('可出車'), ['可出車', '不可出車']),
      value('不可出車原因／是否通報', reportedValue('-')),
      check('行照', hasReported, { group: '文件發放', groupVariant: 'field-label' }),
      check('保險卡', hasReported),
      check('油卡', hasReported),
      check('司機手冊', hasReported),
      check('通行證', hasReported),
      check('DCS', hasReported),
      value('點檢者', preInspector ?? '', { readonly: true, inspector: true }),
    ],
  },
  {
    title: '作業後點呼',
    phase: 'post',
    items: [
      check('安全裝備與鑰匙＋I-tag 繳回', hasReported, { group: '繳回品確認', groupVariant: 'field-label' }),
      check('行照、保險卡、油卡、收據繳回', hasReported),
      check('行駛日報表繳回', hasReported),
      check('行車紀錄紙繳回', hasReported),
      check('司機手冊繳回', hasReported),
      check('DCS 繳回', hasReported),
      value('作業後酒測值', reportedValue('0.00 mg/L')),
      value('點呼時間', reportedValue('17:35'), { readonly: true, autoTime: true }),
      value('點檢者', postInspector ?? '', { readonly: true, inspector: true }),
    ],
  },
  ];
};

export const updatePhaseInspector = (sections, phase, inspector) => sections.map((section) => {
  if (section.phase !== phase) return section;
  return {
    ...section,
    items: section.items.map((item) => item.inspector ? { ...item, value: inspector } : item),
  };
});

export const updatePhaseTime = (sections, phase, time) => sections.map((section) => {
  if (section.phase !== phase) return section;
  return {
    ...section,
    items: section.items.map((item) => item.autoTime ? { ...item, value: time } : item),
  };
});

export const updateActualReportTime = (sections, time) => sections.map((section) => {
  if (!section.readonly) return section;
  return {
    ...section,
    items: section.items.map((item) => item.label === '實際報到時間' ? { ...item, value: time } : item),
  };
});

export const INITIAL_CHECKLIST_RECORDS = Array.from({ length: 24 }, (_, index) => {
  const driver = CHECKLIST_DRIVERS[index % CHECKLIST_DRIVERS.length];
  const date = index < 16 ? '2026/08/12' : index < 21 ? '2026/08/11' : '2026/08/10';
  const hour = index % 3 === 0 ? '18' : '08';
  const minute = String(3 + ((index * 7) % 51)).padStart(2, '0');
  const reportTime = plannedReportTimes[index % plannedReportTimes.length];
  const arrivalOffset = arrivalOffsets[index % arrivalOffsets.length];
  const actualReportTime = arrivalOffset === null ? '-' : shiftTime(reportTime, arrivalOffset);
  const hasReported = actualReportTime !== '-';
  const preChecked = hasReported && index % 3 !== 1;
  const postChecked = hasReported && index % 4 === 0;
  const preInspector = preChecked ? inspectors[index % inspectors.length] : null;
  const postInspector = postChecked ? inspectors[(index + 1) % inspectors.length] : null;
  const route = routes[index % routes.length];
  const plate = plates[index % plates.length];

  return {
    id: `CL-${String(index + 1).padStart(3, '0')}`,
    driver,
    date,
    route,
    plate,
    reportTime,
    actualReportTime,
    updatedAt: hasReported ? `${date} ${hour}:${minute}` : '-',
    preChecked,
    postChecked,
    preInspector,
    postInspector,
    sections: buildSections({
      seed: index,
      date,
      route,
      plate,
      reportTime,
      actualReportTime,
      preInspector,
      postInspector,
    }),
  };
});
