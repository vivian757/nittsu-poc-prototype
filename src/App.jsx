import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Polyline, TileLayer, Tooltip as LeafletTooltip, useMap, ZoomControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Alert,
  Badge,
  Box,
  Button,
  Checkbox,
  Chip,
  Collapse,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Fab,
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  Snackbar,
  Slider,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  AccessTimeRounded,
  AddRounded,
  ArrowForwardRounded,
  AssignmentOutlined,
  CalendarTodayRounded,
  CheckCircleRounded,
  ChevronLeftRounded,
  CloseFullscreenRounded,
  CloseRounded,
  DashboardRounded,
  DragIndicatorRounded,
  EditOutlined,
  KeyboardArrowUpRounded,
  LocalShippingRounded,
  LocationOnOutlined,
  MapOutlined,
  MenuRounded,
  MoreTimeRounded,
  NotificationsNoneRounded,
  OpenInFullRounded,
  PendingActionsOutlined,
  PinDropOutlined,
  RefreshRounded,
  RouteRounded,
  SearchRounded,
  SettingsOutlined,
  ViewTimelineOutlined,
  WarningAmberOutlined,
  WarningRounded,
} from '@mui/icons-material';
import ChecklistManagementPage from './ChecklistManagementPage';

const START_HOUR = 6;
const END_HOUR = 20;
const HOUR_COUNT = END_HOUR - START_HOUR;
const NOW_HOUR = 14.5;
// Prototype assumption: arrival within +/- 5 minutes is treated as on time.
// Keep this configurable until the customer confirms the operational threshold.
const ON_TIME_TOLERANCE_MINUTES = 5;
const MAX_STATION_DURATION_HOURS = 2;
const RESOURCE_MENU_MAX_HEIGHT = 320;
const TIMELINE_SCALE_OPTIONS = [5, 10, 15, 30, 60];
const TIMELINE_WIDTH_PERCENT_BY_SCALE = {
  5: 240,
  10: 190,
  15: 160,
  30: 130,
  60: 100,
};
const ASSIGNMENT_LOADING_DURATION_MS = 1800;
const POST_ASSIGNMENT_DIALOG_DELAY_MS = 1200;
const hourMarks = Array.from({ length: HOUR_COUNT + 1 }, (_, index) => START_HOUR + index);

const statusMeta = {
  early: { label: '提早', color: '#2F73C8', bg: '#EAF3FF' },
  ontime: { label: '準時', color: '#1F8A5B', bg: '#E7F5EE' },
  running: { label: '執行中', color: '#607085', bg: '#EEF2F6' },
  delayed: { label: '延遲', color: '#B73544', bg: '#FDECEF' },
  ready: { label: '待出發', color: '#607085', bg: '#EEF2F6' },
  offline: { label: '資訊中斷', color: '#7B5A9B', bg: '#F3ECF9' },
  done: { label: '已完成', color: '#177349', bg: '#E7F5EE' },
};

const timelineActualStatusMeta = {
  ...statusMeta,
  early: { ...statusMeta.early, color: '#286EC3', bg: '#DDEBFA' },
  ontime: { ...statusMeta.ontime, color: '#91A1B2', bg: '#DCE4EC' },
  delayed: { ...statusMeta.delayed, color: '#BB3044', bg: '#F8DFE4' },
};

const baseVehicles = [
  {
    id: 'NXA-1023',
    driver: '陳志明',
    routeName: 'MAC4',
    trip: '4',
    position: [24.8884, 121.0128],
    area: '新竹',
    status: 'running',
    gps: '14:28',
    todayWork: '7 小時 25 分',
    load: 62,
    tasks: [
      { id: 'MAC4-1', label: 'MAC4-1 牛奶便', station: '中發', address: '新竹縣湖口鄉四維路3號', start: 6.5, end: 10.2, state: 'ontime' },
      { id: 'MAC4-4', label: 'MAC4-4 牛奶便', station: '中精', address: '新竹縣湖口鄉光復北路113號', start: 14.5, end: 18.3, state: 'ontime' },
    ],
  },
  {
    id: 'NXA-2087',
    driver: '林建宏',
    routeName: 'TYO2',
    trip: '3',
    position: [25.0342, 121.1077],
    area: '桃園',
    status: 'running',
    gps: '14:29',
    todayWork: '8 小時 55 分',
    load: 78,
    tasks: [
      { id: 'TYO2-1', label: 'TYO2-1 牛奶便', station: '台裕', address: '桃園市中壢區民族路六段360號', start: 7.1, end: 11.8, state: 'delayed', arrivalVarianceMinutes: 9, departureVarianceMinutes: 14 },
      { id: 'TYO2-3', label: 'TYO2-3 牛奶便', station: '松下', address: '桃園市觀音區寶倉街102號', start: 15.7, end: 19.3, state: 'ready' },
    ],
  },
  {
    id: 'NXA-3155',
    driver: '王俊傑',
    routeName: 'HC3',
    trip: '5',
    position: [24.9015, 121.0436],
    area: '新竹',
    status: 'running',
    gps: '14:28',
    todayWork: '8 小時 10 分',
    load: 45,
    tasks: [
      { id: 'HC3-2', label: 'HC3-2 牛奶便', station: '捷太格特', address: '新竹縣湖口鄉光復北路23號', start: 6.2, end: 9.6, state: 'ontime' },
      { id: 'HC3-5', label: 'HC3-5 牛奶便', station: '新三興', address: '新竹縣湖口鄉仁德路7號', start: 16.4, end: 19.6, state: 'ready' },
    ],
  },
  {
    id: 'NXA-4072',
    driver: '張育誠',
    routeName: 'TC5',
    trip: '2',
    position: [24.1738, 120.6181],
    area: '台中',
    status: 'delayed',
    gps: '14:27',
    load: 85,
    tasks: [
      { id: 'TC5-1', label: 'TC5-1 牛奶便', station: '建上本社', address: '台中市南屯區工業區二十六路9號', start: 7.4, end: 12.8, state: 'delayed', arrivalVarianceMinutes: 11, departureVarianceMinutes: 18 },
      { id: 'TC5-2', label: 'TC5-2 交班配送', station: '建上物流中心', address: '台中市西屯區工業區十二路12號', start: 13.8, end: 19.3, state: 'delayed', delay: 60 },
    ],
  },
  {
    id: 'NXA-5188',
    driver: '黃柏勳',
    routeName: 'TY7',
    trip: '4',
    position: [25.0478, 121.3656],
    area: '桃園',
    status: 'ready',
    gps: '13:46',
    todayWork: '7 小時 50 分',
    load: 53,
    tasks: [
      { id: 'TY7-1', label: 'TY7-1 牛奶便', station: '培林', address: '桃園市龜山區頂湖路61-1號', start: 6.8, end: 11.4, state: 'early', arrivalVarianceMinutes: -7, departureVarianceMinutes: -13 },
      { id: 'TY7-3', label: 'TY7-3 牛奶便', station: '台達電子', address: '桃園市龜山區山鶯路252號', start: 13.4, end: 16.0, state: 'running', arrivalVarianceMinutes: -12 },
      { id: 'TY7-4', label: 'TY7-4 牛奶便', station: '造隆', address: '桃園市蘆竹區光明路二段151巷10號', start: 16.2, end: 19.2, state: 'ready' },
    ],
  },
  {
    id: 'NXA-6210',
    driver: '劉冠廷',
    routeName: 'HC8',
    trip: '3',
    position: [24.8852, 121.0186],
    area: '新竹',
    status: 'ready',
    gps: '14:29',
    todayWork: '9 小時 15 分',
    load: 20,
    tasks: [
      { id: 'HC8-1', label: 'HC8-1 牛奶便', station: '台惟', address: '新竹縣湖口鄉光復路16號', start: 8.1, end: 12.1, state: 'early', arrivalVarianceMinutes: -18, departureVarianceMinutes: -6 },
      { id: 'HC8-3', label: 'HC8-3 牛奶便', station: '豐裕', address: '新竹縣湖口鄉光復路6-1號', start: 17.1, end: 19.8, state: 'ready' },
    ],
  },
  {
    id: 'NXA-7304',
    driver: '李承翰',
    routeName: 'TY9',
    trip: '2',
    position: [24.9823, 121.2524],
    area: '桃園',
    status: 'running',
    gps: '14:29',
    load: 68,
    tasks: [
      { id: 'TY9-1', label: 'TY9-1 牛奶便', station: '華通電腦', address: '桃園市蘆竹區新南路二段90號', start: 7.0, end: 11.7, state: 'ontime', arrivalVarianceMinutes: 12, departureVarianceMinutes: -7 },
      { id: 'TY9-2', label: 'TY9-2 牛奶便', station: '大同公司', address: '桃園市大園區中山南路472號', start: 12.9, end: 16.5, state: 'ontime' },
    ],
  },
  {
    id: 'NXA-8416',
    driver: '吳宗穎',
    routeName: 'HC6',
    trip: '4',
    position: [24.8167, 120.9985],
    area: '新竹',
    status: 'running',
    gps: '14:27',
    load: 72,
    tasks: [
      { id: 'HC6-2', label: 'HC6-2 牛奶便', station: '聯電', address: '新竹市東區力行二路3號', start: 7.8, end: 12.4, state: 'early', arrivalVarianceMinutes: -7, departureVarianceMinutes: -15 },
      { id: 'HC6-4', label: 'HC6-4 牛奶便', station: '力成科技', address: '新竹縣湖口鄉大同路10號', start: 13.4, end: 14.3, state: 'ontime' },
    ],
  },
  {
    id: 'NXA-9501',
    driver: '蔡明哲',
    routeName: 'TC8',
    trip: '3',
    position: [24.2104, 120.6496],
    area: '台中',
    status: 'running',
    gps: '14:26',
    load: 81,
    tasks: [
      { id: 'TC8-1', label: 'TC8-1 牛奶便', station: '矽品精密', address: '台中市潭子區大豐路三段123號', start: 6.9, end: 12.6, state: 'ontime', arrivalVarianceMinutes: -14, departureVarianceMinutes: 9 },
      { id: 'TC8-3', label: 'TC8-3 牛奶便', station: '友達光電', address: '台中市西屯區中科路1號', start: 14.0, end: 18.2, state: 'ontime' },
    ],
  },
  {
    id: 'NXA-1648',
    driver: '許家豪',
    routeName: 'MAC7',
    trip: '3',
    position: [24.8462, 121.0126],
    area: '新竹',
    status: 'running',
    gps: '14:29',
    load: 48,
    tasks: [
      { id: 'MAC7-1', label: 'MAC7-1 牛奶便', station: '光磊科技', address: '新竹市東區展業一路8號', start: 6.4, end: 10.4, state: 'ontime', arrivalVarianceMinutes: 12, departureVarianceMinutes: -8 },
      { id: 'MAC7-3', label: 'MAC7-3 牛奶便', station: '欣興電子', address: '新竹縣湖口鄉光復北路69號', start: 14.8, end: 18.5, state: 'ontime' },
    ],
  },
  {
    id: 'NXA-2763',
    driver: '周柏廷',
    routeName: 'TYO4',
    trip: '2',
    position: [25.0618, 121.2867],
    area: '桃園',
    status: 'ready',
    gps: '14:28',
    load: 36,
    tasks: [
      { id: 'TYO4-1', label: 'TYO4-1 牛奶便', station: '南亞塑膠', address: '桃園市龜山區文明路6號', start: 7.4, end: 12.0, state: 'ontime' },
      { id: 'TYO4-2', label: 'TYO4-2 牛奶便', station: '台灣山葉', address: '桃園市中壢區中華路二段3號', start: 15.0, end: 18.8, state: 'ready' },
    ],
  },
  {
    id: 'NXA-3891',
    driver: '鄭宇翔',
    routeName: 'HC9',
    trip: '4',
    position: [24.7775, 121.0089],
    area: '新竹',
    status: 'running',
    gps: '14:30',
    load: 57,
    tasks: [
      { id: 'HC9-2', label: 'HC9-2 牛奶便', station: '旺宏電子', address: '新竹市東區力行路16號', start: 6.9, end: 11.1, state: 'ontime' },
      { id: 'HC9-4', label: 'HC9-4 牛奶便', station: '世界先進', address: '新竹市東區園區三路123號', start: 13.9, end: 17.7, state: 'delayed', delay: 30 },
    ],
  },
  {
    id: 'NXA-4620',
    driver: '郭俊宏',
    routeName: 'TC3',
    trip: '3',
    position: [24.1378, 120.6734],
    area: '台中',
    status: 'running',
    gps: '14:29',
    load: 64,
    tasks: [
      { id: 'TC3-1', label: 'TC3-1 牛奶便', station: '大立光電', address: '台中市南屯區精科路11號', start: 7.2, end: 12.5, state: 'ontime' },
      { id: 'TC3-3', label: 'TC3-3 牛奶便', station: '台中精機', address: '台中市南屯區精科中二路1號', start: 13.6, end: 18.0, state: 'delayed', delay: 15 },
    ],
  },
  {
    id: 'NXA-5742',
    driver: '高志偉',
    routeName: 'TY5',
    trip: '5',
    position: [24.9537, 121.2258],
    area: '桃園',
    status: 'ready',
    gps: '14:28',
    load: 41,
    tasks: [
      { id: 'TY5-2', label: 'TY5-2 牛奶便', station: '中華汽車', address: '桃園市楊梅區秀才路618號', start: 6.6, end: 10.8, state: 'ontime' },
      { id: 'TY5-5', label: 'TY5-5 牛奶便', station: '東元電機', address: '桃園市觀音區中山路一段1568號', start: 15.5, end: 19.4, state: 'ready' },
    ],
  },
  {
    id: 'NXA-6835',
    driver: '彭子軒',
    routeName: 'MAC9',
    trip: '2',
    position: [24.9039, 121.0421],
    area: '新竹',
    status: 'running',
    gps: '14:30',
    load: 52,
    tasks: [
      { id: 'MAC9-1', label: 'MAC9-1 牛奶便', station: '群創光電', address: '新竹縣竹南鎮科學路160號', start: 7.0, end: 11.6, state: 'early', earlyMinutes: 10 },
      { id: 'MAC9-2', label: 'MAC9-2 牛奶便', station: '晶元光電', address: '新竹市東區力行五路5號', start: 13.4, end: 18.1, state: 'delayed', delay: 18 },
    ],
  },
];

const overviewVehicleSeeds = [
  { id: 'NXA-7912', driver: '林冠宇', routeName: 'TY11', trip: '3', position: [25.0291, 121.3298], area: '桃園', stations: [['廣達電腦', '桃園市龜山區文化二路188號'], ['台灣美光', '桃園市龜山區復興三路667號']] },
  { id: 'NXA-8046', driver: '陳建宏', routeName: 'HC11', trip: '4', position: [24.7894, 121.0062], area: '新竹', stations: [['台積電十二廠', '新竹市東區力行六路8號'], ['漢磊科技', '新竹市東區創新一路18號']] },
  { id: 'NXA-8257', driver: '黃俊傑', routeName: 'TC11', trip: '2', position: [24.2221, 120.6213], area: '台中', stations: [['台灣康寧', '台中市中區科園路1號'], ['巨大機械', '台中市大甲區順帆路19號']] },
  { id: 'NXA-8463', driver: '張家維', routeName: 'MAC11', trip: '5', position: [24.8675, 121.0236], area: '新竹', stations: [['瀚宇博德', '新竹縣湖口鄉光復北路59號'], ['頎邦科技', '新竹市東區力行五路3號']] },
  { id: 'NXA-8674', driver: '李哲豪', routeName: 'TY12', trip: '3', position: [24.9598, 121.2193], area: '桃園', stations: [['日月光中壢廠', '桃園市中壢區中華路一段550號'], ['國瑞汽車', '桃園市中壢區定寧路73號']] },
  { id: 'NXA-8821', driver: '王彥翔', routeName: 'HC12', trip: '2', position: [24.8342, 121.0149], area: '新竹', stations: [['智邦科技', '新竹市東區研新三路1號'], ['正文科技', '新竹縣湖口鄉中華路15-1號']] },
  { id: 'NXA-9045', driver: '劉柏宏', routeName: 'TC12', trip: '4', position: [24.1832, 120.6468], area: '台中', stations: [['上銀科技', '台中市南屯區精科路7號'], ['橋椿金屬', '台中市大雅區科雅路11號']] },
  { id: 'NXA-9268', driver: '吳承恩', routeName: 'MAC12', trip: '3', position: [24.8987, 121.0358], area: '新竹', stations: [['新普科技', '新竹縣湖口鄉八德路二段471號'], ['達邁科技', '新竹縣新埔鎮文德路三段127號']] },
  { id: 'NXA-9472', driver: '郭信宏', routeName: 'TY13', trip: '5', position: [25.0364, 121.1148], area: '桃園', stations: [['和碩聯合', '桃園市龜山區山鶯路157號'], ['華新科技', '桃園市楊梅區高青路10號']] },
  { id: 'NXA-9684', driver: '蔡宗翰', routeName: 'HC13', trip: '2', position: [24.7748, 121.0206], area: '新竹', stations: [['聯詠科技', '新竹市東區創新一路13號'], ['瑞昱半導體', '新竹市東區創新二路2號']] },
  { id: 'NXA-9803', driver: '謝明諺', routeName: 'TC13', trip: '3', position: [24.2079, 120.6862], area: '台中', stations: [['精材科技', '台中市潭子區建國路18號'], ['台灣佳能', '台中市潭子區加工出口區北環路9號']] },
  { id: 'NXA-1127', driver: '趙子翔', routeName: 'MAC13', trip: '4', position: [24.8754, 121.0168], area: '新竹', stations: [['台燿科技', '新竹縣竹北市博愛街803號'], ['敬鵬工業', '桃園市蘆竹區南山路二段5巷17號']] },
  { id: 'NXA-1359', driver: '何俊毅', routeName: 'TY14', trip: '2', position: [24.9867, 121.2765], area: '桃園', stations: [['美超微電腦', '桃園市八德區和平路1125巷88號'], ['英業達', '桃園市大溪區仁和路二段349號']] },
  { id: 'NXA-1574', driver: '羅志成', routeName: 'HC14', trip: '5', position: [24.8096, 120.9843], area: '新竹', stations: [['矽格聯測', '新竹縣竹東鎮北興路一段436號'], ['京元電子', '新竹縣寶山鄉創新一路4號']] },
  { id: 'NXA-1786', driver: '楊凱翔', routeName: 'TC14', trip: '3', position: [24.1617, 120.6592], area: '台中', stations: [['先進光電', '台中市大雅區科雅路33號'], ['台灣櫻花', '台中市霧峰區五福路866號']] },
  { id: 'NXA-2031', driver: '張晉豪', routeName: 'TY15', trip: '4', position: [25.0128, 121.2197], area: '桃園', stations: [['欣興電子山鶯廠', '桃園市龜山區山鶯路179號'], ['台達電中壢廠', '桃園市中壢區東園路16號']] },
  { id: 'NXA-2246', driver: '陳冠廷', routeName: 'HC15', trip: '3', position: [24.8426, 121.0087], area: '新竹', stations: [['台積電八廠', '新竹市東區力行六路8號'], ['力成科技湖口廠', '新竹縣湖口鄉大同路10號']] },
  { id: 'NXA-2459', driver: '林柏翰', routeName: 'TC15', trip: '2', position: [24.1934, 120.6119], area: '台中', stations: [['台灣美光后里廠', '台中市后里區三豐路四段369號'], ['友達中科廠', '台中市西屯區中科路1號']] },
  { id: 'NXA-2673', driver: '黃品睿', routeName: 'MAC15', trip: '5', position: [24.8932, 121.0274], area: '新竹', stations: [['群創光電竹南廠', '苗栗縣竹南鎮科學路160號'], ['聯電湖口廠', '新竹縣湖口鄉光復北路8號']] },
  { id: 'NXA-2885', driver: '周承翰', routeName: 'TY16', trip: '3', position: [24.9731, 121.2486], area: '桃園', stations: [['華通電腦大園廠', '桃園市大園區中山南路472號'], ['日月光中壢廠', '桃園市中壢區中華路一段550號']] },
  { id: 'NXA-3297', driver: '蔡政宏', routeName: 'HC16', trip: '4', position: [24.7869, 121.0142], area: '新竹', stations: [['旺宏電子', '新竹市東區力行路16號'], ['世界先進三廠', '新竹市東區園區三路123號']] },
  { id: 'NXA-3514', driver: '吳俊毅', routeName: 'TC16', trip: '2', position: [24.2264, 120.6337], area: '台中', stations: [['巨大機械', '台中市大甲區順帆路19號'], ['台灣康寧', '台中市中區科園路1號']] },
  { id: 'NXA-3728', driver: '李明哲', routeName: 'MAC16', trip: '3', position: [24.8736, 121.0361], area: '新竹', stations: [['瀚宇博德湖口廠', '新竹縣湖口鄉光復北路59號'], ['頎邦科技新竹廠', '新竹市東區力行五路3號']] },
  { id: 'NXA-3941', driver: '鄭凱文', routeName: 'TY17', trip: '5', position: [25.0427, 121.1834], area: '桃園', stations: [['和碩龜山廠', '桃園市龜山區山鶯路157號'], ['英業達桃園廠', '桃園市大溪區仁和路二段349號']] },
  { id: 'NXA-4156', driver: '徐志偉', routeName: 'HC17', trip: '2', position: [24.8183, 120.9917], area: '新竹', stations: [['矽格聯測竹東廠', '新竹縣竹東鎮北興路一段436號'], ['京元電子寶山廠', '新竹縣寶山鄉創新一路4號']] },
  { id: 'NXA-4369', driver: '許哲維', routeName: 'TC17', trip: '4', position: [24.1538, 120.6815], area: '台中', stations: [['大立光電', '台中市南屯區精科路11號'], ['上銀科技', '台中市南屯區精科路7號']] },
  { id: 'NXA-4582', driver: '郭家豪', routeName: 'MAC17', trip: '3', position: [24.9071, 121.0112], area: '新竹', stations: [['新普科技', '新竹縣湖口鄉八德路二段471號'], ['達邁科技', '新竹縣新埔鎮文德路三段127號']] },
  { id: 'NXA-4795', driver: '賴冠宇', routeName: 'TY18', trip: '2', position: [24.9561, 121.2916], area: '桃園', stations: [['美超微電腦', '桃園市八德區和平路1125巷88號'], ['國瑞汽車', '桃園市中壢區定寧路73號']] },
  { id: 'NXA-5018', driver: '蘇柏勳', routeName: 'HC18', trip: '5', position: [24.7984, 121.0257], area: '新竹', stations: [['聯詠科技', '新竹市東區創新一路13號'], ['瑞昱半導體', '新竹市東區創新二路2號']] },
  { id: 'NXA-5234', driver: '鍾宇翔', routeName: 'TC18', trip: '3', position: [24.2048, 120.6721], area: '台中', stations: [['精材科技', '台中市潭子區建國路18號'], ['台灣佳能潭子廠', '台中市潭子區加工出口區北環路9號']] },
];

const otherBusinessVehicles = [
  {
    id: 'NXA-8801', driver: '林志豪', routeName: '他向', trip: '待排', serviceType: 'other-business',
    position: [24.8796, 121.0254], area: '新竹', status: 'ready', gps: '14:29', todayWork: '0 小時 0 分', load: 0,
    tasks: [
      { id: 'OTH-V01-1', label: '他向業務', station: '新竹轉運站', address: '新竹縣湖口鄉中華路3號', start: 9.0, end: 11.0, state: 'ontime' },
      { id: 'OTH-V01-2', label: '他向業務', businessType: 'other-business', customer: '竹科材料中心', station: '湖口物流倉', address: '新竹縣湖口鄉工業一路7號', start: 13.0, end: 14.8, state: 'ontime' },
    ],
  },
  {
    id: 'NXA-8802', driver: '待指派', routeName: '他向', trip: '待排', serviceType: 'other-business',
    position: [24.8642, 121.0187], area: '新竹', status: 'ready', gps: '14:28', todayWork: '0 小時 0 分', load: 0,
    tasks: [
      { id: 'OTH-V02-1', label: '他向業務', station: '竹北配送站', address: '新竹縣竹北市光明六路12號', start: 10.2, end: 12.2, state: 'ontime' },
    ],
  },
  {
    id: 'NXA-8901', driver: '吳啟文', routeName: '他向', trip: '待排', serviceType: 'other-business',
    position: [24.9692, 121.2308], area: '桃園', status: 'ready', gps: '14:30', todayWork: '0 小時 0 分', load: 0,
    tasks: [
      { id: 'OTH-V03-1', label: '他向業務', station: '中壢物流站', address: '桃園市中壢區松江北路18號', start: 8.8, end: 10.8, state: 'ontime' },
      { id: 'OTH-V03-2', label: '他向業務', businessType: 'other-business', customer: '桃園電子零件廠', station: '桃園轉運站', address: '桃園市大園區中山南路18號', start: 13.2, end: 15.0, state: 'ontime' },
    ],
  },
  {
    id: 'NXA-8902', driver: '待指派', routeName: '他向', trip: '待排', serviceType: 'other-business',
    position: [25.0351, 121.1032], area: '桃園', status: 'ready', gps: '14:29', todayWork: '0 小時 0 分', load: 0,
    tasks: [
      { id: 'OTH-V04-1', label: '他向業務', station: '龜山物流倉', address: '桃園市龜山區山鶯路88號', start: 9.5, end: 11.5, state: 'ontime' },
    ],
  },
  {
    id: 'NXA-9001', driver: '陳柏均', routeName: '他向', trip: '待排', serviceType: 'other-business',
    position: [24.2061, 120.6722], area: '台中', status: 'ready', gps: '14:27', todayWork: '0 小時 0 分', load: 0,
    tasks: [
      { id: 'OTH-V05-1', label: '他向業務', station: '潭子配送站', address: '台中市潭子區建國路20號', start: 9.2, end: 11.2, state: 'ontime' },
      { id: 'OTH-V05-2', label: '他向業務', businessType: 'other-business', customer: '台中精密工業', station: '台中轉運站', address: '台中市西屯區工業區一路18號', start: 13.1, end: 14.9, state: 'ontime' },
    ],
  },
  {
    id: 'NXA-9002', driver: '待指派', routeName: '他向', trip: '待排', serviceType: 'other-business',
    position: [24.1708, 120.6489], area: '台中', status: 'ready', gps: '14:28', todayWork: '0 小時 0 分', load: 0,
    tasks: [
      { id: 'OTH-V06-1', label: '他向業務', station: '台中物流倉', address: '台中市南屯區精科路9號', start: 10.0, end: 12.0, state: 'ontime' },
    ],
  },
];

const generatedOverviewVehicles = overviewVehicleSeeds.map((seed, index) => {
  const morningStart = 6.5 + (index % 4) * 0.25;
  const morningEnd = 10.6 + (index % 3) * 0.35;
  const afternoonStart = 13.7 + (index % 5) * 0.35;
  const afternoonEnd = Math.min(19.7, afternoonStart + 3.4 + (index % 3) * 0.3);
  const morningState = index % 4 === 0 ? 'early' : 'ontime';
  const afternoonState = afternoonStart > NOW_HOUR ? 'ready' : 'ontime';

  return {
    ...seed,
    status: afternoonState === 'ready' ? 'ready' : 'running',
    gps: `14:${String(26 + (index % 5)).padStart(2, '0')}`,
    load: 28 + (index * 7) % 58,
    tasks: [
      { id: `${seed.routeName}-1`, label: `${seed.routeName}-1 牛奶便`, station: seed.stations[0][0], address: seed.stations[0][1], start: morningStart, end: morningEnd, state: morningState, ...(morningState === 'early' ? { earlyMinutes: 5 + (index % 4) * 3 } : {}) },
      { id: `${seed.routeName}-${seed.trip}`, label: `${seed.routeName}-${seed.trip} 牛奶便`, station: seed.stations[1][0], address: seed.stations[1][1], start: afternoonStart, end: afternoonEnd, state: afternoonState },
    ],
  };
});

// 補上候選插單後的既定便次，讓比較情境清楚呈現「插在兩個便次之間」。
const supplementalFutureTasksByVehicle = {
  'NXA-1023': [
    { id: 'MAC4-5', label: 'MAC4-5 牛奶便', station: '聯電湖口廠', address: '新竹縣湖口鄉光復北路8號', start: 19.2, end: 20.0, state: 'ready' },
  ],
  'NXA-3155': [
    { id: 'HC3-6', label: 'HC3-6 牛奶便', station: '力成科技', address: '新竹縣湖口鄉大同路10號', start: 19.2, end: 20.0, state: 'ready' },
  ],
  'NXA-8416': [
    { id: 'HC6-5', label: 'HC6-5 牛奶便', station: '京元電子', address: '新竹縣寶山鄉創新一路4號', start: 16.8, end: 18.2, state: 'ready' },
  ],
  'NXA-7304': [
    { id: 'TY9-3', label: 'TY9-3 牛奶便', station: '國瑞汽車', address: '桃園市中壢區定寧路73號', start: 18.2, end: 19.6, state: 'ready' },
  ],
  'NXA-7912': [
    { id: 'TY11-4', label: 'TY11-4 牛奶便', station: '南亞塑膠', address: '桃園市龜山區文明路6號', start: 18.2, end: 19.6, state: 'ready' },
  ],
  'NXA-9501': [
    { id: 'TC8-4', label: 'TC8-4 牛奶便', station: '台灣康寧', address: '台中市中區科園路1號', start: 17.8, end: 19.2, state: 'ready' },
  ],
  'NXA-4620': [
    { id: 'TC3-4', label: 'TC3-4 牛奶便', station: '上銀科技', address: '台中市南屯區精科路7號', start: 17.8, end: 19.3, state: 'ready' },
  ],
  'NXA-4072': [
    { id: 'TC5-3', label: 'TC5-3 牛奶便', station: '矽品精密', address: '台中市潭子區大豐路三段123號', start: 16.2, end: 17.6, state: 'ready', risk: true, projectedDelay: 60 },
  ],
  'NXA-3891': [
    { id: 'HC9-5', label: 'HC9-5 牛奶便', station: '台積電十二廠', address: '新竹市東區力行六路8號', start: 16.2, end: 17.6, state: 'ready', risk: true, projectedDelay: 30 },
  ],
  'NXA-6835': [
    { id: 'MAC9-3', label: 'MAC9-3 牛奶便', station: '聯電湖口廠', address: '新竹縣湖口鄉光復北路8號', start: 16.4, end: 17.8, state: 'ready' },
  ],
};

const initialVehicles = [...baseVehicles, ...generatedOverviewVehicles, ...otherBusinessVehicles].map((vehicle, vehicleIndex) => {
  const vehicleTasks = [...vehicle.tasks, ...(supplementalFutureTasksByVehicle[vehicle.id] ?? [])];
  const tasks = vehicleTasks.map((task, taskIndex) => {
    const displayDuration = 1.5 + ((vehicleIndex + taskIndex) % 3) * 0.25;
    const end = Math.min(task.end, task.start + Math.min(displayDuration, MAX_STATION_DURATION_HOURS));
    let state = task.state;

    // 「準時」只代表已完成且準時抵達；現在進行中的任務與未來任務不可顯示為準時。
    if (task.state === 'ontime') {
      if (task.start <= NOW_HOUR && end > NOW_HOUR) state = 'running';
      if (task.start > NOW_HOUR) state = 'ready';
    }

    return {
      ...task,
      end,
      state,
    };
  });
  const activeTask = tasks.find((task) => task.start <= NOW_HOUR && task.end > NOW_HOUR);
  const upcomingTask = tasks.find((task) => task.start > NOW_HOUR);
  const status = activeTask?.state === 'delayed'
    ? 'delayed'
    : activeTask
      ? 'running'
      : upcomingTask
        ? 'ready'
        : 'done';

  return {
    ...vehicle,
    status,
    todayWork: vehicle.todayWork ?? `${6 + (vehicleIndex % 4)} 小時 ${[10, 25, 40, 55][vehicleIndex % 4]} 分`,
    tasks,
  };
});

const getLatestExecutedTask = (vehicle) => [...vehicle.tasks]
  .filter((task) => task.start <= NOW_HOUR && task.state !== 'ready')
  .sort((taskA, taskB) => taskB.start - taskA.start)[0] ?? null;
const taskHasDelay = (task) => {
  if (!task) return false;

  // 異常以最新已發生的時間點為準：已有離站紀錄就看離站，
  // 尚未離站才以抵達狀態判斷，避免已準時／提早離站仍被列為異常。
  if (Number.isFinite(task.departureVarianceMinutes)) {
    return task.departureVarianceMinutes > ON_TIME_TOLERANCE_MINUTES;
  }
  if (Number.isFinite(task.arrivalVarianceMinutes)) {
    return task.arrivalVarianceMinutes > ON_TIME_TOLERANCE_MINUTES;
  }

  return task.state === 'delayed'
    || Number(task.delay) > ON_TIME_TOLERANCE_MINUTES;
};
const vehicleHasDelay = (vehicle) => taskHasDelay(getLatestExecutedTask(vehicle));
const getPotentiallyDelayedStationIds = (vehicle) => {
  const affectedStationIds = new Set(
    vehicle.tasks
      .filter((task) => task.risk && ['running', 'ready'].includes(task.state))
      .map((task) => task.id),
  );
  const orderedTasks = [...vehicle.tasks].sort((taskA, taskB) => taskA.start - taskB.start);

  const latestExecutedTask = getLatestExecutedTask(vehicle);
  const latestTaskIndex = orderedTasks.findIndex((task) => task.id === latestExecutedTask?.id);
  const nextTask = orderedTasks[latestTaskIndex + 1];
  const hasDelayedDeparture = Number(latestExecutedTask?.departureVarianceMinutes) > ON_TIME_TOLERANCE_MINUTES;
  if (hasDelayedDeparture && nextTask?.end > NOW_HOUR) affectedStationIds.add(nextTask.id);

  return affectedStationIds;
};
const getPotentiallyDelayedStationCount = (vehicle) => getPotentiallyDelayedStationIds(vehicle).size;
const vehicleHasAbnormal = (vehicle) => vehicleHasDelay(vehicle);
const vehicleIsRunning = (vehicle) => ['running', 'delayed'].includes(vehicle.status);
const getVehicleOverviewOrder = (vehicle) => {
  if (vehicleHasAbnormal(vehicle)) return 0;
  if (vehicleIsRunning(vehicle)) return 1;
  return 2;
};
const fleetStatusCounts = {
  running: 68,
  abnormal: initialVehicles.filter(vehicleHasAbnormal).length,
};

const initialOtherTasks = [
  {
    id: 'OTH-0241',
    customer: '竹科材料中心',
    station: '湖口材料倉',
    address: '新竹縣湖口鄉光復北路113號',
    route: '湖口 → 新竹科學園區',
    pickup: '湖口工業區',
    pickupPosition: [24.8708, 121.0298],
    delivery: '新竹科學園區',
    window: '15:00–16:30',
    duration: '55 分',
    cargo: '2 板｜1.2 噸',
    tone: 'primary',
  },
  {
    id: 'OTH-0242',
    customer: '桃園電子零件廠',
    station: '龜山零件倉',
    address: '桃園市龜山區山鶯路252號',
    route: '龜山 → 中壢',
    pickup: '桃園龜山',
    pickupPosition: [25.0478, 121.3656],
    delivery: '中壢工業區',
    window: '16:30–18:00',
    duration: '65 分',
    cargo: '4 板｜2.5 噸',
    tone: 'primary',
  },
  {
    id: 'OTH-0243',
    customer: '台中精密工業',
    station: '潭子一廠',
    address: '台中市潭子區建國路18號',
    route: '潭子 → 彰化',
    pickup: '台中潭子',
    pickupPosition: [24.2116, 120.7069],
    delivery: '彰化和美',
    window: '16:00–17:30',
    duration: '80 分',
    cargo: '8 板｜5.0 噸',
    tone: 'warning',
  },
  {
    id: 'OTH-0244',
    customer: '中精工業',
    station: '中精湖口廠',
    address: '桃園市中壢區松江北路20號',
    route: '日通中壢 → 中精',
    pickup: '日通中壢',
    pickupPosition: [24.9716, 121.2368],
    delivery: '中精',
    window: '15:00–16:30',
    duration: '60 分',
    cargo: '3 板｜1.8 噸',
    tone: 'primary',
  },
  {
    id: 'OTH-0245',
    customer: '新竹零組件公司',
    station: '湖口零組件倉',
    address: '新竹縣湖口鄉工業一路12號',
    route: '湖口工業區 → 新竹物流園區',
    pickup: '湖口工業區',
    pickupPosition: [24.879, 121.028],
    delivery: '新竹物流園區',
    window: '18:00–19:00',
    duration: '45 分',
    cargo: '2 板｜1.0 噸',
    tone: 'primary',
  },
];

const candidatesByTask = {
  'OTH-0241': [
    {
      vehicleId: 'NXA-8416',
      start: 12.35,
      end: 14.15,
      extraMinutes: 54,
      extraKm: 18,
      nextDelay: 0,
      remainingWork: '4 小時 35 分',
      capacity: '餘 4 板',
      routeLabel: '湖口交流道 → 科學園區',
      routePath: [[24.8708, 121.0298], [24.8846, 121.0415], [24.7847, 121.0054]],
    },
    {
      vehicleId: 'NXA-6210',
      start: 14.0,
      end: 15.65,
      extraMinutes: 49,
      extraKm: 14,
      nextDelay: 12,
      remainingWork: '2 小時 45 分',
      capacity: '餘 8 板',
      routeLabel: '竹北 → 湖口 → 科學園區',
      routePath: [[24.8852, 121.0186], [24.8708, 121.0298], [24.7847, 121.0054]],
    },
  ],
  'OTH-0242': [
    {
      vehicleId: 'NXA-7304',
      start: 13.4,
      end: 15.25,
      extraMinutes: 58,
      extraKm: 20,
      nextDelay: 16,
      remainingWork: '3 小時 05 分',
      capacity: '餘 3 板',
      routeLabel: '龜山 → 中壢工業區',
      routePath: [[25.0478, 121.3656], [25.0182, 121.2884], [24.9716, 121.2368]],
    },
    {
      vehicleId: 'NXA-7912',
      start: 12.2,
      end: 14.25,
      extraMinutes: 67,
      extraKm: 24,
      nextDelay: 6,
      remainingWork: '4 小時 10 分',
      capacity: '餘 5 板',
      routeLabel: '林口 → 龜山 → 中壢',
      routePath: [[25.0792, 121.3816], [25.0478, 121.3656], [24.9716, 121.2368]],
    },
  ],
  'OTH-0243': [
    {
      vehicleId: 'NXA-9501',
      start: 13.65,
      end: 15.0,
      extraMinutes: 46,
      extraKm: 15,
      nextDelay: 0,
      remainingWork: '4 小時 20 分',
      capacity: '餘 5 板',
      routeLabel: '大雅 → 潭子 → 彰化',
      routePath: [[24.1617, 120.6592], [24.2116, 120.7069], [24.0756, 120.544]],
    },
    {
      vehicleId: 'NXA-4620',
      start: 13.75,
      end: 15.1,
      extraMinutes: 51,
      extraKm: 18,
      nextDelay: 0,
      remainingWork: '3 小時 55 分',
      capacity: '餘 4 板',
      routeLabel: '潭子 → 台中精密工業 → 彰化',
      routePath: [[24.2048, 120.6721], [24.2116, 120.7069], [24.0756, 120.544]],
    },
  ],
  'OTH-0244': [
    {
      vehicleId: 'NXA-7304',
      start: 13.15,
      end: 15.05,
      extraMinutes: 57,
      extraKm: 17,
      nextDelay: 0,
      remainingWork: '3 小時 50 分',
      capacity: '餘 6 板',
      routeLabel: '竹北 → 中壢 → 湖口',
      routePath: [[24.9078, 120.9968], [24.9716, 121.2368], [24.8708, 121.0298]],
    },
    {
      vehicleId: 'NXA-6210',
      start: 13.8,
      end: 15.55,
      extraMinutes: 64,
      extraKm: 21,
      nextDelay: 10,
      remainingWork: '2 小時 45 分',
      capacity: '餘 8 板',
      routeLabel: '新竹 → 中壢 → 湖口',
      routePath: [[24.8852, 121.0186], [24.9716, 121.2368], [24.8708, 121.0298]],
    },
  ],
  'OTH-0245': [
    {
      vehicleId: 'NXA-1023',
      start: 12.0,
      end: 13.0,
      extraMinutes: 42,
      extraKm: 12,
      nextDelay: 0,
      remainingWork: '4 小時 35 分',
      capacity: '餘 4 板',
      routeLabel: '湖口 → 新竹物流園區',
      routePath: [[24.8708, 121.0298], [24.879, 121.028], [24.8126, 121.0214]],
    },
    {
      vehicleId: 'NXA-3155',
      start: 18.0,
      end: 19.0,
      extraMinutes: 48,
      extraKm: 15,
      nextDelay: 0,
      remainingWork: '3 小時 50 分',
      capacity: '餘 6 板',
      routeLabel: '新豐 → 湖口零組件倉',
      routePath: [[24.9078, 120.9968], [24.879, 121.028], [24.8126, 121.0214]],
    },
  ],
};

const initialKeyInForm = {
  customer: '中精工業',
  pickupName: '日通中壢',
  pickupAddress: '桃園市中壢區松江北路20號',
  deliveryName: '中精',
  deliveryAddress: '新竹縣湖口鄉光復北路113號',
  date: '2026-08-07',
  startTime: '15:00',
  endTime: '16:30',
  duration: '60',
  pallets: '2',
  weight: '1.2',
};

const navItems = [
  { id: 'monitoring', label: '營運監控', icon: DashboardRounded },
  { id: 'checklist', label: '點呼表管理', icon: AssignmentOutlined },
  { label: '車輛管理', icon: LocalShippingRounded },
  { label: '路線與便次', icon: RouteRounded },
  { label: '異常處理', icon: WarningRounded, badge: 5 },
  { label: '系統權限設定', icon: SettingsOutlined },
];

const toPercent = (hour) => ((hour - START_HOUR) / HOUR_COUNT) * 100;
const formatHour = (hour) => {
  const wholeHour = Math.floor(hour);
  const minutes = Math.round((hour - wholeHour) * 60);
  return `${String(wholeHour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

const parseClockHour = (value) => {
  const [hours, minutes = '0'] = value.split(':');
  return Number(hours) + (Number(minutes) / 60);
};

const getTaskWindowRange = (task) => {
  const times = [...String(task.window ?? '').matchAll(/(\d{1,2}:\d{2})/g)].map((match) => parseClockHour(match[1]));
  const durationMinutes = Number.parseFloat(task.duration) || 60;
  if (times.length >= 2) return { start: times[0], end: times[1] };
  if (times.length === 1 && String(task.window).includes('前')) {
    return { start: times[0] - (durationMinutes / 60), end: times[0] };
  }
  if (times.length === 1) return { start: times[0], end: times[0] + (durationMinutes / 60) };
  return { start: NOW_HOUR, end: NOW_HOUR + (durationMinutes / 60) };
};

const driverOptionsByVehicle = {
  'NXA-1023': [
    { name: '陳志明', workHours: '7 小時 25 分' },
    { name: '黃冠宇', workHours: '5 小時 40 分' },
  ],
  'NXA-3155': [
    { name: '王俊傑', workHours: '8 小時 10 分' },
    { name: '林彥廷', workHours: '6 小時 30 分' },
  ],
  'NXA-5188': [
    { name: '黃柏勳', workHours: '7 小時 50 分' },
    { name: '張志豪', workHours: '4 小時 55 分' },
  ],
};

const getVehicleDriverOptions = (vehicle) => (
  driverOptionsByVehicle[vehicle.id]
  ?? [{ name: vehicle.driver, workHours: vehicle.todayWork }]
);

const MIN_DRIVER_BUFFER_MINUTES = 20;
const OTHER_BUSINESS_VEHICLE_OPTION_LIMIT = 6;

const getDriverAssignments = (driverName) => initialVehicles.flatMap((vehicle) => (
  vehicle.tasks
    .filter((task) => (task.assignedDriver ?? vehicle.driver) === driverName)
    .map((task) => ({ ...task, vehicleId: vehicle.id }))
));

const getCandidatePairId = (candidate) => `${candidate.taskId}-${candidate.vehicleId}-${candidate.driverName}`;
const getDriverImpactId = (candidate) => `${candidate.taskId}-${candidate.driverName}-downstream-impact`;

const alignCandidateToTaskWindow = (candidate, task) => ({
  ...candidate,
  ...getTaskWindowRange(task),
  taskId: task.id,
});

const buildCandidatePair = (candidate, driver) => {
  const vehicle = initialVehicles.find((item) => item.id === candidate.vehicleId);
  if (!vehicle) return null;
  const driverAssignments = getDriverAssignments(driver.name).sort((a, b) => a.start - b.start);
  const vehicleAssignments = [...vehicle.tasks].sort((a, b) => a.start - b.start);
  const previousDriverTask = driverAssignments.filter((task) => task.end <= candidate.start).at(-1) ?? null;
  const nextDriverTask = driverAssignments.find((task) => task.start >= candidate.end) ?? null;
  const previousVehicleTask = vehicleAssignments.filter((task) => task.end <= candidate.start).at(-1) ?? null;
  const nextVehicleTask = vehicleAssignments.find((task) => task.start >= candidate.end) ?? null;
  const bufferMinutes = nextDriverTask
    ? Math.max(0, Math.round((nextDriverTask.start - candidate.end) * 60))
    : null;
  const hasDownstreamConflict = bufferMinutes !== null && bufferMinutes < MIN_DRIVER_BUFFER_MINUTES;

  return {
    ...candidate,
    driverName: driver.name,
    driverWorkHours: driver.workHours,
    driverAssignments,
    vehicleAssignments,
    previousDriverTask,
    nextDriverTask,
    previousVehicleTask,
    nextVehicleTask,
    bufferMinutes,
    hasDownstreamConflict,
    pairId: `${candidate.taskId}-${candidate.vehicleId}-${driver.name}`,
  };
};

const candidatePairIsAvailable = (candidate) => {
  if (!candidate) return false;
  const vehicle = initialVehicles.find((item) => item.id === candidate.vehicleId);
  if (!vehicle) return false;
  const vehicleAvailable = vehicle.tasks.every((task) => task.end <= candidate.start || task.start >= candidate.end);
  const driverAvailable = candidate.driverAssignments.every((task) => task.end <= candidate.start || task.start >= candidate.end);
  return vehicleAvailable && driverAvailable;
};

const getEligibleDriversForCandidates = (candidates) => {
  const drivers = candidates.flatMap((candidate) => {
    const vehicle = initialVehicles.find((item) => item.id === candidate.vehicleId);
    return vehicle ? getVehicleDriverOptions(vehicle) : [];
  });
  return drivers.filter((driver, index, items) => items.findIndex((item) => item.name === driver.name) === index);
};

const calculateDistanceKm = ([startLat, startLng], [endLat, endLng]) => {
  const toRadians = (value) => value * (Math.PI / 180);
  const earthRadiusKm = 6371;
  const latitudeDelta = toRadians(endLat - startLat);
  const longitudeDelta = toRadians(endLng - startLng);
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(toRadians(startLat)) * Math.cos(toRadians(endLat)) * Math.sin(longitudeDelta / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
};

const getStationMapPosition = (vehicle, task) => {
  if (task.mapPosition) return task.mapPosition;
  const seed = [...`${vehicle.id}-${task.id}`].reduce((total, character) => total + character.charCodeAt(0), 0);
  const angle = (seed % 360) * (Math.PI / 180);
  const radius = 0.012 + (seed % 5) * 0.0025;
  return [
    vehicle.position[0] + Math.cos(angle) * radius,
    vehicle.position[1] + Math.sin(angle) * radius,
  ];
};

const getTaskPlannedRange = (task) => {
  if (Number.isFinite(task.plannedStart) && Number.isFinite(task.plannedEnd)) {
    return { start: task.plannedStart, end: task.plannedEnd };
  }
  if (Number.isFinite(task.arrivalVarianceMinutes) || Number.isFinite(task.departureVarianceMinutes)) {
    const arrivalVarianceHours = Number(task.arrivalVarianceMinutes ?? 0) / 60;
    const departureVarianceHours = Number(task.departureVarianceMinutes ?? 0) / 60;
    return {
      start: task.start - arrivalVarianceHours,
      end: task.end - departureVarianceHours,
    };
  }
  let plannedOffsetMinutes = 0;
  if (task.state === 'delayed' && task.delay) plannedOffsetMinutes = -Math.abs(Number.parseFloat(task.delay));
  if (task.state === 'early' && task.earlyMinutes) plannedOffsetMinutes = task.earlyMinutes;
  const offsetHours = plannedOffsetMinutes / 60;
  return { start: task.start + offsetHours, end: task.end + offsetHours };
};

const getRelevantVehicleTask = (vehicle) => (
  vehicle.tasks.find((task) => task.start <= NOW_HOUR && task.end >= NOW_HOUR)
  || vehicle.tasks.find((task) => task.start > NOW_HOUR)
  || vehicle.tasks[vehicle.tasks.length - 1]
);

function ProductMark({ compact = false }) {
  return (
    <Stack direction="row" alignItems="center" spacing={1.1}>
      {compact ? (
        <Box className="sidebar-monogram">NX</Box>
      ) : (
        <Typography className="product-name">NX POC</Typography>
      )}
    </Stack>
  );
}

function Sidebar({ expanded, onToggle, activePage, onNavigate }) {
  return (
    <aside className={`sidebar ${expanded ? 'expanded' : 'collapsed'}`}>
      <Box className="sidebar-brand"><ProductMark compact /></Box>
      <Tooltip title={expanded ? '收合選單' : '展開選單'} placement="right">
        <IconButton className="sidebar-toggle" size="small" aria-label={expanded ? '收合選單' : '展開選單'} onClick={onToggle}>
          <ChevronLeftRounded />
        </IconButton>
      </Tooltip>
      <nav className="sidebar-nav">
        {navItems.map(({ id, label, icon: Icon, badge }) => (
          <Tooltip key={label} title={expanded ? '' : label} placement="right">
            <Box
              className={`nav-item ${activePage === id ? 'active' : ''}`}
              aria-label={label}
              aria-current={activePage === id ? 'page' : undefined}
              role={id ? 'button' : undefined}
              tabIndex={id ? 0 : undefined}
              onClick={() => id && onNavigate(id)}
              onKeyDown={(event) => {
                if (id && (event.key === 'Enter' || event.key === ' ')) {
                  event.preventDefault();
                  onNavigate(id);
                }
              }}
            >
              <Badge badgeContent={badge} color="error" max={9}>
                <Icon fontSize="small" />
              </Badge>
              <Typography component="span">{label}</Typography>
            </Box>
          </Tooltip>
        ))}
      </nav>
      <Box className="sidebar-bottom">
        <Box className="sidebar-account" aria-label="目前登入帳號：王日通，調度管理員">
          <Box className="sidebar-account-copy">
            <Typography className="sidebar-account-name" component="span">王日通</Typography>
            <Typography className="sidebar-account-role" component="span">調度管理員</Typography>
          </Box>
        </Box>
      </Box>
    </aside>
  );
}

function TopHeader({ sidebarExpanded, onToggleSidebar }) {
  return (
    <header className="top-header">
      <Stack direction="row" alignItems="center" spacing={1}>
        <Tooltip title={sidebarExpanded ? '收合選單' : '展開選單'}>
          <IconButton
            className={`nav-menu-button ${sidebarExpanded ? 'sidebar-open' : ''}`}
            size="small"
            aria-label={sidebarExpanded ? '收合選單' : '展開選單'}
            onClick={onToggleSidebar}
          >
            {sidebarExpanded ? <CloseRounded /> : <MenuRounded />}
          </IconButton>
        </Tooltip>
        <ProductMark />
      </Stack>
      <Stack direction="row" alignItems="center">
        <IconButton size="small"><NotificationsNoneRounded /></IconButton>
      </Stack>
    </header>
  );
}

function MapResizeHandler({ dependency }) {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    let animationFrame = 0;
    const invalidateMapSize = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(() => map.invalidateSize({ animate: false, pan: false }));
    };
    const resizeObserver = new ResizeObserver(invalidateMapSize);

    resizeObserver.observe(container);
    invalidateMapSize();

    return () => {
      resizeObserver.disconnect();
      window.cancelAnimationFrame(animationFrame);
    };
  }, [dependency, map]);

  return null;
}

const taskLocationMapIcon = L.divIcon({
  className: 'task-location-marker-root',
  html: '<span class="task-location-pin"><span /></span>',
  iconSize: [34, 40],
  iconAnchor: [17, 38],
  tooltipAnchor: [0, -36],
});

function createDistanceLineLabelIcon(distanceKm) {
  return L.divIcon({
    className: 'distance-line-label-root',
    html: `<span class="distance-line-label">直線距離 ${distanceKm.toFixed(1)} km</span>`,
    iconSize: [112, 24],
    iconAnchor: [56, 12],
  });
}

function MapFocusHandler({ request, vehicles }) {
  const map = useMap();

  useEffect(() => {
    if (!request) return undefined;
    const vehicle = request.vehicleId ? vehicles.find((item) => item.id === request.vehicleId) : null;
    const targetPosition = request.position ?? vehicle?.position;
    if (!targetPosition && !request.positions?.length) return undefined;

    const focusTimer = window.setTimeout(() => {
      map.invalidateSize({ animate: false, pan: false });
      if (request.positions?.length > 1) {
        map.fitBounds(L.latLngBounds(request.positions), {
          padding: [80, 80],
          maxZoom: 15,
          animate: true,
          duration: 0.65,
        });
      } else {
        map.flyTo(targetPosition, Math.max(map.getZoom(), 15), { animate: true, duration: 0.65 });
      }
    }, 240);

    return () => window.clearTimeout(focusTimer);
  }, [map, request, vehicles]);

  return null;
}

function VehicleInfo({ vehicle, onLocate, assignedCustomer, assignedDriver }) {
  const hasAbnormal = vehicleHasAbnormal(vehicle);
  const isOtherBusinessVehicle = vehicle.serviceType === 'other-business';
  const activeVehicleTask = vehicle.tasks.find((task) => task.start <= NOW_HOUR && task.end > NOW_HOUR);
  const activeOtherBusinessCustomer = activeVehicleTask?.businessType === 'other-business'
    ? activeVehicleTask.customer
    : null;
  const displayedOtherBusinessCustomer = assignedCustomer ?? activeOtherBusinessCustomer;
  const hasCurrentOrFutureTask = vehicle.tasks.some((task) => task.end > NOW_HOUR) || Boolean(assignedCustomer);
  const displayedDriver = assignedDriver ?? (vehicle.driver === '待指派' ? null : vehicle.driver);
  const abnormalMessage = '行程延遲，可能影響後續站點';
  return (
    <Box className={`vehicle-info ${hasAbnormal ? 'has-risk' : ''}`}>
      <Box sx={{ width: '100%' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ width: '100%' }}>
          <Typography variant="body2" fontWeight={750}>{vehicle.id}</Typography>
        </Stack>
        {isOtherBusinessVehicle && !hasCurrentOrFutureTask ? (
          <Typography className="vehicle-no-followup" variant="caption">無當前任務</Typography>
        ) : (
          <>
            {displayedDriver && (
              <Typography variant="caption" color="text.secondary">
                <Box component="span" className="vehicle-driver">{displayedDriver}</Box>
              </Typography>
            )}
            <Stack className="vehicle-route-meta" direction="row" alignItems="center" spacing={1}>
              {isOtherBusinessVehicle && displayedOtherBusinessCustomer ? (
                <Typography variant="caption">客戶 {displayedOtherBusinessCustomer}</Typography>
              ) : (
                <>
                  <Typography variant="caption">路線 {vehicle.routeName}</Typography>
                  <Typography variant="caption">便次 {vehicle.trip}</Typography>
                </>
              )}
            </Stack>
          </>
        )}
      </Box>
      <Stack className="vehicle-actions" direction="row" spacing={0.2}>
        <Tooltip title="地圖定位">
          <IconButton size="small" aria-label={`定位 ${vehicle.id}`} onClick={(event) => { event.stopPropagation(); onLocate(vehicle); }}>
            <PinDropOutlined />
          </IconButton>
        </Tooltip>
      </Stack>
      {hasAbnormal && (
        <Tooltip title={abnormalMessage} arrow>
          <Box className="vehicle-risk-summary" role="img" aria-label={abnormalMessage}>
            <WarningRounded />
          </Box>
        </Tooltip>
      )}
    </Box>
  );
}

function createVehicleMapIcon(vehicle, hasAbnormal, focused, emphasized) {
  const warningIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 2.5 20h19L12 3Z"/><path d="M12 9v5"/><path d="M12 17.5h.01"/></svg>';

  return L.divIcon({
    className: 'vehicle-marker-root',
    html: `<div class="leaflet-vehicle-pin ${focused ? 'focused' : ''} ${emphasized ? 'emphasized' : ''}"><span class="map-truck-glyph"></span>${hasAbnormal ? `<span class="map-pin-status risk">${warningIcon}</span>` : ''}</div>`,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    tooltipAnchor: [0, 22],
  });
}

function VehicleMapPin({ vehicle, focused, emphasized, onOpen }) {
  const task = getRelevantVehicleTask(vehicle);
  const activeTask = vehicle.tasks.find((item) => item.start <= NOW_HOUR && item.end > NOW_HOUR);
  const isActiveOtherBusiness = Boolean(
    activeTask
    && vehicle.serviceType === 'other-business'
    && activeTask.customer,
  );
  const hasAbnormal = vehicleHasAbnormal(vehicle);
  const abnormalMessage = '行程延遲，可能影響後續站點';
  const markerIcon = createVehicleMapIcon(vehicle, hasAbnormal, focused, emphasized);

  return (
    <Marker
      position={vehicle.position}
      icon={markerIcon}
      zIndexOffset={focused ? 10000 : hasAbnormal ? 500 : 0}
      riseOnHover
      riseOffset={12000}
      eventHandlers={{ click: () => onOpen(vehicle) }}
    >
      <LeafletTooltip direction="bottom" opacity={1} permanent={focused && !emphasized} className="vehicle-leaflet-tooltip">
        <Box className="map-vehicle-tooltip">
          <Stack className="map-tooltip-card-header" direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
            <Box>
              <Typography variant="subtitle2" fontWeight={750}>{vehicle.id}</Typography>
              {hasAbnormal && (
                <Stack className="map-tooltip-attention-status risk" direction="row" alignItems="center" spacing={0.5}>
                  <WarningAmberOutlined />
                  <Typography variant="caption">{abnormalMessage}</Typography>
                </Stack>
              )}
            </Box>
          </Stack>
          <Box className="map-tooltip-row"><span>當前司機</span><b>{vehicle.driver}</b></Box>
          {isActiveOtherBusiness ? (
            <Box className="map-tooltip-row"><span>客戶（他向業務）</span><b>{activeTask.customer}</b></Box>
          ) : (
            <Box className="map-tooltip-row"><span>路線／便次</span><b>{vehicle.routeName}／{vehicle.trip}</b></Box>
          )}
          <Box className="map-tooltip-row"><span>站點</span><b>{task.station}</b></Box>
          <Box className="map-tooltip-row"><span>地址</span><b>{task.address}</b></Box>
          <Box className="map-tooltip-row">
            <span>規劃時間</span>
            <b className="map-tooltip-time-value">
              <span className="map-time-range">{formatHour(task.start)}–{formatHour(task.end)}</span>
            </b>
          </Box>
        </Box>
      </LeafletTooltip>
    </Marker>
  );
}

function TaskBlock({ task, vehicle, compareMode, scaleMinutes, highlighted, onHighlight, onLocate, onReassign }) {
  const meta = statusMeta[task.state] || statusMeta.running;
  const planned = getTaskPlannedRange(task);
  const plannedLeft = toPercent(planned.start);
  const plannedWidth = ((planned.end - planned.start) / HOUR_COUNT) * 100;
  const hasStarted = task.state !== 'ready' && task.start <= NOW_HOUR;
  const hasDeparted = hasStarted && task.end <= NOW_HOUR;
  const actualLineEnd = hasDeparted ? task.end : Math.min(NOW_HOUR, task.end);
  const actualLeft = toPercent(task.start);
  const actualWidth = ((actualLineEnd - task.start) / HOUR_COUNT) * 100;
  const arrivalDifferenceMinutes = Math.round((task.start - planned.start) * 60);
  const departureDifferenceMinutes = Math.round((task.end - planned.end) * 60);
  const getDifferenceState = (minutes) => (
    minutes < -ON_TIME_TOLERANCE_MINUTES
      ? 'early'
      : minutes > ON_TIME_TOLERANCE_MINUTES
        ? 'delayed'
        : 'ontime'
  );
  const getDifferenceLabel = (minutes, eventLabel) => (minutes < -ON_TIME_TOLERANCE_MINUTES
    ? `提早${eventLabel} ${Math.abs(minutes)} 分`
    : minutes > ON_TIME_TOLERANCE_MINUTES
      ? `延遲${eventLabel} ${minutes} 分`
      : `準時${eventLabel}`);
  const getDifferenceValue = (minutes) => (minutes < -ON_TIME_TOLERANCE_MINUTES
    ? `提早 ${Math.abs(minutes)} 分`
    : minutes > ON_TIME_TOLERANCE_MINUTES
      ? `延遲 ${minutes} 分`
      : '準時');
  const arrivalDifferenceState = getDifferenceState(arrivalDifferenceMinutes);
  const arrivalDifferenceLabel = getDifferenceLabel(arrivalDifferenceMinutes, '抵達');
  const arrivalDifferenceValue = getDifferenceValue(arrivalDifferenceMinutes);
  const departureDifferenceState = getDifferenceState(departureDifferenceMinutes);
  const departureDifferenceLabel = getDifferenceLabel(departureDifferenceMinutes, '離站');
  const departureDifferenceValue = getDifferenceValue(departureDifferenceMinutes);
  const arrivalMeta = timelineActualStatusMeta[arrivalDifferenceState];
  const departureMeta = timelineActualStatusMeta[departureDifferenceState];
  const arrivalStatusLabel = arrivalDifferenceState === 'ontime' ? '' : arrivalDifferenceValue;
  const departureStatusLabel = hasDeparted && departureDifferenceState !== 'ontime'
    ? departureDifferenceValue
    : '';
  const actualBarState = hasDeparted
    ? departureDifferenceState
    : arrivalDifferenceState;
  const actualBarMeta = timelineActualStatusMeta[actualBarState];
  const showActualStatusLine = compareMode && hasStarted && actualLineEnd > task.start && task.state !== 'offline';
  const showInlineDifferenceLabels = scaleMinutes < 60;
  const showTimeDifference = arrivalDifferenceState !== 'ontime'
    || (hasDeparted && departureDifferenceState !== 'ontime');
  const hasEtaWarning = task.risk && Number.isFinite(task.projectedDelay);
  const projectedArrival = hasEtaWarning
    ? planned.start + (task.projectedDelay / 60)
    : null;
  const actualRight = toPercent(task.end);
  const taskTrip = task.confirmedInsertion ? vehicle.trip : task.id.split('-').at(-1);
  const tooltipContent = (
    <Box className="station-tooltip-card">
      <Stack className="station-tooltip-header" direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
        <Typography variant="subtitle2" fontWeight={750}>{task.station}</Typography>
        <Tooltip title="變更指派">
          <IconButton
            className="station-tooltip-edit-button"
            size="small"
            aria-label="變更指派"
            onClick={(event) => {
              event.stopPropagation();
              onReassign(vehicle, task);
            }}
          >
            <EditOutlined />
          </IconButton>
        </Tooltip>
        <Tooltip title="地圖定位">
          <IconButton
            className="station-tooltip-map-button"
            size="small"
            aria-label={`在地圖定位 ${vehicle.id}`}
            onClick={(event) => {
              event.stopPropagation();
              onLocate(vehicle, task);
            }}
          >
            <PinDropOutlined />
          </IconButton>
        </Tooltip>
      </Stack>
      <Box className="station-tooltip-row">
        <Typography component="span">地址</Typography>
        <Typography component="b">{task.address}</Typography>
      </Box>
      <Box className="station-tooltip-row">
        <Typography component="span">司機</Typography>
        <Typography component="b">{task.assignedDriver ?? vehicle.driver}</Typography>
      </Box>
      <Box className="station-tooltip-row">
        <Typography component="span">便次</Typography>
        <Typography component="b">{taskTrip}</Typography>
      </Box>
      <Box className="station-tooltip-row">
        <Typography component="span">規劃時間</Typography>
        <Typography component="b">
          {hasEtaWarning ? formatHour(planned.start) : `${formatHour(planned.start)}–${formatHour(planned.end)}`}
        </Typography>
      </Box>
      {hasEtaWarning && (
        <Box className="station-tooltip-row eta-warning-row">
          <Typography component="span">預計抵達</Typography>
          <Typography component="b">
            {formatHour(projectedArrival)}
            <Box component="span" className="eta-delay">（預計延遲 {task.projectedDelay} 分）</Box>
          </Typography>
        </Box>
      )}
      {showActualStatusLine && (
        <>
          <Box className="station-tooltip-row">
            <Typography component="span">實際執行</Typography>
            <Typography component="b">
              {hasDeparted ? `${formatHour(task.start)}–${formatHour(task.end)}` : `${formatHour(task.start)}–進行中`}
            </Typography>
          </Box>
          {showTimeDifference && (
            <Box className="station-tooltip-row time-difference-row">
              <Typography component="b" className="station-difference-summary">
                <Box component="span" className="difference-event-label">抵達</Box>
                <Box component="span" className={`time-difference ${arrivalDifferenceState}`}>{arrivalDifferenceValue}</Box>
                {hasDeparted && (
                  <>
                    <Box component="span" className="difference-separator">｜</Box>
                    <Box component="span" className="difference-event-label">離站</Box>
                    <Box component="span" className={`time-difference ${departureDifferenceState}`}>{departureDifferenceValue}</Box>
                  </>
                )}
              </Typography>
            </Box>
          )}
        </>
      )}
    </Box>
  );
  const tooltipSlotProps = {
    tooltip: { sx: { bgcolor: '#FFFFFF', color: '#192434', border: '1px solid #DDE4EC', boxShadow: '0 8px 24px rgba(22, 34, 52, 0.14)', p: 1.25, maxWidth: 300 } },
    arrow: { sx: { color: '#FFFFFF' } },
  };
  return (
    <>
      <Tooltip arrow placement="bottom" title={tooltipContent} slotProps={tooltipSlotProps}>
        <Box
          className={`timeline-task planned-task ${hasEtaWarning ? 'has-eta-warning' : ''} ${highlighted ? 'paired-highlight' : ''}`}
          sx={{ left: `${plannedLeft}%`, width: `${plannedWidth}%`, '--task-status-color': meta.color }}
          onMouseEnter={() => onHighlight(task.id)}
          onMouseLeave={() => onHighlight(null)}
          aria-label={`${task.station} 原派車規劃`}
        >
          <Stack className="timeline-task-label" direction="row" spacing={0.5} alignItems="center" sx={{ minWidth: 0 }}>
            {hasEtaWarning && <AccessTimeRounded className="timeline-task-eta-warning" aria-hidden="true" />}
            <Typography component="span" noWrap>{task.station}</Typography>
          </Stack>
        </Box>
      </Tooltip>
      {showActualStatusLine && (
        <>
          {arrivalDifferenceState !== 'ontime' && (
            <Box
              className={`actual-endpoint-tick arrival state-${arrivalDifferenceState}`}
              sx={{ left: `${actualLeft}%`, '--actual-status-color': arrivalMeta.color }}
              aria-hidden="true"
            />
          )}
          {hasDeparted && departureDifferenceState !== 'ontime' && (
            <Box
              className={`actual-endpoint-tick departure state-${departureDifferenceState}`}
              sx={{ left: `${actualRight}%`, '--actual-status-color': departureMeta.color }}
              aria-hidden="true"
            />
          )}
          {showInlineDifferenceLabels && arrivalStatusLabel && (
            <Box
              className={`actual-difference-label arrival state-${arrivalDifferenceState}`}
              sx={{ left: `${actualLeft}%`, '--actual-status-color': arrivalMeta.color }}
              aria-hidden="true"
            >{arrivalStatusLabel}</Box>
          )}
          {showInlineDifferenceLabels && departureStatusLabel && (
            <Box
              className={`actual-difference-label departure state-${departureDifferenceState}`}
              sx={{ left: `${actualRight}%`, '--actual-status-color': departureMeta.color }}
              aria-hidden="true"
            >{departureStatusLabel}</Box>
          )}
          <Tooltip arrow placement="bottom" title={tooltipContent} slotProps={tooltipSlotProps}>
            <Box
              className={`timeline-task state-${task.state} comparison-current ${highlighted ? 'paired-highlight' : ''}`}
              sx={{
                left: `${actualLeft}%`,
                width: `${actualWidth}%`,
                bgcolor: actualBarMeta?.bg ?? '#DCE4EC',
                borderColor: actualBarMeta ? `${actualBarMeta.color}77` : '#91A1B2',
              }}
              onMouseEnter={() => onHighlight(task.id)}
              onMouseLeave={() => onHighlight(null)}
              aria-label={`${task.station}，實際執行，${arrivalDifferenceLabel}${hasDeparted ? `，${departureDifferenceLabel}` : '，尚未離站'}`}
            />
          </Tooltip>
        </>
      )}
    </>
  );
}

function CandidateSlot({ candidate, selectedTask, active, previewing, onSelect, onHover, onDropTask }) {
  const [dragOver, setDragOver] = useState(false);
  const dragDepth = useRef(0);
  const left = toPercent(candidate.start);
  const width = ((candidate.end - candidate.start) / HOUR_COUNT) * 100;
  const tooltipTitle = active ? (
    <Box className="candidate-preview-tooltip">
      <Box className="candidate-preview-tooltip-row">
        <Typography component="span">地址</Typography>
        <Typography component="b">{selectedTask.address}</Typography>
      </Box>
      <Box className="candidate-preview-tooltip-row">
        <Typography component="span">指定時間</Typography>
        <Typography component="b">{selectedTask.window}</Typography>
      </Box>
    </Box>
  ) : '插入司機空擋';
  return (
    <Tooltip
      arrow
      placement="bottom"
      title={tooltipTitle}
      slotProps={active ? {
        tooltip: { sx: { bgcolor: '#FFFFFF', color: '#192434', border: '1px solid #DDE4EC', boxShadow: '0 8px 24px rgba(22, 34, 52, 0.14)', p: 1.25, maxWidth: 300 } },
        arrow: { sx: { color: '#FFFFFF' } },
      } : undefined}
    >
      <Box
        id={`candidate-slot-${candidate.vehicleId}`}
        className={`candidate-slot ${active ? 'active' : ''} ${previewing ? 'previewing' : ''} ${dragOver ? 'drop-target' : ''}`}
        sx={{ left: `${left}%`, width: `${width}%` }}
        onClick={() => onSelect(candidate)}
        onMouseEnter={() => onHover(candidate)}
        onMouseLeave={() => onHover(null)}
        onDragEnter={(event) => {
          event.preventDefault();
          dragDepth.current += 1;
          setDragOver(true);
        }}
        onDragLeave={() => {
          dragDepth.current = Math.max(0, dragDepth.current - 1);
          if (dragDepth.current === 0) setDragOver(false);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = 'move';
        }}
        onDrop={(event) => {
          event.preventDefault();
          dragDepth.current = 0;
          setDragOver(false);
          if (selectedTask) onDropTask(candidate);
        }}
      >
        {!active && !dragOver && <MoreTimeRounded fontSize="small" />}
        {active && !dragOver ? (
          <>
            <span className="candidate-slot-station">{selectedTask.station ?? selectedTask.customer}</span>
            <span className="candidate-slot-preview-status">（預覽）</span>
          </>
        ) : (
          <span>{dragOver ? '放開以選擇司機' : '空檔'}</span>
        )}
      </Box>
    </Tooltip>
  );
}

function Timeline({ vehicles, candidates, selectedTask, selectedDriverName, hasAvailableCandidates, activeCandidate, hoveredCandidate, onSelectCandidate, onHoverCandidate, onDropTask, onLocateVehicle, onReassignTask, insertedTasks, highlightedVehicleId, compareMode, scaleMinutes, showRequestedWindow = false, dragActive = false }) {
  const [highlightedTaskId, setHighlightedTaskId] = useState(null);
  const timelineWidthPercent = TIMELINE_WIDTH_PERCENT_BY_SCALE[scaleMinutes] ?? 100;
  const requestedWindow = selectedTask ? getTaskWindowRange(selectedTask) : null;
  const requestedWindowLeft = requestedWindow ? toPercent(requestedWindow.start) : 0;
  const requestedWindowWidth = requestedWindow
    ? ((requestedWindow.end - requestedWindow.start) / HOUR_COUNT) * 100
    : 0;
  const selectedDriverCandidate = selectedDriverName
    ? candidates.find((candidate) => candidate.driverName === selectedDriverName)
    : null;
  const candidateFocusVehicleId = hoveredCandidate?.vehicleId
    ?? activeCandidate?.vehicleId
    ?? selectedDriverCandidate?.vehicleId
    ?? null;
  return (
    <Box
      className={`timeline-shell ${compareMode ? 'compare-mode' : ''} ${showRequestedWindow ? 'requested-window-mode' : ''} ${dragActive ? 'drag-active' : ''}`}
      style={{ '--timeline-row-width': `${timelineWidthPercent}%` }}
    >
      <Box className="timeline-header-row">
        <Box className="vehicle-column-heading">
          <Typography variant="caption" fontWeight={700}>車輛／當前司機及任務</Typography>
        </Box>
        <Box className="time-axis">
          {hourMarks.map((hour, index) => (
            <Box key={hour} className="hour-label" sx={{ left: `${(index / HOUR_COUNT) * 100}%` }}>
              {String(hour).padStart(2, '0')}:00
            </Box>
          ))}
          <Box className="now-axis-marker" sx={{ left: `${toPercent(14.5)}%` }}>
            <span>現在</span>
          </Box>
          {showRequestedWindow && requestedWindow && (
            <Box
              className="requested-window-header"
              sx={{ left: `${requestedWindowLeft}%`, width: `${requestedWindowWidth}%` }}
            >
              <span>指定時段</span>
            </Box>
          )}
        </Box>
      </Box>
      {vehicles.map((vehicle) => {
        const candidate = candidates.find((item) => item.vehicleId === vehicle.id);
        const inserted = insertedTasks.filter((item) => item.vehicleId === vehicle.id);
        return (
          <Box
            id={`timeline-vehicle-${vehicle.id}`}
            className={`timeline-row ${highlightedVehicleId === vehicle.id && candidateFocusVehicleId !== vehicle.id ? 'map-highlighted' : ''} ${candidateFocusVehicleId === vehicle.id ? 'candidate-highlighted' : ''}`}
            key={vehicle.id}
          >
            <VehicleInfo
              vehicle={vehicle}
              onLocate={onLocateVehicle}
              assignedCustomer={inserted.at(-1)?.task.customer}
              assignedDriver={inserted.at(-1)?.assignedDriver}
            />
            <Box className="timeline-track">
              {hourMarks.slice(0, -1).map((hour, index) => (
                <Box key={hour} className="hour-gridline" sx={{ left: `${(index / HOUR_COUNT) * 100}%` }} />
              ))}
              {showRequestedWindow && requestedWindow && (
                <Box
                  className="requested-window-band"
                  sx={{ left: `${requestedWindowLeft}%`, width: `${requestedWindowWidth}%` }}
                />
              )}
              <Box className="now-line" sx={{ left: `${toPercent(14.5)}%` }} />
              {vehicle.tasks.map((task) => (
                <TaskBlock
                  key={task.id}
                  task={task}
                  vehicle={vehicle}
                  compareMode={compareMode}
                  scaleMinutes={scaleMinutes}
                  highlighted={highlightedTaskId === task.id}
                  onHighlight={setHighlightedTaskId}
                  onLocate={onLocateVehicle}
                  onReassign={onReassignTask}
                />
              ))}
              {inserted.map((item) => {
                const confirmedTask = {
                  ...item.task,
                  confirmedInsertion: true,
                  station: item.task.station ?? item.task.customer,
                  address: item.task.address ?? item.task.pickup,
                  assignedDriver: item.assignedDriver,
                  start: item.candidate.start,
                  end: item.candidate.end,
                  state: item.candidate.end <= NOW_HOUR
                    ? 'done'
                    : item.candidate.start <= NOW_HOUR
                      ? 'running'
                      : 'ready',
                };
                return (
                  <TaskBlock
                    key={confirmedTask.id}
                    task={confirmedTask}
                    vehicle={vehicle}
                    compareMode={false}
                    scaleMinutes={scaleMinutes}
                    highlighted={highlightedTaskId === confirmedTask.id}
                    onHighlight={setHighlightedTaskId}
                    onLocate={onLocateVehicle}
                    onReassign={onReassignTask}
                  />
                );
              })}
              {candidate && (
                <CandidateSlot
                  candidate={candidate}
                  selectedTask={selectedTask}
                  active={activeCandidate?.vehicleId === vehicle.id}
                  previewing={hoveredCandidate?.vehicleId === vehicle.id}
                  onSelect={onSelectCandidate}
                  onHover={onHoverCandidate}
                  onDropTask={onDropTask}
                />
              )}
            </Box>
          </Box>
        );
      })}
      {selectedTask && !hasAvailableCandidates && (
        <Alert severity="warning" className="no-candidate-alert">
          目前沒有同時符合車輛與司機可用條件的組合。
        </Alert>
      )}
    </Box>
  );
}

function OtherTaskCard({ task, onSelect, onDragStart, onDragEnd, onViewLocation }) {
  return (
    <Paper
      variant="outlined"
      draggable={Boolean(onDragStart)}
      onDragStart={onDragStart ? (event) => onDragStart(event, task) : undefined}
      onDragEnd={onDragEnd}
      onClick={() => onSelect?.(task)}
      className="other-task-card"
      aria-label={`${task.customer}，點擊指派司機與車輛`}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Stack direction="row" spacing={0.7} alignItems="center">
            <Typography variant="caption" fontWeight={750} color="primary">{task.id}</Typography>
          </Stack>
          <Typography className="other-task-station" variant="body2" mt={0.5}>{task.customer}</Typography>
        </Box>
        <Stack className="other-task-hover-actions" direction="row" spacing={0.25} alignItems="center">
          <Tooltip title="地圖定位">
            <IconButton
              className="other-task-location-button"
              size="small"
              draggable={false}
              aria-label={`查看 ${task.customer} 定位`}
              onMouseDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                onViewLocation?.(task);
              }}
            >
              <PinDropOutlined />
            </IconButton>
          </Tooltip>
          {onDragStart && (
            <Tooltip title="拖移至時間軸">
              <DragIndicatorRounded className="other-task-drag-handle" aria-hidden="true" />
            </Tooltip>
          )}
        </Stack>
      </Stack>
      <Stack className="task-summary-meta" spacing={0.7}>
        <Stack direction="row" spacing={0.7} alignItems="center"><LocationOnOutlined className="task-mini-icon" /><Typography variant="caption">{task.address ?? task.pickup}</Typography></Stack>
        <Stack direction="row" spacing={0.7} alignItems="center"><AccessTimeRounded className="task-mini-icon" /><Typography variant="caption">{task.window}｜{task.duration}</Typography></Stack>
      </Stack>
    </Paper>
  );
}

function OrderQueuePanel({
  open,
  width,
  tasks,
  onClose,
  onSelect,
  selectedTask,
  onBackToQueue,
  candidates,
  selectedDriverName,
  activeCandidate,
  hoveredCandidate,
  resolvedCandidatePairs,
  onSelectDriver,
  onSelectCandidate,
  onHoverCandidate,
  onResolveImpact,
  onConfirm,
  confirming,
  onFocusTimeline,
  onDragStart,
  onDragEnd,
  onViewLocation,
  onResizeStart,
  onResizeKeyDown,
}) {
  if (!open) return null;

  return (
    <Paper component="aside" square elevation={0} className="order-queue-paper" aria-label="待插單工作區">
      <Box
        className="order-queue-resize-handle"
        role="separator"
        tabIndex={0}
        aria-label="調整待插單面板寬度"
        aria-orientation="vertical"
        aria-valuemin={Math.min(320, Math.floor(window.innerWidth * 0.35))}
        aria-valuemax={Math.floor(window.innerWidth * 0.35)}
        aria-valuenow={Math.round(width)}
        onPointerDown={onResizeStart}
        onKeyDown={onResizeKeyDown}
      />
      {selectedTask ? (
        <TaskPanel
          embedded
          selectedTask={selectedTask}
          onDragStart={onDragStart}
          candidates={candidates}
          selectedDriverName={selectedDriverName}
          activeCandidate={activeCandidate}
          hoveredCandidate={hoveredCandidate}
          resolvedCandidatePairs={resolvedCandidatePairs}
          onSelectDriver={onSelectDriver}
          onSelectCandidate={onSelectCandidate}
          onHoverCandidate={onHoverCandidate}
          onResolveImpact={onResolveImpact}
          onConfirm={onConfirm}
          confirming={confirming}
          onFocusTimeline={onFocusTimeline}
          onClearSelection={onBackToQueue}
          onClosePanel={onClose}
          onViewLocation={onViewLocation}
        />
      ) : (
        <>
          <Box className="order-queue-header">
            <Box>
              <Typography variant="h6">待插單 ({tasks.length})</Typography>
            </Box>
            <Stack direction="row" spacing={0.75} alignItems="center">
              <IconButton aria-label="關閉待插單訂單" onClick={onClose}><CloseRounded /></IconButton>
            </Stack>
          </Box>
          <Box className="order-queue-list">
            {tasks.length ? (
              <Stack className="order-queue-items" spacing={0}>
                {tasks.map((task) => (
                  <OtherTaskCard
                    key={task.id}
                    task={task}
                    onSelect={onSelect}
                    onDragStart={onDragStart}
                    onDragEnd={onDragEnd}
                    onViewLocation={onViewLocation}
                  />
                ))}
              </Stack>
            ) : (
              <Box className="order-queue-empty">
                <Typography variant="subtitle2">尚無待安插的訂單</Typography>
              </Box>
            )}
          </Box>
        </>
      )}
    </Paper>
  );
}

function ResourceFlow({ label, resourceName, previousTask, task, nextTask }) {
  const taskLabel = (item) => item ? `${item.station} ${formatHour(item.start)}` : '無既定任務';
  return (
    <Box className="resource-flow-row">
      <Box className="resource-flow-heading">
        <Typography component="span">{label}</Typography>
        <Typography component="b">{resourceName}</Typography>
      </Box>
      <Box className="resource-flow-sequence">
        <span>{taskLabel(previousTask)}</span>
        <b>{task.customer} {formatHour(task.start ?? 0)}</b>
        <span>{taskLabel(nextTask)}</span>
      </Box>
    </Box>
  );
}

function DriverCandidateCard({ candidate, vehicleCandidates, selected, activeCandidate, onSelectDriver, onSelectVehicle }) {
  const selectedVehicleCandidate = selected && activeCandidate?.driverName === candidate.driverName
    ? activeCandidate
    : null;
  const impactCandidate = selectedVehicleCandidate ?? candidate;
  const hasDownstreamImpact = impactCandidate.hasDownstreamConflict;
  const selectVehicle = (event) => {
    const selectedCandidate = vehicleCandidates.find((item) => item.pairId === event.target.value);
    if (selectedCandidate) onSelectVehicle(selectedCandidate);
  };
  return (
    <Paper
      variant="outlined"
      className={`candidate-card driver-candidate-card ${selected ? 'active' : ''}`}
      onClick={() => onSelectDriver(selected ? null : candidate.driverName)}
    >
      <Box className="candidate-driver-heading">
        <Typography className="driver-candidate-name" variant="body2">{candidate.driverName}</Typography>
        <Box className="candidate-work-summary">
          <Typography component="span">預估工時</Typography>
          <Typography component="b">{candidate.driverWorkHours}</Typography>
        </Box>
      </Box>
      <Box className="candidate-pair-summary">
        <Box className="candidate-task-timeline">
          <Box className="candidate-task-node">
            <Box className="candidate-task-node-marker" />
            <Box className="candidate-task-node-body">
              <Typography component="span">上一任務</Typography>
              <Typography component="b">
                {candidate.previousDriverTask
                  ? `${candidate.previousDriverTask.station}・${formatHour(candidate.previousDriverTask.end)} 需離站`
                  : '-'}
              </Typography>
            </Box>
          </Box>
          <Box className="candidate-task-node">
            <Box className="candidate-task-node-marker" />
            <Box className="candidate-task-node-body">
              <Typography component="span">下一任務</Typography>
              <Typography component="b">
                {candidate.nextDriverTask
                  ? `${candidate.nextDriverTask.station}・${formatHour(candidate.nextDriverTask.start)} 需抵達`
                  : '-'}
              </Typography>
              {hasDownstreamImpact && (
                <Stack className="candidate-impact-message" direction="row" spacing={0.5} alignItems="center">
                  <WarningRounded />
                  <Typography variant="caption">插單後的任務銜接時間不足</Typography>
                </Stack>
              )}
            </Box>
          </Box>
        </Box>
      </Box>
      <Collapse in={selected} unmountOnExit>
        <Box className="driver-vehicle-picker" onClick={(event) => event.stopPropagation()}>
          <TextField
            select
            fullWidth
            size="small"
            label="車輛"
            value={selectedVehicleCandidate?.pairId ?? ''}
            onChange={selectVehicle}
            slotProps={{
              select: {
                renderValue: (pairId) => vehicleCandidates.find((item) => item.pairId === pairId)?.vehicleId ?? '',
                MenuProps: {
                  slotProps: {
                    paper: {
                      className: 'resource-select-menu-paper',
                      sx: { maxHeight: RESOURCE_MENU_MAX_HEIGHT, overflowY: 'auto' },
                    },
                    list: { sx: { py: 0.5 } },
                  },
                },
              },
            }}
          >
            {vehicleCandidates.map((vehicleCandidate) => (
              <MenuItem key={vehicleCandidate.pairId} value={vehicleCandidate.pairId}>
                <Box className="vehicle-option-content">
                  <Typography component="b">{vehicleCandidate.vehicleId}</Typography>
                  {vehicleCandidate.nextVehicleTask && (
                    <Typography component="span">
                      {`下一任務 ${vehicleCandidate.nextVehicleTask.station}・${formatHour(vehicleCandidate.nextVehicleTask.start)}`}
                    </Typography>
                  )}
                </Box>
              </MenuItem>
            ))}
          </TextField>
        </Box>
      </Collapse>
    </Paper>
  );
}

function DriverReassignmentDialog({ open, impact, onSkip, onForward }) {
  if (!impact) return null;
  const { impactedTask } = impact;

  return (
    <Dialog
      open={open}
      onClose={onSkip}
      fullWidth
      maxWidth="xs"
      aria-labelledby="driver-reassignment-dialog-title"
    >
      <DialogTitle id="driver-reassignment-dialog-title" className="reassignment-dialog-title">
        <Stack direction="row" spacing={1} alignItems="center">
          <WarningRounded />
          <Box>
            <Typography variant="subtitle1">司機下一任務的銜接時間不足</Typography>
            <Typography variant="caption">請確認受影響的任務是否需變更指派</Typography>
          </Box>
        </Stack>
      </DialogTitle>
      <DialogContent className="reassignment-dialog-content">
        <Paper variant="outlined" className="reassignment-task-card">
          <Typography variant="caption" fontWeight={750} color="primary">{impactedTask.id}</Typography>
          <Typography className="reassignment-task-station" variant="body2">{impactedTask.station}</Typography>
          <Stack className="task-summary-meta" spacing={0.7}>
            <Stack direction="row" spacing={0.7} alignItems="center">
              <LocationOnOutlined className="task-mini-icon" />
              <Typography variant="caption">{impactedTask.address}</Typography>
            </Stack>
            <Stack direction="row" spacing={0.7} alignItems="center">
              <AccessTimeRounded className="task-mini-icon" />
              <Typography variant="caption">
                {formatHour(impactedTask.start)}–{formatHour(impactedTask.end)}｜{Math.round((impactedTask.end - impactedTask.start) * 60)} 分
              </Typography>
            </Stack>
          </Stack>
        </Paper>
      </DialogContent>
      <DialogActions className="reassignment-dialog-actions">
        <Button color="inherit" onClick={onSkip}>稍後處理</Button>
        <Button variant="contained" onClick={onForward}>前往指派</Button>
      </DialogActions>
    </Dialog>
  );
}

function CandidateCard({ candidate, task, active, previewing, impactResolved, onSelect, onHover, onResolveImpact }) {
  const hasBlockingImpact = candidate.hasDownstreamConflict && !impactResolved;
  const nextDriverTrip = candidate.nextDriverTask?.id.split('-').at(-1);
  return (
    <Paper
      variant="outlined"
      className={`candidate-card ${active ? 'active' : ''} ${previewing ? 'previewing' : ''}`}
      onClick={() => onSelect(candidate)}
      onMouseEnter={() => onHover(candidate)}
      onMouseLeave={() => onHover(null)}
    >
      <Stack className="candidate-card-header" direction="row" alignItems="flex-start">
        <Box className="candidate-primary-info">
          <Typography className="candidate-pair-id" variant="body2">{candidate.vehicleId}</Typography>
        </Box>
        {previewing && !active && <Typography className="candidate-preview-status" variant="caption">預覽</Typography>}
        {active && <Typography className="candidate-preview-status" variant="caption">預覽中</Typography>}
      </Stack>
      <Box className="vehicle-candidate-summary">
        <Stack direction="row" spacing={0.75} alignItems="center">
          <LocalShippingRounded />
          <Typography variant="caption">指定時段可用，不調整原牛奶便車輛</Typography>
        </Stack>
      </Box>
      {active && (
        <Box className="resource-pair-preview" onClick={(event) => event.stopPropagation()}>
          <Typography className="resource-preview-title" variant="caption">司機行程</Typography>
          <ResourceFlow label="司機" resourceName={candidate.driverName} previousTask={candidate.previousDriverTask} task={{ ...task, start: candidate.start }} nextTask={candidate.nextDriverTask} />
          {hasBlockingImpact && (
          <Box className="downstream-impact-check blocking">
            <WarningRounded />
            <Box>
              <Typography variant="caption" fontWeight={750}>後續任務影響</Typography>
              <Typography variant="caption">
                {`安排後，${candidate.driverName} ${formatHour(candidate.nextDriverTask.start)} 的便次 ${nextDriverTrip} 將無人執行。`}
              </Typography>
              <Button className="impact-replacement-action" size="small" variant="outlined" onClick={() => onResolveImpact(candidate)}>安排接替司機</Button>
            </Box>
          </Box>
          )}
        </Box>
      )}
    </Paper>
  );
}

function TaskPanel({ selectedTask, onDragStart, candidates, selectedDriverName, activeCandidate, hoveredCandidate, resolvedCandidatePairs, onSelectDriver, onSelectCandidate, onHoverCandidate, onResolveImpact, onConfirm, confirming = false, onClearSelection, onClosePanel, onViewLocation, onFocusTimeline, embedded = false }) {
  const [manualPickerOpen, setManualPickerOpen] = useState(false);
  const driverCandidates = candidates.filter((candidate, index, items) => (
    items.findIndex((item) => item.driverName === candidate.driverName) === index
  ));

  const selectDriverOption = (driverName) => {
    setManualPickerOpen(false);
    onSelectDriver(driverName);
  };

  const toggleManualOption = () => {
    const next = !manualPickerOpen;
    setManualPickerOpen(next);
    if (next) onSelectDriver(null);
  };

  useEffect(() => {
    setManualPickerOpen(false);
  }, [selectedTask.id]);

  useEffect(() => {
    if (!selectedDriverName || manualPickerOpen) return;
    window.setTimeout(() => {
      document.querySelector('.order-queue-task-panel .driver-candidate-card.active')?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }, 80);
  }, [selectedDriverName, manualPickerOpen]);

  return (
    <Paper variant="outlined" className={`task-panel ${embedded ? 'order-queue-task-panel' : ''}`}>
      <Box className="panel-heading">
        <Stack className="panel-title-with-back" direction="row" spacing={0.5} alignItems="center">
          {embedded && (
            <IconButton size="small" aria-label="返回待插單列表" onClick={onClearSelection}><ChevronLeftRounded /></IconButton>
          )}
          <Typography variant="subtitle1">指派司機與車輛</Typography>
        </Stack>
        <IconButton size="small" aria-label="關閉插單安排" onClick={embedded ? onClosePanel : onClearSelection}><CloseRounded /></IconButton>
      </Box>
      <Box className="task-panel-scroll">
        <Box
          className={`assessment-order-summary ${selectedTask.assignmentMode === 'reassign-driver' ? 'reassignment' : ''}`}
          draggable={Boolean(onDragStart)}
          onDragStart={onDragStart ? (event) => onDragStart(event, selectedTask) : undefined}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
            <Box>
              <Typography variant="caption" fontWeight={750} color="primary">{selectedTask.id}</Typography>
              <Typography className="assessment-order-station" variant="body2" mt={0.35}>{selectedTask.station ?? selectedTask.customer}</Typography>
            </Box>
            <Stack className="assessment-order-actions" direction="row" spacing={0.25}>
              {selectedTask.assignmentMode === 'reassign-driver' && (
                <Tooltip title="查看時間軸">
                  <IconButton
                    className="assessment-timeline-focus-button"
                    size="small"
                    aria-label="查看時間軸"
                    onClick={(event) => {
                      event.stopPropagation();
                      onFocusTimeline(selectedTask);
                    }}
                  >
                    <ViewTimelineOutlined />
                  </IconButton>
                </Tooltip>
              )}
              <Tooltip title="地圖定位">
                <IconButton
                  className="assessment-location-button"
                  size="small"
                  aria-label="地圖定位"
                  onClick={(event) => {
                    event.stopPropagation();
                    onViewLocation(selectedTask);
                  }}
                >
                  <PinDropOutlined />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>
          <Stack className="task-summary-meta" spacing={0.7}>
            <Stack direction="row" spacing={0.7} alignItems="center"><LocationOnOutlined className="task-mini-icon" /><Typography variant="caption">{selectedTask.address ?? selectedTask.pickup}</Typography></Stack>
            <Stack direction="row" spacing={0.7} alignItems="center"><AccessTimeRounded className="task-mini-icon" /><Typography variant="caption">{selectedTask.window}｜{selectedTask.duration}</Typography></Stack>
          </Stack>
        </Box>
        <Box className="candidate-section">
          <Typography className="candidate-section-title" variant="subtitle2" fontWeight={750}>插入空檔</Typography>
          {driverCandidates.length > 0 && (
            <Stack spacing={1}>
              {driverCandidates.map((candidate) => (
                <DriverCandidateCard
                  key={candidate.driverName}
                  candidate={candidate}
                  vehicleCandidates={candidates.filter((item) => item.driverName === candidate.driverName)}
                  selected={!manualPickerOpen && selectedDriverName === candidate.driverName}
                  activeCandidate={activeCandidate}
                  onSelectDriver={selectDriverOption}
                  onSelectVehicle={onSelectCandidate}
                />
              ))}
            </Stack>
          )}
          {driverCandidates.length === 0 && (
            <Typography className="candidate-empty-hint" variant="body2">
              目前值班的司機尚無對應空檔
            </Typography>
          )}
          <Paper
            variant="outlined"
            className={`manual-resource-option-card ${manualPickerOpen ? 'expanded' : ''}`}
          >
            <Box
              component="button"
              type="button"
              className="manual-resource-option-trigger"
              aria-expanded={manualPickerOpen}
              onClick={toggleManualOption}
            >
              <AddRounded />
              <Typography variant="body2">指定司機與車輛</Typography>
            </Box>
            <Collapse in={manualPickerOpen} unmountOnExit>
              <ManualResourcePicker
                task={selectedTask}
                onDriverChange={onSelectDriver}
                onSelect={onSelectCandidate}
              />
            </Collapse>
          </Paper>
        </Box>
      </Box>
      <Box className="task-panel-actions">
        <Button fullWidth variant="contained" disabled={!activeCandidate || confirming} onClick={onConfirm}>
          {confirming ? (
            <Stack direction="row" spacing={0.75} alignItems="center">
              <CircularProgress size={15} color="inherit" />
              <span>指派中…</span>
            </Stack>
          ) : '確認指派'}
        </Button>
      </Box>
    </Paper>
  );
}

function ManualResourcePicker({ task, onSelect, onDriverChange }) {
  const [vehicleId, setVehicleId] = useState('');
  const [driverName, setDriverName] = useState('');

  useEffect(() => {
    setVehicleId('');
    setDriverName('');
  }, [task.id]);

  const driverCandidates = initialVehicles
    .flatMap(getVehicleDriverOptions)
    .filter((driver) => driver.name && driver.name !== '待指派')
    .filter((driver, index, items) => items.findIndex((item) => item.name === driver.name) === index);
  const vehicleCandidates = initialVehicles.filter((vehicle) => vehicle.serviceType === 'other-business');
  const selectedDriver = driverCandidates.find((driver) => driver.name === driverName);
  const chooseDriver = (event) => {
    const nextDriverName = event.target.value;
    setDriverName(nextDriverName);
    setVehicleId('');
    onDriverChange?.(nextDriverName);
  };

  const chooseVehicle = (event) => {
    const nextVehicleId = event.target.value;
    setVehicleId(nextVehicleId);
    if (!task || !selectedDriver) return;
    onSelect(buildCandidatePair(
      { ...getTaskWindowRange(task), taskId: task.id, vehicleId: nextVehicleId },
      selectedDriver,
    ));
  };

  return (
    <Box className="inline-manual-resource-picker">
      <Box className="inline-manual-resource-fields">
        <TextField
          select
          fullWidth
          size="small"
          label="司機"
          value={driverName}
          onChange={chooseDriver}
          slotProps={{
            select: {
              renderValue: (value) => value,
              MenuProps: {
                slotProps: {
                  paper: {
                    className: 'resource-select-menu-paper',
                    sx: { maxHeight: RESOURCE_MENU_MAX_HEIGHT, overflowY: 'auto' },
                  },
                  list: { sx: { py: 0.5 } },
                },
              },
            },
          }}
        >
          {driverCandidates.map((driver) => (
            <MenuItem className="resource-select-menu-item" key={driver.name} value={driver.name}>
              {`${driver.name}（預估工時 ${driver.workHours}）`}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          fullWidth
          size="small"
          label="車輛"
          value={vehicleId}
          onChange={chooseVehicle}
          disabled={!driverName}
          slotProps={{
            select: {
              MenuProps: {
                slotProps: {
                  paper: {
                    className: 'resource-select-menu-paper',
                    sx: { maxHeight: RESOURCE_MENU_MAX_HEIGHT, overflowY: 'auto' },
                  },
                  list: { sx: { py: 0.5 } },
                },
              },
            },
          }}
        >
          {vehicleCandidates.map((vehicle) => <MenuItem className="resource-select-menu-item" key={vehicle.id} value={vehicle.id}>{vehicle.id}</MenuItem>)}
        </TextField>
      </Box>
    </Box>
  );
}

function KeyInDialog({ open, onClose, onCreate }) {
  const [form, setForm] = useState(initialKeyInForm);
  const setField = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  const requiredReady = form.customer && form.pickupName && form.pickupAddress && form.deliveryName && form.deliveryAddress && form.date && form.startTime && form.endTime;

  const submit = () => {
    if (!requiredReady) return;
    onCreate({
      id: 'OTH-0246',
      customer: form.customer,
      station: form.deliveryName,
      address: form.pickupAddress,
      route: `${form.pickupName} → ${form.deliveryName}`,
      pickup: form.pickupAddress,
      pickupPosition: [24.9716, 121.2368],
      delivery: form.deliveryAddress,
      window: `${form.startTime}–${form.endTime}`,
      duration: `${form.duration || 0} 分`,
      cargo: `${form.pallets || 0} 板｜${form.weight || 0} 噸`,
      tone: 'primary',
      manual: true,
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { height: 'min(760px, calc(100vh - 48px))' } }}
    >
      <DialogTitle className="keyin-heading">
        <Typography variant="h6">新增他項任務</Typography>
        <IconButton aria-label="關閉新增訂單" onClick={onClose}><CloseRounded /></IconButton>
      </DialogTitle>
      <DialogContent dividers className="keyin-body">
        <Box className="keyin-form-grid">
          <Box>
            <Box className="form-section">
              <Typography variant="subtitle2">基本資訊</Typography>
              <TextField required size="small" label="客戶名稱" value={form.customer} onChange={setField('customer')} fullWidth />
            </Box>

            <Box className="form-section">
              <Typography variant="subtitle2">取送地點</Typography>
              <TextField required size="small" label="取貨站點" value={form.pickupName} onChange={setField('pickupName')} fullWidth />
              <TextField required size="small" label="取貨地址" value={form.pickupAddress} onChange={setField('pickupAddress')} fullWidth />
              <TextField required size="small" label="送貨站點" value={form.deliveryName} onChange={setField('deliveryName')} fullWidth />
              <TextField required size="small" label="送貨地址" value={form.deliveryAddress} onChange={setField('deliveryAddress')} fullWidth />
            </Box>
          </Box>
          <Box>
            <Box className="form-section">
              <Typography variant="subtitle2">時間條件</Typography>
              <TextField required size="small" type="date" label="配送日期" value={form.date} onChange={setField('date')} fullWidth slotProps={{ inputLabel: { shrink: true } }} />
              <Box className="form-two-columns">
                <TextField required size="small" type="time" label="開始時間" value={form.startTime} onChange={setField('startTime')} slotProps={{ inputLabel: { shrink: true } }} />
                <TextField required size="small" type="time" label="最晚完成" value={form.endTime} onChange={setField('endTime')} slotProps={{ inputLabel: { shrink: true } }} />
              </Box>
              <TextField size="small" type="number" label="預估作業時間（分）" value={form.duration} onChange={setField('duration')} fullWidth />
            </Box>

            <Box className="form-section">
              <Typography variant="subtitle2">貨物資訊</Typography>
              <Box className="form-two-columns">
                <TextField size="small" type="number" label="板數" value={form.pallets} onChange={setField('pallets')} />
                <TextField size="small" type="number" label="重量（噸）" value={form.weight} onChange={setField('weight')} />
              </Box>
            </Box>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions className="keyin-actions">
        <Button color="inherit" onClick={onClose}>取消</Button>
        <Button variant="contained" disabled={!requiredReady} onClick={submit}>建立訂單</Button>
      </DialogActions>
    </Dialog>
  );
}

function PreviewDialog({ open, task, candidate, vehicle, onClose, onConfirm }) {
  if (!task || !candidate || !vehicle) return null;
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle className="dialog-title">
        <Box>
          <Typography variant="h6">預覽調整前後</Typography>
          <Typography variant="body2" color="text.secondary">確認前不會修改正式派車計畫</Typography>
        </Box>
        <IconButton onClick={onClose}><CloseRounded /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Stack direction="row" spacing={1} mb={2} alignItems="center">
          <Chip color="primary" label={task.id} />
          <Typography variant="subtitle1">{task.customer}</Typography>
          <ArrowForwardRounded color="action" />
          <Chip variant="outlined" icon={<LocalShippingRounded />} label={`${vehicle.id}・${vehicle.driver}`} />
        </Stack>
        <Box className="preview-route">
          <Box className="route-point start"><span /><Typography variant="caption">取貨</Typography><b>{task.pickup}</b><small>預計 15:02</small></Box>
          <Box className="route-line"><span>行駛約 34 分</span></Box>
          <Box className="route-point end"><span /><Typography variant="caption">送達</Typography><b>{task.delivery}</b><small>預計 15:48</small></Box>
        </Box>
        <Typography variant="subtitle2" mt={3} mb={1.2}>安插後影響</Typography>
        <Box className="impact-grid">
          <Box><Typography variant="caption">增加行駛時間</Typography><Typography variant="h6">+{candidate.extraMinutes} 分</Typography></Box>
          <Box><Typography variant="caption">增加里程</Typography><Typography variant="h6">+{candidate.extraKm} km</Typography></Box>
          <Box><Typography variant="caption">後續牛奶便</Typography><Typography variant="h6" color={candidate.nextDelay > 10 ? 'warning.main' : 'success.main'}>{candidate.nextDelay ? `預估 +${candidate.nextDelay} 分` : '預估無影響'}</Typography></Box>
        </Box>
        {candidate.nextDelay > 0 ? (
          <Alert severity={candidate.nextDelay > 10 ? 'warning' : 'info'} sx={{ mt: 2 }}>
            安插後，下一個固定牛奶便預估延後 {candidate.nextDelay} 分。請確認是否仍在可接受範圍。
          </Alert>
        ) : (
          <Alert severity="success" sx={{ mt: 2 }}>依目前計畫與路況推估，安插後不影響下一個固定牛奶便。</Alert>
        )}
        <Box className="before-after" mt={2}>
          <Box><span>調整前</span><b>{formatHour(candidate.start)}–{formatHour(candidate.end)} 保留車輛空檔</b></Box>
          <ArrowForwardRounded />
          <Box className="after"><span>調整後</span><b>{formatHour(candidate.start)} 開始執行插單，後續牛奶便{candidate.nextDelay ? `預估延後 ${candidate.nextDelay} 分` : '預估不受影響'}</b></Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button color="inherit" onClick={onClose}>取消</Button>
        <Button variant="contained" onClick={onConfirm} startIcon={<CheckCircleRounded />}>確認安排</Button>
      </DialogActions>
    </Dialog>
  );
}

export default function App() {
  const [activePage, setActivePage] = useState('monitoring');
  const [otherTasks, setOtherTasks] = useState(initialOtherTasks);
  const [selectedTask, setSelectedTask] = useState(null);
  const [draggedTask, setDraggedTask] = useState(null);
  const [selectedDriverName, setSelectedDriverName] = useState(null);
  const [activeCandidate, setActiveCandidate] = useState(null);
  const [hoveredCandidate, setHoveredCandidate] = useState(null);
  const [resolvedCandidatePairs, setResolvedCandidatePairs] = useState(() => new Set());
  const [orderQueueOpen, setOrderQueueOpen] = useState(false);
  const [orderQueueWidth, setOrderQueueWidth] = useState(320);
  const [keyInOpen, setKeyInOpen] = useState(false);
  const [insertedTasks, setInsertedTasks] = useState([]);
  const [taskDriverOverrides, setTaskDriverOverrides] = useState({});
  const [pendingDriverReassignment, setPendingDriverReassignment] = useState(null);
  const [reassignmentDialogOpen, setReassignmentDialogOpen] = useState(false);
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [mapExpanded, setMapExpanded] = useState(false);
  const [mapHeight, setMapHeight] = useState(300);
  const [overviewFilter, setOverviewFilter] = useState('all');
  const [focusedVehicleId, setFocusedVehicleId] = useState(null);
  const [stationMapFocus, setStationMapFocus] = useState(null);
  const [mapFocusRequest, setMapFocusRequest] = useState(null);
  const [sidebarExpanded, setSidebarExpanded] = useState(() => window.matchMedia('(min-width: 1180px)').matches);
  const [showActualExecution, setShowActualExecution] = useState(true);
  const [timelineScaleMinutes, setTimelineScaleMinutes] = useState(10);
  const [maximizedView, setMaximizedView] = useState(null);

  const navigateToPage = (page) => {
    setActivePage(page);
    setMaximizedView(null);
    if (page !== 'monitoring') {
      setOrderQueueOpen(false);
      setSelectedTask(null);
      setMapExpanded(false);
    }
  };

  useEffect(() => {
    const compactViewport = window.matchMedia('(max-width: 1179px)');
    const syncSidebarToViewport = (event) => setSidebarExpanded(!event.matches);
    syncSidebarToViewport(compactViewport);
    compactViewport.addEventListener('change', syncSidebarToViewport);
    return () => compactViewport.removeEventListener('change', syncSidebarToViewport);
  }, []);

  useEffect(() => {
    const keepPanelWithinViewport = () => {
      const maximumWidth = Math.floor(window.innerWidth * 0.35);
      const minimumWidth = Math.min(320, maximumWidth);
      setOrderQueueWidth((current) => Math.min(maximumWidth, Math.max(minimumWidth, current)));
    };
    window.addEventListener('resize', keepPanelWithinViewport);
    keepPanelWithinViewport();
    return () => window.removeEventListener('resize', keepPanelWithinViewport);
  }, []);

  const clampOrderQueueWidth = (width) => {
    const maximumWidth = Math.floor(window.innerWidth * 0.35);
    const minimumWidth = Math.min(320, maximumWidth);
    return Math.min(maximumWidth, Math.max(minimumWidth, width));
  };

  const startOrderQueueResize = (event) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = orderQueueWidth;
    document.body.classList.add('order-queue-resizing');

    const resizePanel = (moveEvent) => {
      setOrderQueueWidth(clampOrderQueueWidth(startWidth + startX - moveEvent.clientX));
    };
    const finishResize = () => {
      document.body.classList.remove('order-queue-resizing');
      document.removeEventListener('pointermove', resizePanel);
      document.removeEventListener('pointerup', finishResize);
      document.removeEventListener('pointercancel', finishResize);
    };

    document.addEventListener('pointermove', resizePanel);
    document.addEventListener('pointerup', finishResize);
    document.addEventListener('pointercancel', finishResize);
  };

  const resizeOrderQueueWithKeyboard = (event) => {
    const steps = { ArrowLeft: 24, ArrowRight: -24 };
    if (event.key in steps) {
      event.preventDefault();
      setOrderQueueWidth((current) => clampOrderQueueWidth(current + steps[event.key]));
      return;
    }
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      const maximumWidth = Math.floor(window.innerWidth * 0.35);
      setOrderQueueWidth(event.key === 'Home' ? Math.min(320, maximumWidth) : maximumWidth);
    }
  };

  const assessmentTask = selectedTask ?? draggedTask;
  const candidates = useMemo(() => {
    if (!assessmentTask) return [];
    if (assessmentTask.assignmentMode === 'reassign-driver') {
      const taskWindow = getTaskWindowRange(assessmentTask);
      const drivers = initialVehicles
        .flatMap(getVehicleDriverOptions)
        .filter((driver) => driver.name && driver.name !== '待指派' && driver.name !== assessmentTask.originalDriverName)
        .filter((driver, index, items) => items.findIndex((item) => item.name === driver.name) === index);

      return drivers
        .map((driver) => buildCandidatePair({
          ...taskWindow,
          taskId: assessmentTask.id,
          vehicleId: assessmentTask.fixedVehicleId,
        }, driver))
        .filter((candidate) => candidate?.driverAssignments.every((task) => (
          task.end <= candidate.start || task.start >= candidate.end
        )))
        .filter((candidate) => candidate.previousDriverTask && candidate.nextDriverTask)
        .slice(0, OTHER_BUSINESS_VEHICLE_OPTION_LIMIT);
    }
    const driverSeedCandidates = (candidatesByTask[assessmentTask.id] || [])
      .map((candidate) => alignCandidateToTaskWindow(candidate, assessmentTask));
    const eligibleDrivers = getEligibleDriversForCandidates(driverSeedCandidates);
    const taskWindow = getTaskWindowRange(assessmentTask);
    const vehiclePool = initialVehicles.filter((vehicle) => vehicle.serviceType === 'other-business');

    return eligibleDrivers.flatMap((driver) => vehiclePool
      .map((vehicle) => buildCandidatePair({
        ...taskWindow,
        taskId: assessmentTask.id,
        vehicleId: vehicle.id,
        distanceToPickupKm: assessmentTask.pickupPosition
          ? calculateDistanceKm(vehicle.position, assessmentTask.pickupPosition)
          : null,
      }, driver))
      .filter(candidatePairIsAvailable)
      .filter((candidate) => candidate.previousDriverTask || candidate.nextDriverTask)
      .sort((candidateA, candidateB) => (
        (candidateA.distanceToPickupKm ?? Number.POSITIVE_INFINITY)
        - (candidateB.distanceToPickupKm ?? Number.POSITIVE_INFINITY)
      ))
      .slice(0, OTHER_BUSINESS_VEHICLE_OPTION_LIMIT));
  }, [assessmentTask]);
  const driverTimelineCandidates = useMemo(() => {
    if (!assessmentTask) return [];
    const candidatesByDriver = new Map();
    candidates.forEach((candidate) => {
      if (!candidatesByDriver.has(candidate.driverName)) {
        candidatesByDriver.set(candidate.driverName, candidate);
      }
    });

    return [...candidatesByDriver.values()].map((candidate) => {
      const currentDriverVehicle = initialVehicles.find((vehicle) => vehicle.driver === candidate.driverName)
        ?? initialVehicles.find((vehicle) => (
          getVehicleDriverOptions(vehicle).some((driver) => driver.name === candidate.driverName)
        ));
      return currentDriverVehicle
        ? { ...candidate, vehicleId: currentDriverVehicle.id }
        : candidate;
    });
  }, [assessmentTask, candidates]);

  const timelineCandidates = useMemo(() => {
    const visibleCandidates = driverTimelineCandidates.filter((candidate) => (
      !activeCandidate
      || (candidate.driverName !== activeCandidate.driverName && candidate.vehicleId !== activeCandidate.vehicleId)
    ));
    if (activeCandidate) {
      visibleCandidates.push(activeCandidate);
    }
    return visibleCandidates;
  }, [driverTimelineCandidates, activeCandidate]);
  const candidateFocus = hoveredCandidate || activeCandidate;
  const candidateFocusVehicle = candidateFocus
    ? initialVehicles.find((vehicle) => vehicle.id === candidateFocus.vehicleId)
    : null;
  const comparisonVehicle = stationMapFocus
    ? initialVehicles.find((vehicle) => vehicle.id === stationMapFocus.vehicleId)
    : candidateFocusVehicle;
  const comparisonTarget = stationMapFocus ?? (assessmentTask?.pickupPosition
    ? { position: assessmentTask.pickupPosition, label: `插單站點｜${assessmentTask.station ?? assessmentTask.customer}` }
    : null);
  const comparisonDistanceKm = comparisonVehicle && comparisonTarget?.position
    ? calculateDistanceKm(comparisonVehicle.position, comparisonTarget.position)
    : null;
  const filteredVehicles = useMemo(() => {
    let matchedVehicles = initialVehicles;
    if (overviewFilter === 'running') {
      matchedVehicles = initialVehicles.filter(vehicleIsRunning);
    } else if (overviewFilter === 'abnormal') {
      matchedVehicles = initialVehicles.filter(vehicleHasAbnormal);
    }

    return matchedVehicles
      .map((vehicle, originalIndex) => ({ vehicle, originalIndex }))
      .sort((itemA, itemB) => (
        getVehicleOverviewOrder(itemA.vehicle) - getVehicleOverviewOrder(itemB.vehicle)
        || itemA.originalIndex - itemB.originalIndex
      ))
      .map(({ vehicle }) => vehicle);
  }, [overviewFilter]);
  const timelineVehicles = useMemo(() => filteredVehicles.map((vehicle) => ({
    ...vehicle,
    tasks: vehicle.tasks.map((task) => (
      taskDriverOverrides[task.id]
        ? { ...task, assignedDriver: taskDriverOverrides[task.id] }
        : task
    )),
  })), [filteredVehicles, taskDriverOverrides]);

  const selectTask = (task) => {
    setOverviewFilter('all');
    setDraggedTask(null);
    setSelectedTask(task);
    setSelectedDriverName(null);
    setActiveCandidate(null);
    setHoveredCandidate(null);
    setStationMapFocus(null);
  };

  const clearTaskAssessment = () => {
    setDraggedTask(null);
    setSelectedTask(null);
    setSelectedDriverName(null);
    setActiveCandidate(null);
    setHoveredCandidate(null);
    setStationMapFocus(null);
  };

  const closeOrderQueue = () => {
    setOrderQueueOpen(false);
    clearTaskAssessment();
  };

  const startDrag = (event, task) => {
    setOverviewFilter('all');
    setDraggedTask(task);
    setSelectedDriverName(null);
    setActiveCandidate(null);
    setHoveredCandidate(null);
    setStationMapFocus(null);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', task.id);

    const dragPreview = document.createElement('div');
    dragPreview.className = 'task-drag-preview';
    const title = document.createElement('strong');
    title.textContent = task.customer;
    const meta = document.createElement('span');
    meta.textContent = `${task.id}・${task.window}`;
    dragPreview.append(title, meta);
    document.body.appendChild(dragPreview);
    event.dataTransfer.setDragImage(dragPreview, 20, 20);
    window.setTimeout(() => dragPreview.remove(), 0);
  };

  const finishDrag = () => {
    setDraggedTask(null);
  };

  const confirmInsertion = () => {
    if (!selectedTask || !activeCandidate || assignmentLoading) return;
    const insertedTask = selectedTask;
    const insertionCandidate = activeCandidate;
    if (insertedTask.assignmentMode === 'reassign-driver') {
      setAssignmentLoading(true);
      window.setTimeout(() => {
        setTaskDriverOverrides((current) => ({
          ...current,
          [insertedTask.id]: insertionCandidate.driverName,
        }));
        setResolvedCandidatePairs((current) => new Set([
          ...current,
          insertionCandidate.pairId ?? getCandidatePairId(insertionCandidate),
        ]));
        setPendingDriverReassignment(null);
        setSelectedTask(null);
        setSelectedDriverName(null);
        setActiveCandidate(null);
        setHoveredCandidate(null);
        setAssignmentLoading(false);
        setSnackbarMessage('已指派，排程已更新');
      }, ASSIGNMENT_LOADING_DURATION_MS);
      return;
    }
    const hasPendingReassignment = Boolean(
      insertionCandidate.hasDownstreamConflict && insertionCandidate.nextDriverTask,
    );
    setAssignmentLoading(true);

    window.setTimeout(() => {
      setInsertedTasks((items) => [...items, {
        task: insertedTask,
        candidate: insertionCandidate,
        vehicleId: insertionCandidate.vehicleId,
        assignedDriver: insertionCandidate.driverName,
      }]);
      setOtherTasks((tasks) => tasks.filter((task) => task.id !== insertedTask.id));
      setSelectedTask(null);
      setSelectedDriverName(null);
      setActiveCandidate(null);
      setHoveredCandidate(null);
      setAssignmentLoading(false);
      setSnackbarMessage('已指派，排程已更新');

      if (hasPendingReassignment) {
        const nextImpact = {
          candidate: insertionCandidate,
          impactedTask: insertionCandidate.nextDriverTask,
        };
        setPendingDriverReassignment(nextImpact);
        window.setTimeout(() => {
          setReassignmentDialogOpen(true);
        }, POST_ASSIGNMENT_DIALOG_DELAY_MS);
      }
    }, ASSIGNMENT_LOADING_DURATION_MS);
  };

  const skipDriverReassignment = () => {
    setReassignmentDialogOpen(false);
    setPendingDriverReassignment(null);
    setSnackbarMessage('');
  };

  const openTaskAssignmentPanel = (task, vehicleId, originalDriverName) => {
    if (!task || !vehicleId) return;
    setReassignmentDialogOpen(false);
    setSnackbarMessage('');
    setOrderQueueOpen(true);
    setSelectedTask({
      ...task,
      customer: task.station,
      window: `${formatHour(task.start)}–${formatHour(task.end)}`,
      duration: `${Math.round((task.end - task.start) * 60)} 分`,
      assignmentMode: 'reassign-driver',
      fixedVehicleId: vehicleId,
      originalDriverName,
    });
    setSelectedDriverName(null);
    setActiveCandidate(null);
    setHoveredCandidate(null);
    setStationMapFocus(null);
  };

  const openDriverReassignmentPanel = () => {
    if (!pendingDriverReassignment?.impactedTask) return;
    const { candidate, impactedTask } = pendingDriverReassignment;
    openTaskAssignmentPanel(impactedTask, impactedTask.vehicleId, candidate.driverName);
  };

  const openTimelineTaskAssignmentPanel = (vehicle, task) => {
    openTaskAssignmentPanel(task, vehicle.id, task.assignedDriver ?? vehicle.driver);
  };

  const resolveCandidateImpact = (candidate) => {
    setResolvedCandidatePairs((current) => new Set([
      ...current,
      candidate.pairId ?? getCandidatePairId(candidate),
      getDriverImpactId(candidate),
    ]));
    setSnackbarMessage('已安排接替司機，後續任務衝突已解除');
  };

  const createKeyedTask = (task) => {
    setOtherTasks((current) => [task, ...current.filter((item) => item.id !== task.id)]);
    setKeyInOpen(false);
    setOrderQueueOpen(true);
    setSnackbarMessage('訂單已建立並加入待安排清單');
  };

  const scrollCandidateIntoView = (candidate) => {
    if (!candidate) return;
    window.setTimeout(() => {
      const slot = document.getElementById(`candidate-slot-${candidate.vehicleId}`);
      const row = document.getElementById(`timeline-vehicle-${candidate.vehicleId}`);
      const timeline = row?.closest('.timeline-shell');
      if (!row || !timeline) return;

      const timelineRect = timeline.getBoundingClientRect();
      const rowRect = row.getBoundingClientRect();
      const stickyColumnWidth = 176;
      const stickyHeaderHeight = 36;
      const trackViewportWidth = Math.max(1, timeline.clientWidth - stickyColumnWidth);
      const trackViewportCenter = timelineRect.left + stickyColumnWidth + trackViewportWidth / 2;
      const bodyViewportHeight = Math.max(1, timeline.clientHeight - stickyHeaderHeight);
      const bodyViewportCenter = timelineRect.top + stickyHeaderHeight + bodyViewportHeight / 2;
      const nextLeft = slot
        ? Math.max(0, timeline.scrollLeft + (slot.getBoundingClientRect().left + slot.getBoundingClientRect().width / 2 - trackViewportCenter))
        : timeline.scrollLeft;

      timeline.scrollTo({
        left: nextLeft,
        top: Math.max(0, timeline.scrollTop + (rowRect.top + rowRect.height / 2 - bodyViewportCenter)),
        behavior: 'smooth',
      });
    }, 80);
  };

  const focusTaskInTimeline = (task) => {
    const vehicleId = task.fixedVehicleId ?? task.vehicleId;
    if (!vehicleId) return;
    setOverviewFilter('all');
    setFocusedVehicleId(vehicleId);
    setStationMapFocus(null);

    window.setTimeout(() => {
      const row = document.getElementById(`timeline-vehicle-${vehicleId}`);
      const timeline = row?.closest('.timeline-shell');
      const track = row?.querySelector('.timeline-track');
      if (!row || !timeline || !track) return;
      const taskCenterHour = ((task.start ?? NOW_HOUR) + (task.end ?? task.start ?? NOW_HOUR)) / 2;
      const taskCenterRatio = Math.max(0, Math.min(1, (taskCenterHour - START_HOUR) / HOUR_COUNT));
      const stickyColumnWidth = 176;
      const trackViewportWidth = Math.max(1, timeline.clientWidth - stickyColumnWidth);
      const targetLeft = track.offsetLeft + (track.clientWidth * taskCenterRatio);
      const bodyViewportHeight = Math.max(1, timeline.clientHeight - 36);

      timeline.scrollTo({
        left: Math.max(0, targetLeft - stickyColumnWidth - (trackViewportWidth / 2)),
        top: Math.max(0, row.offsetTop - 36 - ((bodyViewportHeight - row.offsetHeight) / 2)),
        behavior: 'smooth',
      });
    }, 80);
  };

  const selectCandidatePreview = (candidate, taskOverride = null) => {
    const taskContext = taskOverride ?? selectedTask;
    setOverviewFilter('all');
    setSelectedDriverName(candidate.driverName);
    setActiveCandidate(candidate);
    setHoveredCandidate(null);
    setStationMapFocus(null);
    setFocusedVehicleId(candidate.vehicleId);
    const vehicle = initialVehicles.find((item) => item.id === candidate.vehicleId);
    setMapFocusRequest({
      vehicleId: candidate.vehicleId,
      positions: vehicle && taskContext?.pickupPosition ? [vehicle.position, taskContext.pickupPosition] : undefined,
      requestId: Date.now(),
    });
    scrollCandidateIntoView(candidate);
  };

  const selectDriverForTask = (driverName) => {
    setSelectedDriverName(driverName);
    setActiveCandidate(null);
    setStationMapFocus(null);
    if (!driverName) {
      setHoveredCandidate(null);
      setFocusedVehicleId(null);
      return;
    }

    const focusCandidate = driverTimelineCandidates.find((candidate) => candidate.driverName === driverName);
    const assignedVehicle = initialVehicles.find((vehicle) => (
      getVehicleDriverOptions(vehicle).some((driver) => driver.name === driverName)
    ));
    const focusVehicleId = focusCandidate?.vehicleId ?? assignedVehicle?.id ?? null;
    setOverviewFilter('all');
    setHoveredCandidate(focusCandidate ?? null);
    setFocusedVehicleId(focusVehicleId);
    if (focusVehicleId) {
      scrollCandidateIntoView(focusCandidate ?? { vehicleId: focusVehicleId });
    }
  };

  const dropTaskOnCandidate = (candidate) => {
    if (!draggedTask) return;
    const task = draggedTask;
    setSelectedTask(task);
    setDraggedTask(null);
    selectDriverForTask(candidate.driverName);
  };

  const focusVehicleFromMap = (vehicle) => {
    setOverviewFilter('all');
    setStationMapFocus(null);
    setFocusedVehicleId(vehicle.id);
    window.setTimeout(() => {
      const row = document.getElementById(`timeline-vehicle-${vehicle.id}`);
      const timeline = row?.closest('.timeline-shell');
      if (row && timeline) {
        timeline.scrollTo({
          top: Math.max(0, row.offsetTop - ((timeline.clientHeight - row.offsetHeight) / 2)),
          left: timeline.scrollLeft,
          behavior: 'smooth',
        });
      }
    }, 80);
  };

  const locateVehicleFromTimeline = (vehicle, task = null) => {
    setMapExpanded(true);
    setFocusedVehicleId(vehicle.id);
    if (task) {
      const stationPosition = getStationMapPosition(vehicle, task);
      setStationMapFocus({
        vehicleId: vehicle.id,
        position: stationPosition,
        label: `站點｜${task.station}`,
      });
      setMapFocusRequest({ positions: [vehicle.position, stationPosition], requestId: Date.now() });
    } else {
      setStationMapFocus(null);
      setMapFocusRequest({ vehicleId: vehicle.id, requestId: Date.now() });
    }
    window.setTimeout(() => {
      const panel = document.querySelector('.context-map-panel');
      if (panel) {
        window.scrollTo({ top: Math.max(0, panel.getBoundingClientRect().top + window.scrollY - 72), behavior: 'smooth' });
      }
    }, 240);
  };

  const viewSelectedTaskLocation = (task = selectedTask) => {
    if (!task) return;
    const vehicleId = task.fixedVehicleId ?? task.vehicleId;
    const vehicle = vehicleId
      ? initialVehicles.find((item) => item.id === vehicleId)
      : null;
    const targetPosition = task.pickupPosition
      ?? (vehicle ? getStationMapPosition(vehicle, task) : null);
    if (!targetPosition) return;

    if (maximizedView === 'timeline') setMaximizedView(null);
    setMapExpanded(true);
    setFocusedVehicleId(vehicle?.id ?? null);
    setStationMapFocus({
      vehicleId: vehicle?.id,
      position: targetPosition,
      label: `${task.assignmentMode === 'reassign-driver' ? '站點' : '插單站點'}｜${task.station ?? task.customer}`,
    });
    setMapFocusRequest({
      position: targetPosition,
      positions: vehicle ? [vehicle.position, targetPosition] : undefined,
      requestId: Date.now(),
    });
    window.setTimeout(() => {
      const panel = document.querySelector('.context-map-panel');
      if (panel) {
        window.scrollTo({ top: Math.max(0, panel.getBoundingClientRect().top + window.scrollY - 72), behavior: 'smooth' });
      }
    }, 280);
  };

  const clampMapHeight = (height) => {
    const maximumHeight = Math.max(360, Math.min(600, window.innerHeight - 180));
    return Math.min(maximumHeight, Math.max(180, height));
  };

  const startMapResize = (event) => {
    event.preventDefault();
    const startY = event.clientY;
    const startHeight = mapHeight;
    document.body.classList.add('map-resizing');

    const handlePointerMove = (moveEvent) => {
      setMapHeight(clampMapHeight(startHeight + moveEvent.clientY - startY));
    };

    const stopResize = () => {
      document.body.classList.remove('map-resizing');
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', stopResize);
      window.removeEventListener('pointercancel', stopResize);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', stopResize);
    window.addEventListener('pointercancel', stopResize);
  };

  const resizeMapWithKeyboard = (event) => {
    if (!['ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    setMapHeight((current) => clampMapHeight(current + (event.key === 'ArrowDown' ? 24 : -24)));
  };

  const closeMapPanel = () => {
    setMaximizedView((current) => (current === 'map' ? null : current));
    setMapExpanded(false);
  };

  const toggleMapMaximize = () => {
    setMapExpanded(true);
    setMaximizedView((current) => (current === 'map' ? null : 'map'));
  };

  const toggleTimelineMaximize = () => {
    setMaximizedView((current) => (current === 'timeline' ? null : 'timeline'));
  };

  useEffect(() => {
    if (!focusedVehicleId) return undefined;
    const clearFocus = (event) => {
      if (event.target.closest('.vehicle-marker-root, .vehicle-leaflet-tooltip')) return;
      setFocusedVehicleId(null);
      setStationMapFocus(null);
    };
    document.addEventListener('pointerdown', clearFocus);
    return () => document.removeEventListener('pointerdown', clearFocus);
  }, [focusedVehicleId]);

  useEffect(() => {
    if (!maximizedView) return undefined;
    const restoreWorkspace = (event) => {
      if (event.key === 'Escape') setMaximizedView(null);
    };
    window.addEventListener('keydown', restoreWorkspace);
    return () => window.removeEventListener('keydown', restoreWorkspace);
  }, [maximizedView]);

  return (
    <Box
      className={`app-shell ${sidebarExpanded ? 'sidebar-expanded' : 'sidebar-collapsed'} ${activePage === 'monitoring' && orderQueueOpen ? 'order-queue-open' : ''} ${maximizedView ? `focus-mode focus-${maximizedView}` : ''}`}
      style={{ '--order-queue-width': activePage === 'monitoring' && orderQueueOpen ? `${orderQueueWidth}px` : '0px' }}
    >
      <Sidebar expanded={sidebarExpanded} onToggle={() => setSidebarExpanded((current) => !current)} activePage={activePage} onNavigate={navigateToPage} />
      <Box className="app-main">
        <TopHeader sidebarExpanded={sidebarExpanded} onToggleSidebar={() => setSidebarExpanded((current) => !current)} />
        <main className={`content ${activePage === 'checklist' ? 'checklist-content' : ''}`}>
          {activePage === 'checklist' ? (
            <ChecklistManagementPage />
          ) : (
          <>
          <Box className="page-heading-row" sx={{ width: '100%', mb: '16px' }}>
            <Stack direction="row" alignItems="center" sx={{ width: '100%' }}>
              <Typography variant="h5">營運監控</Typography>
              <Stack direction="row" alignItems="center" spacing={0.5} sx={{ ml: 3 }}>
                <Button size="small" variant="outlined" color="inherit" startIcon={<CalendarTodayRounded />} sx={{ borderColor: 'divider', color: 'text.primary', bgcolor: 'background.paper', '&:hover': { bgcolor: 'background.paper' } }}>
                  執行日　2026/08/06（四）
                </Button>
              </Stack>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ ml: 'auto' }}>
                <Tooltip title="資料更新時間：14:30:18">
                  <Button size="small" color="inherit" startIcon={<RefreshRounded />} className="sync-button">
                    30秒自動更新
                  </Button>
                </Tooltip>
                <Tooltip title={mapExpanded ? '收合即時定位' : '展開即時定位'}>
                  <Button
                    className={`page-map-button ${mapExpanded ? 'open' : ''}`}
                    size="small"
                    variant="outlined"
                    color="primary"
                    startIcon={<MapOutlined />}
                    onClick={() => setMapExpanded((current) => !current)}
                    aria-label={mapExpanded ? '收合即時定位' : '展開即時定位'}
                  >
                    即時定位
                  </Button>
                </Tooltip>
                <Tooltip title="搜尋">
                  <IconButton color="primary" aria-label="搜尋車號或便次">
                    <SearchRounded fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Stack>
          </Box>

          <Box className="operational-canvas">
            <Collapse className="map-collapse-region" in={mapExpanded} timeout={220} mountOnEnter unmountOnExit>
              <Paper variant="outlined" className="overview-map context-map-panel" style={{ height: mapHeight }}>
                <MapContainer
                  bounds={initialVehicles.map((vehicle) => vehicle.position)}
                  boundsOptions={{ padding: [48, 48] }}
                  zoomControl={false}
                  scrollWheelZoom
                  doubleClickZoom
                  touchZoom
                  minZoom={7}
                  maxZoom={18}
                  className="leaflet-map"
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                <ZoomControl position="bottomright" />
                <MapResizeHandler dependency={`${sidebarExpanded}-${orderQueueOpen}-${orderQueueWidth}-${mapHeight}-${maximizedView}`} />
                <MapFocusHandler request={mapFocusRequest} vehicles={initialVehicles} />
                  {comparisonTarget?.position && (
                    <Marker position={comparisonTarget.position} icon={taskLocationMapIcon} zIndexOffset={9000}>
                      <LeafletTooltip direction="top" opacity={1} permanent={Boolean(comparisonVehicle)} className="task-location-tooltip">
                        <Typography variant="caption" fontWeight={750}>{comparisonTarget.label}</Typography>
                      </LeafletTooltip>
                    </Marker>
                  )}
                  {comparisonVehicle && comparisonTarget?.position && (
                    <>
                      <Polyline
                        positions={[comparisonVehicle.position, comparisonTarget.position]}
                        pathOptions={{ color: '#2f73c8', weight: 3, opacity: 0.82, dashArray: '7 7' }}
                      />
                      <Marker
                        position={[
                          (comparisonVehicle.position[0] + comparisonTarget.position[0]) / 2,
                          (comparisonVehicle.position[1] + comparisonTarget.position[1]) / 2,
                        ]}
                        icon={createDistanceLineLabelIcon(comparisonDistanceKm)}
                        interactive={false}
                        zIndexOffset={8500}
                      />
                    </>
                  )}
                  {initialVehicles.map((vehicle) => (
                    <VehicleMapPin
                      key={vehicle.id}
                      vehicle={vehicle}
                      focused={focusedVehicleId === vehicle.id}
                      emphasized={comparisonVehicle?.id === vehicle.id}
                      onOpen={focusVehicleFromMap}
                    />
                  ))}
                </MapContainer>
                <Tooltip title="收合即時定位">
                  <IconButton className="map-collapse-button" size="small" aria-label="收合即時定位" onClick={closeMapPanel}>
                    <KeyboardArrowUpRounded />
                  </IconButton>
                </Tooltip>
                <Tooltip title={maximizedView === 'map' ? '還原地圖' : '放大地圖'}>
                  <IconButton className="map-maximize-button" size="small" aria-label={maximizedView === 'map' ? '還原地圖' : '放大地圖'} onClick={toggleMapMaximize}>
                    {maximizedView === 'map' ? <CloseFullscreenRounded fontSize="small" /> : <OpenInFullRounded fontSize="small" />}
                  </IconButton>
                </Tooltip>
                <Box
                  className="map-resize-handle"
                  role="separator"
                  tabIndex={0}
                  aria-label="調整地圖高度"
                  aria-orientation="horizontal"
                  aria-valuemin={180}
                  aria-valuemax={600}
                  aria-valuenow={mapHeight}
                  onPointerDown={startMapResize}
                  onKeyDown={resizeMapWithKeyboard}
                />
              </Paper>
            </Collapse>

            <Box className="workspace-grid">
            <Paper variant="outlined" className="operations-card">
              <Box className="operations-toolbar">
                <Stack direction="row" spacing={1.2} alignItems="center">
                  <ToggleButtonGroup
                    className="overview-filter-group"
                    size="small"
                    exclusive
                    value={overviewFilter}
                    onChange={(_, value) => value && setOverviewFilter(value)}
                    aria-label="車輛狀態篩選"
                  >
                    <ToggleButton value="all">總覽 (91)</ToggleButton>
                    <ToggleButton value="running">執行中 ({fleetStatusCounts.running})</ToggleButton>
                    <ToggleButton value="abnormal"><WarningRounded />異常 ({fleetStatusCounts.abnormal})</ToggleButton>
                  </ToggleButtonGroup>
                </Stack>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Box className="timeline-scale-control">
                    <Typography variant="caption">時間刻度</Typography>
                    <Slider
                      size="small"
                      min={0}
                      max={TIMELINE_SCALE_OPTIONS.length - 1}
                      step={1}
                      marks={TIMELINE_SCALE_OPTIONS.map((_, index) => ({ value: index }))}
                      value={TIMELINE_SCALE_OPTIONS.indexOf(timelineScaleMinutes)}
                      valueLabelDisplay="off"
                      onChange={(_, index) => setTimelineScaleMinutes(TIMELINE_SCALE_OPTIONS[index])}
                      aria-label="調整時間軸刻度"
                    />
                    <Typography className="timeline-scale-value" variant="caption">{timelineScaleMinutes} 分</Typography>
                  </Box>
                  <Divider orientation="vertical" className="timeline-toolbar-divider" />
                  <FormControlLabel
                    className="dispatch-compare-toggle"
                    label="顯示實際狀況"
                    control={(
                      <Checkbox
                        size="small"
                        checked={showActualExecution}
                        onChange={(event) => setShowActualExecution(event.target.checked)}
                        inputProps={{ 'aria-label': '顯示實際狀況' }}
                      />
                    )}
                  />
                  <Tooltip title={maximizedView === 'timeline' ? '還原時間軸' : '放大時間軸'}>
                    <IconButton className="timeline-maximize-button" size="small" aria-label={maximizedView === 'timeline' ? '還原時間軸' : '放大時間軸'} onClick={toggleTimelineMaximize}>
                      {maximizedView === 'timeline' ? <CloseFullscreenRounded fontSize="small" /> : <OpenInFullRounded fontSize="small" />}
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Box>
              <Timeline
                vehicles={timelineVehicles}
                candidates={timelineCandidates}
                selectedTask={assessmentTask}
                selectedDriverName={selectedDriverName}
                hasAvailableCandidates={candidates.length > 0}
                activeCandidate={activeCandidate}
                hoveredCandidate={hoveredCandidate}
                onSelectCandidate={(candidate) => selectDriverForTask(candidate.driverName)}
                onHoverCandidate={setHoveredCandidate}
                onDropTask={dropTaskOnCandidate}
                onLocateVehicle={locateVehicleFromTimeline}
                onReassignTask={openTimelineTaskAssignmentPanel}
                insertedTasks={insertedTasks}
                highlightedVehicleId={focusedVehicleId}
                compareMode={showActualExecution}
                scaleMinutes={timelineScaleMinutes}
                showRequestedWindow={Boolean(assessmentTask)}
                dragActive={Boolean(draggedTask)}
              />
            </Paper>

            </Box>
          </Box>
          </>
          )}
        </main>
      </Box>
      {activePage === 'monitoring' && !orderQueueOpen && (
        <Fab
          variant="extended"
          color="primary"
          className="order-queue-fab"
          onClick={() => setOrderQueueOpen(true)}
          aria-label={`開啟待插單訂單，共 ${otherTasks.length} 筆`}
        >
          <PendingActionsOutlined />
          <span>待插單</span>
          <Box component="span" className="order-queue-fab-count">{otherTasks.length}</Box>
        </Fab>
      )}
      {activePage === 'monitoring' && <OrderQueuePanel
        open={orderQueueOpen}
        width={orderQueueWidth}
        tasks={otherTasks}
        onClose={closeOrderQueue}
        onSelect={selectTask}
        selectedTask={selectedTask}
        onBackToQueue={clearTaskAssessment}
        candidates={candidates}
        selectedDriverName={selectedDriverName}
        activeCandidate={activeCandidate}
        hoveredCandidate={hoveredCandidate}
        resolvedCandidatePairs={resolvedCandidatePairs}
        onSelectDriver={selectDriverForTask}
        onSelectCandidate={selectCandidatePreview}
        onHoverCandidate={setHoveredCandidate}
        onResolveImpact={resolveCandidateImpact}
        onConfirm={confirmInsertion}
        confirming={assignmentLoading}
        onViewLocation={viewSelectedTaskLocation}
        onFocusTimeline={focusTaskInTimeline}
        onResizeStart={startOrderQueueResize}
        onResizeKeyDown={resizeOrderQueueWithKeyboard}
      />}
      <KeyInDialog open={keyInOpen} onClose={() => setKeyInOpen(false)} onCreate={createKeyedTask} />
      <DriverReassignmentDialog
        open={reassignmentDialogOpen}
        impact={pendingDriverReassignment}
        onSkip={skipDriverReassignment}
        onForward={openDriverReassignmentPanel}
      />
      <Snackbar open={Boolean(snackbarMessage)} autoHideDuration={4000} onClose={() => setSnackbarMessage('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert
          severity="success"
          variant="filled"
          onClose={() => setSnackbarMessage('')}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
