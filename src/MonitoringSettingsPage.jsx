import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  IconButton,
  Paper,
  Popover,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import {
  AccessTimeRounded,
  CheckCircleOutlineRounded,
  ForumOutlined,
  GpsFixedRounded,
  HelpOutlineRounded,
  InfoOutlined,
  LoginRounded,
  LogoutRounded,
  CloseRounded,
  StickyNote2Outlined,
  PlaceOutlined,
  ScheduleRounded,
  SensorsRounded,
  TimelineRounded,
  TuneRounded,
  WarningAmberRounded,
} from '@mui/icons-material';

const etaWarningMethods = [
  {
    title: '電子圍籬與里程碑觸發',
    summary: '在起點、中繼站、目的地或特定路段建立虛擬邊界，以實際進出事件確認任務進度。',
    triggers: '進／出站延遲、滯留時間過長、站點順序跳脫',
    bestFor: '轉運站、場站調度、冷鏈物流',
  },
  {
    title: '動態路況與即時圖資比對',
    summary: '每 1–3 分鐘結合即時車速、壅塞、施工與事故資訊，重新計算剩餘時間。',
    triggers: '新 ETA 超過原承諾時間或偏差門檻',
    bestFor: '即時配送、叫車與外送服務',
    note: '常見來源：Google Maps、HERE、TomTom',
  },
];

const etaWarningComparison = [
  ['電子圍籬', '判定明確、運算成本低', '進出站、滯留、順序'],
  ['動態路況 API', '反映即時交通', '重算 ETA 偏差'],
];

const DEFAULT_SETTINGS = {
  detectionInterval: '5',
  geofenceRadius: '300',
  enterStableMinutes: '2',
  earlyArrivalTolerance: '10',
  earlyDepartureTolerance: '10',
  lateArrivalTolerance: '10',
  lateDepartureTolerance: '10',
};

const timelineScenarios = [
  {
    id: 'ontime-both',
    title: '準時抵達、準時離站',
    note: '兩個事件皆落在容許緩衝時間內，不產生時間差提示。',
    result: '皆在容許時間範圍內',
    resultTone: 'ontime',
    arrivalTone: 'ontime',
    departureTone: 'ontime',
    lineTone: 'ontime',
    arrivalPosition: 35,
    departurePosition: 69,
    arrivalLabel: '09:03 抵達',
    departureLabel: '10:02 離站',
  },
  {
    id: 'early-both',
    title: '提早抵達、提早離站',
    note: '兩個事件分別保留時間差，主狀態以最新離站事件為準。',
    result: '提早離站 13 分',
    resultTone: 'early',
    arrivalTone: 'early',
    departureTone: 'early',
    lineTone: 'early',
    arrivalPosition: 25,
    departurePosition: 60,
    arrivalLabel: '08:48 抵達',
    departureLabel: '09:47 離站',
  },
  {
    id: 'early-arrival',
    title: '提早抵達、準時離站',
    note: '抵達保留提早資訊；準時離站不額外標示。',
    result: '提早抵達 12 分・準時離站',
    resultTone: 'ontime',
    arrivalTone: 'early',
    departureTone: 'ontime',
    lineTone: 'ontime',
    arrivalPosition: 25,
    departurePosition: 68,
    arrivalLabel: '08:48 抵達',
    departureLabel: '10:02 離站',
  },
  {
    id: 'early-arrival-delayed-departure',
    title: '提早抵達、延遲離站',
    note: '抵達與離站各自判斷，實際執行 Bar 以最新離站狀態呈現。',
    result: '延遲離站 15 分',
    resultTone: 'delayed',
    arrivalTone: 'early',
    departureTone: 'delayed',
    lineTone: 'delayed',
    arrivalPosition: 27,
    departurePosition: 76,
    arrivalLabel: '08:52 抵達',
    departureLabel: '10:15 離站',
  },
  {
    id: 'ontime-arrival-early-departure',
    title: '準時抵達、提早離站',
    note: '抵達不顯示時間差，主狀態與實際執行 Bar 以離站為準。',
    result: '提早離站 12 分',
    resultTone: 'early',
    arrivalTone: 'ontime',
    departureTone: 'early',
    lineTone: 'early',
    arrivalPosition: 35,
    departurePosition: 61,
    arrivalLabel: '09:03 抵達',
    departureLabel: '09:48 離站',
  },
  {
    id: 'ontime-arrival-delayed-departure',
    title: '準時抵達、延遲離站',
    note: '抵達不顯示時間差，離站事件決定主狀態與實際執行 Bar。',
    result: '延遲離站 15 分',
    resultTone: 'delayed',
    arrivalTone: 'ontime',
    departureTone: 'delayed',
    lineTone: 'delayed',
    arrivalPosition: 35,
    departurePosition: 76,
    arrivalLabel: '09:03 抵達',
    departureLabel: '10:15 離站',
  },
  {
    id: 'delayed-arrival-early-departure',
    title: '延遲抵達、提早離站',
    note: '兩端差異各自保留，主狀態與實際執行 Bar 以最新離站為準。',
    result: '提早離站 12 分',
    resultTone: 'early',
    arrivalTone: 'delayed',
    departureTone: 'early',
    lineTone: 'early',
    arrivalPosition: 43,
    departurePosition: 61,
    arrivalLabel: '09:14 抵達',
    departureLabel: '09:48 離站',
  },
  {
    id: 'delayed-arrival-ontime-departure',
    title: '延遲抵達、準時離站',
    note: '保留抵達延遲資訊；離站落在容許緩衝時間內。',
    result: '延遲抵達 14 分',
    resultTone: 'delayed',
    arrivalTone: 'delayed',
    departureTone: 'ontime',
    lineTone: 'ontime',
    arrivalPosition: 43,
    departurePosition: 69,
    arrivalLabel: '09:14 抵達',
    departureLabel: '10:02 離站',
  },
  {
    id: 'delayed-both',
    title: '延遲抵達、延遲離站',
    note: '兩個事件分別保留時間差，主狀態以最新離站事件為準。',
    result: '延遲離站 18 分',
    resultTone: 'delayed',
    arrivalTone: 'delayed',
    departureTone: 'delayed',
    lineTone: 'delayed',
    arrivalPosition: 43,
    departurePosition: 78,
    arrivalLabel: '09:14 抵達',
    departureLabel: '10:18 離站',
  },
  {
    id: 'not-arrived',
    title: '已經超過規劃抵達時間，尚未抵達',
    note: '在事件尚未發生前，只標示狀態，不顯示確定的延遲分鐘數。',
    result: '已延遲・尚未抵達',
    resultTone: 'delayed',
    nowPosition: 53,
  },
  {
    id: 'not-arrived-after-departure',
    title: '已經超過規劃離站時間，尚未抵達',
    note: '已超過完整規劃作業時段，但尚未形成抵達事件；只標示狀態，不顯示確定的延遲分鐘數。',
    result: '已延遲・尚未抵達',
    resultTone: 'delayed',
    nowPosition: 76,
  },
  {
    id: 'not-departed',
    title: '已抵達，超過規劃離站時間仍未離站',
    note: '已發生抵達事件；離站延遲持續累計，但尚無確定離站時間。',
    result: '已延遲・尚未離站',
    resultTone: 'delayed',
    arrivalTone: 'ontime',
    lineTone: 'delayed',
    arrivalPosition: 36,
    arrivalLabel: '09:03 抵達',
    nowPosition: 76,
  },
];

const formedEventScenarioIds = [
  'ontime-both',
  'ontime-arrival-delayed-departure',
  'delayed-arrival-ontime-departure',
  'early-arrival-delayed-departure',
  'delayed-arrival-early-departure',
  'delayed-both',
];

const formedEventScenarios = formedEventScenarioIds.map(
  (id) => timelineScenarios.find((scenario) => scenario.id === id),
);
const pendingEventScenarios = timelineScenarios.filter(
  ({ id }) => ['not-arrived', 'not-arrived-after-departure', 'not-departed'].includes(id),
);

function TimelineScenario({ scenario, note, onNoteChange }) {
  return (
    <Box className="geofence-scenario-row">
      <Box className="geofence-scenario-copy">
        <Typography className="geofence-scenario-title">{scenario.title}</Typography>
      </Box>

      <Box className="geofence-timeline" aria-label={`${scenario.title}：${scenario.result}`}>
        <Box className="geofence-timeline-axis" />
        <Box className="geofence-tolerance-band arrival" />
        <Box className="geofence-tolerance-band departure" />
        <Box className="geofence-plan-marker arrival"><span /> <b>規劃抵達 09:00</b></Box>
        <Box className="geofence-plan-marker departure"><span /> <b>規劃離站 10:00</b></Box>

        {scenario.arrivalPosition != null && (
          <Box
            className={`geofence-event-marker arrival ${scenario.arrivalTone ?? 'ontime'}`}
            sx={{ left: `${scenario.arrivalPosition}%` }}
          >
            <span />
            <b>{scenario.arrivalLabel}</b>
          </Box>
        )}
        {scenario.departurePosition != null && (
          <Box
            className={`geofence-event-marker departure ${scenario.departureTone ?? 'ontime'}`}
            sx={{ left: `${scenario.departurePosition}%` }}
          >
            <span />
            <b>{scenario.departureLabel}</b>
          </Box>
        )}
        {scenario.arrivalPosition != null && (
          <Box
            className={`geofence-actual-line ${scenario.lineTone ?? scenario.resultTone}`}
            sx={{
              left: `${scenario.arrivalPosition}%`,
              width: `${(scenario.departurePosition ?? scenario.nowPosition) - scenario.arrivalPosition}%`,
            }}
          />
        )}
        {scenario.nowPosition != null && (
          <Box className="geofence-now-marker" sx={{ left: `${scenario.nowPosition}%` }}>
            <span>現在</span>
          </Box>
        )}
        <Box className="geofence-time-labels" aria-hidden="true">
          <span>08:00</span><span>09:00</span><span>10:00</span><span>11:00</span>
        </Box>
      </Box>

      <Box className={`geofence-scenario-result ${scenario.resultTone}`}>
        {scenario.resultTone === 'delayed' || scenario.resultTone === 'mixed'
          ? <WarningAmberRounded />
          : scenario.resultTone === 'early'
            ? <AccessTimeRounded />
            : <CheckCircleOutlineRounded />}
        <Typography>{scenario.result}</Typography>
      </Box>

      <TextField
        className="geofence-scenario-note-input"
        size="small"
        placeholder="輸入筆記"
        value={note}
        onChange={(event) => onNoteChange(event.target.value)}
        slotProps={{ htmlInput: { 'aria-label': `${scenario.title}筆記`, maxLength: 40 } }}
      />
    </Box>
  );
}

function LogicClarificationView() {
  const [scenarioNotes, setScenarioNotes] = useState({});
  const updateScenarioNote = (id) => (value) => {
    setScenarioNotes((current) => ({ ...current, [id]: value }));
  };

  return (
    <Box className="monitoring-settings-view">
      <Paper variant="outlined" className="clarification-panel questions clarification-panel-top">
        <Stack direction="row" alignItems="center" spacing={1}>
          <ForumOutlined />
          <Typography variant="h6">待釐清</Typography>
        </Stack>
        <ul>
          <li>進入電子圍籬的判斷是否需緩衝時間？避免 GPS 漂移或短暫進出。</li>
          <li>抵達與離站是否皆需要容許時間？</li>
          <li>哪些情境要判定為異常，並提供預警？</li>
          <li>哪些必要的預警是單靠電子圍籬無法完整支援，可能需要結合動態路況（如 Google）的？</li>
        </ul>
      </Paper>

      <Typography variant="h6" className="geofence-logic-heading">電子圍籬核心機制</Typography>
      <Box className="geofence-logic-summary">
        <Box className="logic-summary-item">
          <SensorsRounded />
          <Box><b>1. 確認電子圍籬事件</b><span><strong className="logic-summary-highlight">事件穩定緩衝</strong>可排除 GPS 漂移或短暫進出，決定事件是否成立。</span></Box>
        </Box>
        <Box className="logic-summary-connector" aria-hidden="true" />
        <Box className="logic-summary-item">
          <AccessTimeRounded />
          <Box><b>2. 對照規劃時間</b><span><strong className="logic-summary-highlight">提早／延遲容許值</strong>決定事件成立後屬於提早、準時或延遲；抵達對照規劃抵達，離站對照規劃離站。</span></Box>
        </Box>
        <Box className="logic-summary-connector" aria-hidden="true" />
        <Box className="logic-summary-item">
          <TimelineRounded />
          <Box><b>3. 產生營運狀態</b><span>呈現提早、準時、延遲與後續 ETA 風險。</span></Box>
        </Box>
      </Box>

      <Box className="monitoring-settings-section-heading">
        <Box>
          <Typography variant="h6">情境時間線</Typography>
        </Box>
        <Box className="geofence-legend">
          <span className="planned">規劃時間</span>
          <span className="tolerance">容許時間範圍</span>
        </Box>
      </Box>

      <Box className="geofence-scenario-groups">
        <Box className="geofence-scenario-group pending">
          <Box className="geofence-scenario-group-heading">
            <Stack direction="row" alignItems="center" spacing={0.75} className="geofence-scenario-group-heading-title">
              <HelpOutlineRounded />
              <Typography variant="h6">尚未形成電子圍籬事件</Typography>
            </Stack>
          </Box>
          <Paper variant="outlined" className="geofence-scenario-list">
            {pendingEventScenarios.map((scenario) => (
              <TimelineScenario
                key={scenario.id}
                scenario={scenario}
                note={scenarioNotes[scenario.id] ?? ''}
                onNoteChange={updateScenarioNote(scenario.id)}
              />
            ))}
          </Paper>
        </Box>

        <Box className="geofence-scenario-group">
          <Box className="geofence-scenario-group-heading">
            <Stack direction="row" alignItems="center" spacing={0.75} className="geofence-scenario-group-heading-title">
              <CheckCircleOutlineRounded />
              <Typography variant="h6">已形成電子圍籬事件</Typography>
            </Stack>
            <Typography>抵達與離站事件成立後，對照規劃時間判斷提早、準時或延遲，並以該車輛路線最新押上的狀態與時間差為主要關注依據。</Typography>
          </Box>
          <Paper variant="outlined" className="geofence-scenario-list">
            {formedEventScenarios.map((scenario) => (
              <TimelineScenario
                key={scenario.id}
                scenario={scenario}
                note={scenarioNotes[scenario.id] ?? ''}
                onNoteChange={updateScenarioNote(scenario.id)}
              />
            ))}
          </Paper>
        </Box>
      </Box>

    </Box>
  );
}

function SettingField({ label, helper, children }) {
  return (
    <Box className="monitoring-setting-field">
      <Box className="monitoring-setting-field-copy">
        <Typography>{label}</Typography>
        {helper && <Typography>{helper}</Typography>}
      </Box>
      <Box className="monitoring-setting-control">{children}</Box>
    </Box>
  );
}

function ToleranceSentenceField({ tone, icon, value, onChange, comparison, reference, result }) {
  return (
    <Box className={`monitoring-tolerance-sentence ${tone}`}>
      {icon}
      <Typography component="span">實際{result.endsWith('抵達') ? '抵達' : '離站'}時間{comparison}規劃{reference}</Typography>
      <TextField
        className="monitoring-tolerance-sentence-input"
        size="small"
        type="number"
        value={value}
        onChange={onChange}
        slotProps={{ htmlInput: { min: 0, 'aria-label': `${result}判斷分鐘數` } }}
      />
      <Typography component="span">分鐘以上，判定為{result}。</Typography>
    </Box>
  );
}

function EventSentenceField({ icon, children }) {
  return (
    <Box className="monitoring-event-sentence">
      {icon}
      {children}
    </Box>
  );
}

function SettingsMockView({ settings, onChange }) {
  const setValue = (key) => (event) => onChange({ ...settings, [key]: event.target.value });
  return (
    <Box className="monitoring-settings-view settings-mock-view">
      <Paper variant="outlined" className="monitoring-settings-form">
        <Box className="monitoring-settings-form-intro">
          <Box>
            <Typography variant="h6">電子圍籬監控</Typography>
            <Typography>目前僅示意可能的規則項目與初始值。</Typography>
          </Box>
        </Box>

        <Box className="monitoring-settings-form-section">
          <Stack direction="row" alignItems="center" spacing={1} className="monitoring-settings-form-title">
            <GpsFixedRounded /><Typography variant="h6">偵測基礎</Typography>
          </Stack>
          <SettingField label="GPS 偵測頻率" helper="系統比對車機位置與電子圍籬範圍的頻率。">
            <TextField size="small" type="number" value={settings.detectionInterval} onChange={setValue('detectionInterval')} slotProps={{ input: { endAdornment: <span className="setting-unit">分鐘</span> } }} />
          </SettingField>
          <SettingField label="電子圍籬半徑" helper="以站點地址為中心建立圓形範圍。">
            <TextField size="small" type="number" value={settings.geofenceRadius} onChange={setValue('geofenceRadius')} slotProps={{ input: { endAdornment: <span className="setting-unit">公尺</span> } }} />
          </SettingField>
        </Box>

        <Box className="monitoring-settings-form-section">
          <Stack direction="row" alignItems="center" spacing={1} className="monitoring-settings-form-title">
            <SensorsRounded /><Typography variant="h6">抵達／離站事件判斷</Typography>
          </Stack>
          <EventSentenceField icon={<LoginRounded />}>
            <Typography component="span">進入電子圍籬範圍並持續</Typography>
            <TextField
              className="monitoring-event-sentence-input"
              size="small"
              type="number"
              value={settings.enterStableMinutes}
              onChange={setValue('enterStableMinutes')}
              slotProps={{ htmlInput: { min: 0, 'aria-label': '抵達穩定分鐘數' } }}
            />
            <Typography component="span">分鐘後，記錄為抵達。</Typography>
          </EventSentenceField>
          <EventSentenceField icon={<LogoutRounded />}>
            <Typography component="span">離開電子圍籬範圍時，立即記錄為離站。</Typography>
          </EventSentenceField>
        </Box>

        <Box className="monitoring-settings-form-section">
          <Stack direction="row" alignItems="center" spacing={1} className="monitoring-settings-form-title">
            <ScheduleRounded /><Typography variant="h6">時間差容許範圍</Typography>
          </Stack>
          <ToleranceSentenceField
            tone="early"
            icon={<LoginRounded />}
            value={settings.earlyArrivalTolerance}
            onChange={setValue('earlyArrivalTolerance')}
            comparison="早於"
            reference="抵達"
            result="提早抵達"
          />
          <ToleranceSentenceField
            tone="early"
            icon={<LogoutRounded />}
            value={settings.earlyDepartureTolerance}
            onChange={setValue('earlyDepartureTolerance')}
            comparison="早於"
            reference="離站"
            result="提早離站"
          />
          <ToleranceSentenceField
            tone="delayed"
            icon={<LoginRounded />}
            value={settings.lateArrivalTolerance}
            onChange={setValue('lateArrivalTolerance')}
            comparison="晚於"
            reference="抵達"
            result="延遲抵達"
          />
          <ToleranceSentenceField
            tone="delayed"
            icon={<LogoutRounded />}
            value={settings.lateDepartureTolerance}
            onChange={setValue('lateDepartureTolerance')}
            comparison="晚於"
            reference="離站"
            result="延遲離站"
          />
        </Box>

      </Paper>
    </Box>
  );
}

function EtaWarningNotes({ anchorEl, onClose }) {
  const open = Boolean(anchorEl);

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      slotProps={{ paper: { className: 'eta-warning-notes-popover' } }}
    >
      <Box className="eta-warning-notes-header">
        <Box>
          <Typography variant="h6">ETA 預警機制筆記</Typography>
          <Typography>從可驗證事件到預測模型，作為內部討論參考。</Typography>
        </Box>
        <IconButton size="small" aria-label="關閉 ETA 預警機制筆記" onClick={onClose}>
          <CloseRounded fontSize="small" />
        </IconButton>
      </Box>

      <Box className="eta-warning-notes-body">
        <Typography className="eta-warning-notes-section-title">2 種核心機制</Typography>
        <Box className="eta-warning-method-list">
          {etaWarningMethods.map((method, index) => (
            <Box className="eta-warning-method" key={method.title}>
              <Box className="eta-warning-method-index" aria-hidden="true">{index + 1}</Box>
              <Box className="eta-warning-method-content">
                <Typography component="h3">{method.title}</Typography>
                <Typography>{method.summary}</Typography>
                <Box className="eta-warning-method-meta">
                  <span><b>觸發：</b>{method.triggers}</span>
                  <span><b>適用：</b>{method.bestFor}</span>
                  {method.note && <span className="eta-warning-method-note">{method.note}</span>}
                </Box>
              </Box>
            </Box>
          ))}
        </Box>

        <Typography className="eta-warning-notes-section-title comparison">快速比較</Typography>
        <Box component="table" className="eta-warning-comparison-table">
          <Box component="thead">
            <Box component="tr">
              <Box component="th">機制</Box>
              <Box component="th">核心優勢</Box>
              <Box component="th">主要判斷</Box>
            </Box>
          </Box>
          <Box component="tbody">
            {etaWarningComparison.map(([mechanism, advantage, signal]) => (
              <Box component="tr" key={mechanism}>
                <Box component="td">{mechanism}</Box>
                <Box component="td">{advantage}</Box>
                <Box component="td">{signal}</Box>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </Popover>
  );
}

export default function MonitoringSettingsPage() {
  const [tab, setTab] = useState(0);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);
  const [notesAnchorEl, setNotesAnchorEl] = useState(null);

  const resetSettings = () => setSettings(DEFAULT_SETTINGS);

  return (
    <Box className="monitoring-settings-page">
      <Box className="monitoring-settings-heading">
        <Typography variant="h5">監控設定</Typography>
        <Button
          className="eta-warning-notes-trigger"
          variant="outlined"
          size="small"
          startIcon={<StickyNote2Outlined />}
          onClick={(event) => setNotesAnchorEl(event.currentTarget)}
          aria-haspopup="dialog"
          aria-expanded={Boolean(notesAnchorEl)}
        >
          ETA 預警：電子圍籬 vs. 動態路況
        </Button>
      </Box>

      <Alert className="monitoring-settings-note monitoring-settings-page-note" severity="info" icon={<InfoOutlined />}>
        此頁用於釐清電子圍籬與時間差判斷，數值為討論起點，尚未形成正式系統設定。
      </Alert>

      <EtaWarningNotes anchorEl={notesAnchorEl} onClose={() => setNotesAnchorEl(null)} />

      <Paper variant="outlined" className="monitoring-settings-workspace">
        <Tabs
          value={tab}
          onChange={(_, value) => setTab(value)}
          aria-label="監控設定內容切換"
          className="monitoring-settings-tabs"
        >
          <Tab icon={<TimelineRounded />} iconPosition="start" label="邏輯釐清（非互動展示）" />
          <Tab icon={<TuneRounded />} iconPosition="start" label="設定示意" />
        </Tabs>

        {tab === 0
          ? <LogicClarificationView />
          : <SettingsMockView settings={settings} onChange={setSettings} />}

        {tab === 1 && (
          <Box className="monitoring-settings-actions">
            <Button color="inherit" onClick={resetSettings}>重設示意值</Button>
            <Button variant="contained" onClick={() => setSaved(true)}>儲存設定示意</Button>
          </Box>
        )}
      </Paper>

      <Snackbar
        open={saved}
        autoHideDuration={2600}
        onClose={() => setSaved(false)}
        message="設定示意已更新"
      />
    </Box>
  );
}
