import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Chip,
  Drawer,
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Select,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  ArrowDownwardRounded,
  ArrowUpwardRounded,
  CalendarTodayRounded,
  CheckCircleOutlineRounded,
  ChevronLeftRounded,
  ChevronRightRounded,
  CloseRounded,
  EditOutlined,
  FirstPageRounded,
  LastPageRounded,
  PendingOutlined,
  SearchRounded,
  TaskAltRounded,
} from '@mui/icons-material';
import {
  CHECKLIST_DRIVERS,
  INITIAL_CHECKLIST_RECORDS,
  updateActualReportTime,
  updatePhaseInspector,
  updatePhaseTime,
} from './checklistData';

const PAGE_SIZES = [10, 25, 50, 100];
const DEFAULT_SORT = { field: 'updatedAt', direction: 'desc' };
const getCurrentTime = () => new Intl.DateTimeFormat('zh-TW', {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
}).format(new Date());

const clampChecklistPanelWidth = (width) => {
  if (typeof window === 'undefined') return 420;
  const maximumWidth = Math.floor(window.innerWidth * 0.5);
  const minimumWidth = Math.min(320, maximumWidth);
  return Math.min(maximumWidth, Math.max(minimumWidth, width));
};

const getInitialChecklistPanelWidth = () => {
  if (typeof window === 'undefined') return 420;
  return clampChecklistPanelWidth(Math.min(480, Math.max(360, Math.floor(window.innerWidth * 0.34))));
};

const compare = (a, b, key) => {
  if (key === 'preChecked' || key === 'postChecked') return Number(a[key]) - Number(b[key]);
  if (key === 'driver') return a.driver.localeCompare(b.driver, 'zh-Hant');
  return String(a[key]).localeCompare(String(b[key]), 'zh-Hant');
};

const sortRecords = (records, sort) => [...records].sort((a, b) => {
  const result = compare(a, b, sort.field);
  return sort.direction === 'asc' ? result : -result;
});

function Status({ checked }) {
  return (
    <Stack direction="row" spacing={0.75} alignItems="center" className={checked ? 'checklist-status reviewed' : 'checklist-status pending'}>
      {checked ? <CheckCircleOutlineRounded /> : <PendingOutlined />}
      <Typography component="span">{checked ? '已審核' : '未審核'}</Typography>
    </Stack>
  );
}

function SortLabel({ label, field, sort, onSort }) {
  const active = sort.field === field;
  return (
    <button type="button" className={`checklist-sort ${active ? 'active' : ''}`} onClick={() => onSort(field)}>
      <span>{label}</span>
      {active
        ? sort.direction === 'asc' ? <ArrowUpwardRounded /> : <ArrowDownwardRounded />
        : <ArrowDownwardRounded className="sort-hint" />}
    </button>
  );
}

function ChecklistContent({ sections, editablePhases = [], phaseActions = {}, onChange, onEditPhase, onSavePhase, onCancelPhase, onCheckPhase }) {
  const updateItem = (sectionIndex, itemIndex, patch) => {
    if (!onChange) return;
    onChange(sections.map((section, currentSectionIndex) => (
      currentSectionIndex !== sectionIndex
        ? section
        : {
          ...section,
          items: section.items.map((item, currentItemIndex) => (
            currentItemIndex === itemIndex ? { ...item, ...patch } : item
          )),
        }
    )));
  };

  return (
    <Stack className="checklist-form" spacing={2}>
      {sections.map((section, sectionIndex) => {
        const editable = section.phase && editablePhases.includes(section.phase);
        const inspectorItem = section.items.find((item) => item.inspector);
        const visibleItems = section.items.filter((item) => !item.inspector);
        return (
        <Box key={section.title} className={`checklist-form-section ${section.readonly ? 'readonly' : ''} ${editable ? 'editable' : ''}`}>
          {!section.readonly && (
            <Box className="checklist-form-title-row">
              <Typography className="checklist-form-title">{section.title}</Typography>
              {section.phase && !editable && (
                <Button size="small" variant="text" startIcon={<EditOutlined />} onClick={() => onEditPhase(section.phase)}>
                  編輯
                </Button>
              )}
            </Box>
          )}
          <Stack spacing={1.5} className="checklist-form-items">
            {visibleItems.map((item, itemIndex) => {
              const originalItemIndex = section.items.indexOf(item);
              const startsGroup = item.group && item.group !== visibleItems[itemIndex - 1]?.group;
              return (
                <Box key={item.label} className={`checklist-form-item-wrap kind-${item.kind}-wrap`}>
                  {startsGroup && (
                    <Typography className={`checklist-form-group-title ${item.groupVariant === 'field-label' ? 'field-label' : ''}`}>
                      {item.group}
                    </Typography>
                  )}
                  <Box className={`checklist-form-item kind-${item.kind}`}>
                    {item.kind === 'confirm' ? (
                      <FormControlLabel
                        className="checklist-confirm-control"
                        control={(
                          <Checkbox
                            size="small"
                            checked={item.checked}
                            disabled={!editable}
                            onChange={(event) => updateItem(sectionIndex, originalItemIndex, { checked: event.target.checked })}
                          />
                        )}
                        label={item.label}
                      />
                    ) : (
                      <>
                        <Typography className="checklist-form-label">{item.label}</Typography>
                        {editable && item.kind === 'choice' && !item.readonly ? (
                          <RadioGroup
                            row
                            value={item.status}
                            onChange={(event) => updateItem(sectionIndex, originalItemIndex, { status: event.target.value })}
                            className="checklist-radio-group"
                          >
                            {item.choices.map((option) => (
                              <FormControlLabel key={option} value={option} control={<Radio size="small" />} label={option} />
                            ))}
                          </RadioGroup>
                        ) : editable && !item.readonly ? (
                          <TextField
                            size="small"
                            fullWidth
                            value={item.value === '-' ? '' : item.value}
                            onChange={(event) => updateItem(sectionIndex, originalItemIndex, { value: event.target.value })}
                          />
                        ) : (
                          <Typography className="checklist-form-value">
                            {item.kind === 'choice' ? item.status || '-' : item.value || '-'}
                          </Typography>
                        )}
                      </>
                    )}
                    {item.note && <Typography className="checklist-form-note">備註：{item.note}</Typography>}
                  </Box>
                </Box>
              );
            })}
          </Stack>
          {section.phase && editable && (
            <Box className="checklist-section-action checklist-edit-actions">
              <Stack direction="row" spacing={1}>
                <Button fullWidth color="inherit" variant="outlined" onClick={() => onCancelPhase(section.phase)}>
                  取消
                </Button>
                <Button fullWidth variant="contained" onClick={() => onSavePhase(section.phase)}>
                  儲存
                </Button>
              </Stack>
            </Box>
          )}
          {section.phase && phaseActions[section.phase] && !editable && (
            <Box className="checklist-review-footer">
              {inspectorItem && (
                <Box className="checklist-review-inspector">
                  <Typography className="checklist-review-inspector-label">{inspectorItem.label}</Typography>
                  <Typography className="checklist-review-inspector-value">{inspectorItem.value || '-'}</Typography>
                </Box>
              )}
              <Box className="checklist-section-action">
                <Tooltip
                  arrow
                  placement="top"
                  title={phaseActions[section.phase].checked ? '點擊切回未審核' : ''}
                >
                  <span className="checklist-phase-action-wrap">
                    <Button
                      fullWidth
                      className={`checklist-phase-action ${phaseActions[section.phase].checked ? 'checked' : ''}`}
                      variant={phaseActions[section.phase].checked ? 'outlined' : 'contained'}
                      startIcon={phaseActions[section.phase].checked ? <CheckCircleOutlineRounded /> : <TaskAltRounded />}
                      disabled={phaseActions[section.phase].disabled}
                      onClick={() => onCheckPhase(section.phase)}
                    >
                      {phaseActions[section.phase].checked ? '已審核' : '審核'}
                    </Button>
                  </span>
                </Tooltip>
              </Box>
            </Box>
          )}
        </Box>
        );
      })}
    </Stack>
  );
}

function PageControls({ total, page, pageSize, onPage, onPageSize, onSearch }) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const start = total ? page * pageSize + 1 : 0;
  const end = Math.min(total, (page + 1) * pageSize);
  return (
    <Stack direction="row" alignItems="center" spacing={0.5} className="checklist-pagination-row">
      <Select size="small" value={pageSize} onChange={(event) => onPageSize(Number(event.target.value))} className="checklist-page-size">
        {PAGE_SIZES.map((value) => <MenuItem key={value} value={value}>{value} / 頁</MenuItem>)}
      </Select>
      <Box sx={{ flex: 1 }} />
      <Typography className="checklist-page-count">{start}–{end} 列（共 {total} 列）</Typography>
      <IconButton size="small" disabled={page === 0} onClick={() => onPage(0)} aria-label="第一頁"><FirstPageRounded /></IconButton>
      <IconButton size="small" disabled={page === 0} onClick={() => onPage(page - 1)} aria-label="上一頁"><ChevronLeftRounded /></IconButton>
      <IconButton size="small" disabled={page >= pageCount - 1} onClick={() => onPage(page + 1)} aria-label="下一頁"><ChevronRightRounded /></IconButton>
      <IconButton size="small" disabled={page >= pageCount - 1} onClick={() => onPage(pageCount - 1)} aria-label="最後一頁"><LastPageRounded /></IconButton>
      <Tooltip title="搜尋">
        <IconButton className="checklist-toolbar-search" size="small" color="primary" onClick={onSearch} aria-label="搜尋點呼表"><SearchRounded /></IconButton>
      </Tooltip>
    </Stack>
  );
}

function SearchDrawer({ open, values, onClose, onApply, onReset }) {
  const [draft, setDraft] = useState(values);
  useEffect(() => { if (open) setDraft(values); }, [open, values]);
  return (
    <Drawer anchor="right" open={open} onClose={onClose} className="checklist-search-drawer">
      <Box className="checklist-search-sheet">
        <Stack direction="row" alignItems="center" justifyContent="space-between" className="checklist-search-heading">
          <Typography variant="h6">搜尋</Typography>
          <Button
            className="checklist-search-reset"
            size="small"
            variant="outlined"
            onClick={() => {
              setDraft((current) => ({ ...current, drivers: [], preStatus: '', postStatus: '' }));
              onReset();
            }}
          >重置</Button>
        </Stack>
        <Stack spacing={2} className="checklist-search-fields">
          <Box className="app-form-field">
            <Typography className="app-form-label">司機</Typography>
            <Autocomplete
              multiple
              options={CHECKLIST_DRIVERS}
              value={draft.drivers}
              noOptionsText="查無結果"
              onChange={(_, drivers) => setDraft((current) => ({ ...current, drivers }))}
              slotProps={{
                paper: { className: 'resource-autocomplete-menu-paper' },
                listbox: { className: 'resource-autocomplete-menu-list' },
              }}
              renderInput={(params) => <TextField {...params} size="small" placeholder="選擇司機" />}
            />
          </Box>
          <Box className="app-form-field">
            <Typography className="app-form-label">作業前點呼</Typography>
            <Select
              fullWidth
              size="small"
              displayEmpty
              value={draft.preStatus ?? ''}
              onChange={(event) => setDraft((current) => ({ ...current, preStatus: event.target.value }))}
              renderValue={(value) => value
                ? value === 'checked' ? '已審核' : '未審核'
                : <span className="app-form-placeholder">選擇審核狀態</span>}
            >
              <MenuItem value="">全部狀態</MenuItem>
              <MenuItem value="checked">已審核</MenuItem>
              <MenuItem value="pending">未審核</MenuItem>
            </Select>
          </Box>
          <Box className="app-form-field">
            <Typography className="app-form-label">作業後點呼</Typography>
            <Select
              fullWidth
              size="small"
              displayEmpty
              value={draft.postStatus ?? ''}
              onChange={(event) => setDraft((current) => ({ ...current, postStatus: event.target.value }))}
              renderValue={(value) => value
                ? value === 'checked' ? '已審核' : '未審核'
                : <span className="app-form-placeholder">選擇審核狀態</span>}
            >
              <MenuItem value="">全部狀態</MenuItem>
              <MenuItem value="checked">已審核</MenuItem>
              <MenuItem value="pending">未審核</MenuItem>
            </Select>
          </Box>
        </Stack>
        <Stack direction="row" spacing={1.5} className="checklist-search-actions">
          <Button fullWidth color="inherit" variant="outlined" onClick={onClose}>取消</Button>
          <Button fullWidth variant="contained" onClick={() => onApply(draft)}>搜尋</Button>
        </Stack>
      </Box>
    </Drawer>
  );
}

export default function ChecklistManagementPage() {
  const [records, setRecords] = useState(INITIAL_CHECKLIST_RECORDS);
  const [sort, setSort] = useState(DEFAULT_SORT);
  const [rowOrder, setRowOrder] = useState(() => sortRecords(INITIAL_CHECKLIST_RECORDS, DEFAULT_SORT).map((record) => record.id));
  const [filters, setFilters] = useState({ date: '2026/08/12', drivers: [], preStatus: '', postStatus: '' });
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [activeId, setActiveId] = useState(null);
  const [draftSections, setDraftSections] = useState([]);
  const [editingPhases, setEditingPhases] = useState({ pre: false, post: false });
  const [searchOpen, setSearchOpen] = useState(false);
  const [snackbar, setSnackbar] = useState('');
  const [panelWidth, setPanelWidth] = useState(getInitialChecklistPanelWidth);
  const detailScrollRef = useRef(null);

  const filtered = useMemo(() => records.filter((record) => (
    (!filters.date || record.date === filters.date)
    && (!filters.drivers.length || filters.drivers.includes(record.driver))
    && (!filters.preStatus || record.preChecked === (filters.preStatus === 'checked'))
    && (!filters.postStatus || record.postChecked === (filters.postStatus === 'checked'))
  )), [records, filters]);

  const sorted = useMemo(() => {
    const filteredById = new Map(filtered.map((record) => [record.id, record]));
    return rowOrder.map((id) => filteredById.get(id)).filter(Boolean);
  }, [filtered, rowOrder]);

  const rows = sorted.slice(page * pageSize, page * pageSize + pageSize);
  const activeIndex = sorted.findIndex((record) => record.id === activeId);
  const activeRecord = activeIndex >= 0 ? sorted[activeIndex] : null;

  useEffect(() => {
    if (page > Math.max(0, Math.ceil(sorted.length / pageSize) - 1)) setPage(0);
    if (activeId && !sorted.some((record) => record.id === activeId)) setActiveId(null);
  }, [sorted, page, pageSize, activeId]);

  useEffect(() => {
    setDraftSections(activeRecord?.sections ?? []);
  }, [activeId, activeRecord?.actualReportTime, activeRecord?.preChecked, activeRecord?.postChecked, activeRecord?.updatedAt]);

  useEffect(() => {
    setEditingPhases({ pre: false, post: false });
  }, [activeId]);

  useLayoutEffect(() => {
    if (detailScrollRef.current) detailScrollRef.current.scrollTop = 0;
  }, [activeId]);

  useEffect(() => {
    const keepPanelWithinViewport = () => setPanelWidth((current) => clampChecklistPanelWidth(current));
    window.addEventListener('resize', keepPanelWithinViewport);
    keepPanelWithinViewport();
    return () => window.removeEventListener('resize', keepPanelWithinViewport);
  }, []);

  const startPanelResize = (event) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = panelWidth;
    document.body.classList.add('order-queue-resizing');

    const resizePanel = (moveEvent) => {
      setPanelWidth(clampChecklistPanelWidth(startWidth + startX - moveEvent.clientX));
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

  const resizePanelWithKeyboard = (event) => {
    const steps = { ArrowLeft: 24, ArrowRight: -24 };
    if (event.key in steps) {
      event.preventDefault();
      setPanelWidth((current) => clampChecklistPanelWidth(current + steps[event.key]));
      return;
    }
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      const maximumWidth = Math.floor(window.innerWidth * 0.5);
      setPanelWidth(event.key === 'Home' ? Math.min(320, maximumWidth) : maximumWidth);
    }
  };

  const updateSort = (field) => {
    const nextSort = {
      field,
      direction: sort.field === field && sort.direction === 'asc' ? 'desc' : 'asc',
    };
    setSort(nextSort);
    setRowOrder(sortRecords(records, nextSort).map((record) => record.id));
  };

  const editPhase = (phase) => {
    setDraftSections(activeRecord?.sections ?? []);
    setEditingPhases({ pre: phase === 'pre', post: phase === 'post' });
  };

  const cancelPhase = () => {
    setDraftSections(activeRecord?.sections ?? []);
    setEditingPhases({ pre: false, post: false });
  };

  const savePhase = (phase) => {
    if (!activeRecord) return;
    const draftSection = draftSections.find((section) => section.phase === phase);
    if (!draftSection) return;
    const currentSection = activeRecord.sections.find((section) => section.phase === phase);
    const changed = JSON.stringify(currentSection) !== JSON.stringify(draftSection);
    const phaseWasChecked = phase === 'pre' ? activeRecord.preChecked : activeRecord.postChecked;

    setRecords((current) => current.map((record) => {
      if (record.id !== activeId) return record;
      let sections = record.sections.map((section) => section.phase === phase ? draftSection : section);
      const updates = {};
      const phaseUpdateTime = getCurrentTime();
      const isInitialPreSave = phase === 'pre' && record.actualReportTime === '-';

      if (phase === 'post') sections = updatePhaseTime(sections, 'post', phaseUpdateTime);
      if (isInitialPreSave) {
        sections = updateActualReportTime(sections, phaseUpdateTime);
        updates.actualReportTime = phaseUpdateTime;
      }

      if (changed && phase === 'pre' && record.preChecked) {
        sections = updatePhaseInspector(sections, 'pre', '-');
        updates.preChecked = false;
        updates.preInspector = null;
      }
      if (changed && phase === 'post' && record.postChecked) {
        sections = updatePhaseInspector(sections, 'post', '-');
        updates.postChecked = false;
        updates.postInspector = null;
      }

      return {
        ...record,
        ...updates,
        sections,
        updatedAt: `${record.date} ${phaseUpdateTime}`,
      };
    }));
    setEditingPhases({ pre: false, post: false });
    setSnackbar(changed && phaseWasChecked
      ? `${phase === 'pre' ? '作業前' : '作業後'}點呼已儲存，請重新審核`
      : `${phase === 'pre' ? '作業前' : '作業後'}點呼已儲存`);
  };

  const markPhaseChecked = (phase) => {
    if (!activeRecord || activeRecord.actualReportTime === '-') return;
    const checkedKey = phase === 'pre' ? 'preChecked' : 'postChecked';
    const inspectorKey = phase === 'pre' ? 'preInspector' : 'postInspector';

    if (activeRecord[checkedKey]) {
      const sections = updatePhaseInspector(draftSections, phase, '-');
      setRecords((current) => current.map((record) => record.id === activeId ? {
        ...record,
        [checkedKey]: false,
        [inspectorKey]: null,
        sections,
        updatedAt: `${record.date} ${getCurrentTime()}`,
      } : record));
      setSnackbar(`${phase === 'pre' ? '作業前' : '作業後'}已切回未審核`);
      return;
    }

    let sections = updatePhaseInspector(draftSections, phase, '內部員工 / 王日通');
    const time = getCurrentTime();
    setRecords((current) => current.map((record) => record.id === activeId ? {
      ...record,
      [checkedKey]: true,
      [inspectorKey]: '內部員工 / 王日通',
      sections,
      updatedAt: `${record.date} ${time}`,
    } : record));
    setSnackbar(`${phase === 'pre' ? '作業前' : '作業後'}審核已完成`);
  };
  return (
    <Box
      className={`checklist-page ${activeRecord ? 'detail-open' : ''}`}
      style={{ '--checklist-panel-width': activeRecord ? `${panelWidth}px` : '0px' }}
    >
      <Box className="checklist-page-main">
        <Stack direction="row" alignItems="center" className="checklist-page-heading">
          <Typography variant="h5">點呼表紀錄</Typography>
          <Stack direction="row" alignItems="center" spacing={0.5} sx={{ ml: 3 }} className="checklist-date-filter-wrap">
            <Box className="checklist-date-filter-display">
              <CalendarTodayRounded />
              <Typography component="span">日期　{filters.date || '全部日期'}</Typography>
            </Box>
          </Stack>
        </Stack>

        <Paper variant="outlined" className="checklist-table-card">
          <Box className="checklist-list-tools">
            <PageControls total={sorted.length} page={page} pageSize={pageSize} onPage={setPage} onPageSize={(value) => { setPageSize(value); setPage(0); }} onSearch={() => setSearchOpen(true)} />
            {(filters.drivers.length > 0 || filters.preStatus || filters.postStatus) && (
              <Stack direction="row" flexWrap="wrap" className="checklist-filter-chips">
                {filters.drivers.length > 0 && (
                  <Chip
                    size="small"
                    label={`司機：${filters.drivers.join('、')}`}
                    onClick={() => setSearchOpen(true)}
                    onDelete={() => {
                      setFilters((current) => ({ ...current, drivers: [] }));
                      setPage(0);
                    }}
                  />
                )}
                {filters.preStatus && (
                  <Chip
                    size="small"
                    label={`作業前：${filters.preStatus === 'checked' ? '已審核' : '未審核'}`}
                    onClick={() => setSearchOpen(true)}
                    onDelete={() => {
                      setFilters((current) => ({ ...current, preStatus: '' }));
                      setPage(0);
                    }}
                  />
                )}
                {filters.postStatus && (
                  <Chip
                    size="small"
                    label={`作業後：${filters.postStatus === 'checked' ? '已審核' : '未審核'}`}
                    onClick={() => setSearchOpen(true)}
                    onDelete={() => {
                      setFilters((current) => ({ ...current, postStatus: '' }));
                      setPage(0);
                    }}
                  />
                )}
              </Stack>
            )}
          </Box>
          <Box className="checklist-table-scroll">
            <Box className="checklist-table" role="table" aria-label="上下班點呼表清單">
              <Box className="checklist-table-row checklist-table-header" role="row">
                <SortLabel label="司機" field="driver" sort={sort} onSort={updateSort} />
                <SortLabel label="路線" field="route" sort={sort} onSort={updateSort} />
                <SortLabel label="車號" field="plate" sort={sort} onSort={updateSort} />
                <SortLabel label="報到時間" field="reportTime" sort={sort} onSort={updateSort} />
                <SortLabel label="實際報到時間" field="actualReportTime" sort={sort} onSort={updateSort} />
                <SortLabel label="作業前點呼" field="preChecked" sort={sort} onSort={updateSort} />
                <SortLabel label="作業後點呼" field="postChecked" sort={sort} onSort={updateSort} />
                <SortLabel label="最後更新時間" field="updatedAt" sort={sort} onSort={updateSort} />
              </Box>
              {rows.map((record) => (
                <Box
                  key={record.id}
                  className={`checklist-table-row checklist-data-row ${activeId === record.id ? 'active' : ''}`}
                  role="row"
                  tabIndex={0}
                  onClick={() => setActiveId(record.id)}
                  onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setActiveId(record.id); } }}
                >
                  <Typography>{record.driver}</Typography>
                  <Typography>{record.route}</Typography>
                  <Typography>{record.plate}</Typography>
                  <Typography>{record.reportTime}</Typography>
                  <Typography>{record.actualReportTime}</Typography>
                  <Status checked={record.preChecked} />
                  <Status checked={record.postChecked} />
                  <Typography>{record.updatedAt === '-' ? '-' : record.updatedAt.split(' ')[1]}</Typography>
                </Box>
              ))}
              {rows.length === 0 && <Box className="checklist-empty"><Typography color="text.secondary">沒有符合條件的點呼表</Typography></Box>}
            </Box>
          </Box>
        </Paper>
      </Box>

      {activeRecord && (
        <Paper
          square
          variant="outlined"
          className="checklist-detail-panel sidepeek"
          aria-labelledby="checklist-detail-title"
        >
          <Box
            className="order-queue-resize-handle checklist-panel-resize-handle"
            role="separator"
            tabIndex={0}
            aria-label="調整點呼表面板寬度"
            aria-orientation="vertical"
            aria-valuemin={Math.min(320, Math.floor(window.innerWidth * 0.5))}
            aria-valuemax={Math.floor(window.innerWidth * 0.5)}
            aria-valuenow={Math.round(panelWidth)}
            onPointerDown={startPanelResize}
            onKeyDown={resizePanelWithKeyboard}
          />
          <Box className="checklist-detail-header">
            <Typography id="checklist-detail-title" variant="h6">點呼表</Typography>
            <Stack direction="row" spacing={0.25} alignItems="center" className="checklist-detail-header-actions">
              <IconButton size="small" onClick={() => setActiveId(null)} aria-label="關閉詳情"><CloseRounded /></IconButton>
            </Stack>
          </Box>
          <Box ref={detailScrollRef} className="checklist-detail-scroll">
            <Box className="checklist-summary-card">
              <Box className="checklist-summary-heading">
                <Typography className="checklist-summary-driver">{activeRecord.driver}</Typography>
                <Typography className="checklist-summary-updated">
                  {activeRecord.updatedAt === '-' ? '-' : `${activeRecord.updatedAt} 最後更新`}
                </Typography>
              </Box>
              <ChecklistContent sections={draftSections.filter((section) => section.readonly)} />
            </Box>
            <ChecklistContent
              sections={draftSections.filter((section) => !section.readonly)}
              editablePhases={Object.entries(editingPhases).filter(([, editing]) => editing).map(([phase]) => phase)}
              onChange={(nextPhaseSections) => setDraftSections((current) => current.map((section) => (
                nextPhaseSections.find((nextSection) => nextSection.phase === section.phase) ?? section
              )))}
              onEditPhase={editPhase}
              onSavePhase={savePhase}
              onCancelPhase={cancelPhase}
              onCheckPhase={markPhaseChecked}
              phaseActions={{
                pre: {
                  checked: activeRecord.preChecked,
                  disabled: activeRecord.actualReportTime === '-' || editingPhases.pre || editingPhases.post,
                },
                post: {
                  checked: activeRecord.postChecked,
                  disabled: activeRecord.actualReportTime === '-' || editingPhases.pre || editingPhases.post,
                },
              }}
            />
          </Box>
        </Paper>
      )}
      <SearchDrawer open={searchOpen} values={filters} onClose={() => setSearchOpen(false)} onReset={() => { setFilters((current) => ({ ...current, drivers: [], preStatus: '', postStatus: '' })); setPage(0); }} onApply={(next) => { setFilters(next); setPage(0); setSearchOpen(false); }} />
      <Snackbar open={Boolean(snackbar)} autoHideDuration={3200} onClose={() => setSnackbar('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" variant="filled" onClose={() => setSnackbar('')}>{snackbar}</Alert>
      </Snackbar>
    </Box>
  );
}
