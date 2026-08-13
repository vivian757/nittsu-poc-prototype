import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  FormControlLabel,
  IconButton,
  Menu,
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
  DoneAllRounded,
  EditOutlined,
  FactCheckOutlined,
  FirstPageRounded,
  LastPageRounded,
  MoreVertRounded,
  PendingOutlined,
  SearchRounded,
  TaskAltRounded,
} from '@mui/icons-material';
import { CHECKLIST_DRIVERS, INITIAL_CHECKLIST_RECORDS } from './checklistData';

const PAGE_SIZES = [10, 25, 50, 100];

const clampChecklistPanelWidth = (width) => {
  if (typeof window === 'undefined') return 420;
  const maximumWidth = Math.floor(window.innerWidth * 0.4);
  const minimumWidth = Math.min(320, maximumWidth);
  return Math.min(maximumWidth, Math.max(minimumWidth, width));
};

const getInitialChecklistPanelWidth = () => {
  if (typeof window === 'undefined') return 420;
  return clampChecklistPanelWidth(Math.min(480, Math.max(360, Math.floor(window.innerWidth * 0.34))));
};

const compare = (a, b, key) => {
  if (key === 'reviewed') return Number(a.reviewed) - Number(b.reviewed);
  if (key === 'driver') return a.driver.localeCompare(b.driver, 'zh-Hant');
  return String(a[key]).localeCompare(String(b[key]), 'zh-Hant');
};

function Status({ reviewed }) {
  return (
    <Stack direction="row" spacing={0.75} alignItems="center" className={reviewed ? 'checklist-status reviewed' : 'checklist-status pending'}>
      {reviewed ? <CheckCircleOutlineRounded /> : <PendingOutlined />}
      <Typography component="span">{reviewed ? '已審核' : '未審核'}</Typography>
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

function ChecklistContent({ sections, editable = false, unreported = false }) {
  if (unreported) {
    return (
      <Box className="checklist-unreported-state">
        <Typography>尚未報到</Typography>
      </Box>
    );
  }

  return (
    <Stack className="checklist-form" spacing={3}>
      {sections.map((section) => (
        <Box key={section.title} className="checklist-form-section">
          <Typography className="checklist-form-title">{section.title}</Typography>
          <Stack spacing={1.5}>
            {section.items.map((item) => (
              <Box key={item.label} className="checklist-form-item">
                <Typography className="checklist-form-label">{item.label}</Typography>
                {editable && item.kind === 'check' ? (
                  <RadioGroup row defaultValue={item.status} className="checklist-radio-group">
                    {['正常', '異常', '不適用'].map((option) => (
                      <FormControlLabel key={option} value={option} control={<Radio size="small" />} label={option} />
                    ))}
                  </RadioGroup>
                ) : editable && !item.readonly ? (
                  <TextField size="small" fullWidth defaultValue={item.value} />
                ) : (
                  <Typography className="checklist-form-value">
                    {item.kind === 'check' ? item.status : item.value}
                  </Typography>
                )}
                {item.note && <Typography className="checklist-form-note">備註：{item.note}</Typography>}
              </Box>
            ))}
          </Stack>
        </Box>
      ))}
    </Stack>
  );
}

function ChecklistPreview({ record, children }) {
  return (
    <Tooltip
      placement="right"
      title={(
        <Box className="checklist-preview">
          <ChecklistContent sections={record.sections} unreported={record.actualReportTime === '-'} />
        </Box>
      )}
      slotProps={{ tooltip: { sx: { maxWidth: 380, bgcolor: '#26364A', p: 1.5 } }, arrow: { sx: { color: '#26364A' } } }}
    >
      {children}
    </Tooltip>
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

function ConfirmDialog({ state, onClose, onConfirm }) {
  if (!state) return null;
  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>確認審核</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary">
          確認審核已選取的 {state.count} 筆點呼表？審核後狀態將變更為「已審核」。
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={onClose}>取消</Button>
        <Button color="primary" variant="contained" onClick={onConfirm}>確認</Button>
      </DialogActions>
    </Dialog>
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
              setDraft((current) => ({ ...current, drivers: [], reviewed: '' }));
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
            <Typography className="app-form-label">審核狀態</Typography>
            <Select
              fullWidth
              size="small"
              displayEmpty
              value={draft.reviewed ?? ''}
              onChange={(event) => setDraft((current) => ({ ...current, reviewed: event.target.value }))}
              renderValue={(value) => value
                ? value === 'reviewed' ? '已審核' : '未審核'
                : <span className="app-form-placeholder">選擇審核狀態</span>}
            >
              <MenuItem value="">全部狀態</MenuItem>
              <MenuItem value="reviewed">已審核</MenuItem>
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
  const [sort, setSort] = useState({ field: 'updatedAt', direction: 'desc' });
  const [filters, setFilters] = useState({ date: '2026/08/12', drivers: [], reviewed: '' });
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState(new Set());
  const [activeId, setActiveId] = useState(null);
  const [editing, setEditing] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [menu, setMenu] = useState({ anchor: null, id: null });
  const [snackbar, setSnackbar] = useState('');
  const [panelWidth, setPanelWidth] = useState(getInitialChecklistPanelWidth);

  const filtered = useMemo(() => records.filter((record) => (
    (!filters.date || record.date === filters.date)
    && (!filters.drivers.length || filters.drivers.includes(record.driver))
    && (!filters.reviewed || record.reviewed === (filters.reviewed === 'reviewed'))
  )), [records, filters]);

  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    const result = compare(a, b, sort.field);
    return sort.direction === 'asc' ? result : -result;
  }), [filtered, sort]);

  const rows = sorted.slice(page * pageSize, page * pageSize + pageSize);
  const activeIndex = sorted.findIndex((record) => record.id === activeId);
  const activeRecord = activeIndex >= 0 ? sorted[activeIndex] : null;
  const menuRecord = records.find((record) => record.id === menu.id);
  const reviewableRows = rows.filter((record) => record.actualReportTime !== '-');
  const allRowsSelected = reviewableRows.length > 0 && reviewableRows.every((record) => selected.has(record.id));

  useEffect(() => {
    if (page > Math.max(0, Math.ceil(sorted.length / pageSize) - 1)) setPage(0);
    if (activeId && !sorted.some((record) => record.id === activeId)) setActiveId(null);
  }, [sorted, page, pageSize, activeId]);

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
      const maximumWidth = Math.floor(window.innerWidth * 0.4);
      setPanelWidth(event.key === 'Home' ? Math.min(320, maximumWidth) : maximumWidth);
    }
  };

  const updateSort = (field) => setSort((current) => ({
    field,
    direction: current.field === field && current.direction === 'asc' ? 'desc' : 'asc',
  }));
  const toggleRow = (id) => setSelected((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const togglePage = () => setSelected((current) => {
    const next = new Set(current);
    reviewableRows.forEach((record) => { if (allRowsSelected) next.delete(record.id); else next.add(record.id); });
    return next;
  });
  const reviewIds = (ids, message = '點呼表已審核') => {
    setRecords((current) => current.map((record) => (
      ids.has(record.id) && record.actualReportTime !== '-'
        ? { ...record, reviewed: true, inspector: '王日通' }
        : record
    )));
    setSelected(new Set());
    setSnackbar(message);
  };
  const saveEdit = () => {
    setRecords((current) => current.map((record) => record.id === activeId ? { ...record, reviewed: false, inspector: null, updatedAt: '2026/08/12 10:42' } : record));
    setEditing(false);
    setSnackbar('內容已更新，狀態已退回未審核');
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

        {selected.size > 0 && (
          <Box className="checklist-selection-bar">
            <Typography>已選取 {selected.size} 項</Typography>
            <Button size="small" onClick={() => setSelected(new Set())}>取消選取</Button>
            <Box sx={{ flex: 1 }} />
            <Button size="small" variant="contained" startIcon={<DoneAllRounded />} onClick={() => setConfirm({ type: 'review', count: selected.size })}>審核</Button>
          </Box>
        )}

        <Paper variant="outlined" className="checklist-table-card">
          <Box className="checklist-list-tools">
            <PageControls total={sorted.length} page={page} pageSize={pageSize} onPage={setPage} onPageSize={(value) => { setPageSize(value); setPage(0); }} onSearch={() => setSearchOpen(true)} />
            {(filters.drivers.length > 0 || filters.reviewed) && (
              <Stack direction="row" flexWrap="wrap" gap={1} mt={2}>
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
                {filters.reviewed && (
                  <Chip
                    size="small"
                    label={`審核狀態：${filters.reviewed === 'reviewed' ? '已審核' : '未審核'}`}
                    onClick={() => setSearchOpen(true)}
                    onDelete={() => {
                      setFilters((current) => ({ ...current, reviewed: '' }));
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
                <Checkbox size="small" checked={allRowsSelected} indeterminate={selected.size > 0 && !allRowsSelected} onChange={togglePage} inputProps={{ 'aria-label': '選取本頁' }} />
                <SortLabel label="司機" field="driver" sort={sort} onSort={updateSort} />
                <SortLabel label="報到時間" field="reportTime" sort={sort} onSort={updateSort} />
                <SortLabel label="實際報到時間" field="actualReportTime" sort={sort} onSort={updateSort} />
                <SortLabel label="審核狀態" field="reviewed" sort={sort} onSort={updateSort} />
                <span className="checklist-column-label">點呼表</span>
                <SortLabel label="最後更新時間" field="updatedAt" sort={sort} onSort={updateSort} />
                <span className="checklist-column-label">點檢者</span>
                <span />
              </Box>
              {rows.map((record) => (
                <Box
                  key={record.id}
                  className={`checklist-table-row checklist-data-row ${activeId === record.id ? 'active' : ''}`}
                  role="row"
                  tabIndex={0}
                  onClick={() => { setActiveId(record.id); setEditing(false); }}
                  onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setActiveId(record.id); setEditing(false); } }}
                >
                  <Checkbox size="small" disabled={record.actualReportTime === '-'} checked={selected.has(record.id)} onClick={(event) => event.stopPropagation()} onChange={() => toggleRow(record.id)} inputProps={{ 'aria-label': `選取 ${record.driver}` }} />
                  <Typography>{record.driver}</Typography>
                  <Typography>{record.reportTime}</Typography>
                  <Typography>{record.actualReportTime}</Typography>
                  <Status reviewed={record.reviewed} />
                  <ChecklistPreview record={record}>
                    <IconButton size="small" onClick={(event) => event.stopPropagation()} aria-label="預覽點呼表"><FactCheckOutlined className="checklist-document-icon" /></IconButton>
                  </ChecklistPreview>
                  <Typography>{record.updatedAt === '-' ? '-' : record.updatedAt.split(' ')[1]}</Typography>
                  <Typography>{record.reviewed && record.inspector ? `內部員工／${record.inspector}` : '-'}</Typography>
                  <IconButton size="small" onClick={(event) => { event.stopPropagation(); setMenu({ anchor: event.currentTarget, id: record.id }); }} aria-label="更多操作"><MoreVertRounded /></IconButton>
                </Box>
              ))}
              {rows.length === 0 && <Box className="checklist-empty"><Typography color="text.secondary">沒有符合條件的點呼表</Typography></Box>}
            </Box>
          </Box>
        </Paper>
      </Box>

      {activeRecord && (
        <Paper square variant="outlined" className="checklist-detail-panel">
          <Box
            className="order-queue-resize-handle checklist-panel-resize-handle"
            role="separator"
            tabIndex={0}
            aria-label="調整點呼表面板寬度"
            aria-orientation="vertical"
            aria-valuemin={Math.min(320, Math.floor(window.innerWidth * 0.4))}
            aria-valuemax={Math.floor(window.innerWidth * 0.4)}
            aria-valuenow={Math.round(panelWidth)}
            onPointerDown={startPanelResize}
            onKeyDown={resizePanelWithKeyboard}
          />
          <Box className="checklist-detail-header">
            <Typography variant="h6">點呼表</Typography>
            <Stack direction="row" spacing={0.25} alignItems="center" className="checklist-detail-header-actions">
              {!editing && activeRecord.actualReportTime !== '-' && <Tooltip title="編輯"><IconButton className="checklist-detail-edit-button" size="small" color="primary" onClick={() => setEditing(true)}><EditOutlined /></IconButton></Tooltip>}
              <IconButton size="small" onClick={() => setActiveId(null)} aria-label="關閉詳情"><CloseRounded /></IconButton>
            </Stack>
          </Box>
          <Box className="checklist-detail-scroll">
            <Typography className="checklist-detail-meta">
              {activeRecord.driver}・{activeRecord.updatedAt === '-' ? '最後更新時間 -' : `${activeRecord.updatedAt} 最後更新`}
            </Typography>
            <ChecklistContent sections={activeRecord.sections} editable={editing} unreported={activeRecord.actualReportTime === '-'} />
          </Box>
          <Box className="checklist-detail-actions">
            {editing ? (
              <Stack direction="row" spacing={1.5}>
                <Button fullWidth color="inherit" variant="outlined" onClick={() => setEditing(false)}>取消</Button>
                <Button fullWidth variant="contained" onClick={saveEdit}>儲存</Button>
              </Stack>
            ) : (
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Box className="checklist-record-switcher" aria-label="切換點呼表">
                  <Tooltip title="上一筆">
                    <span><IconButton size="small" disabled={activeIndex <= 0} onClick={() => setActiveId(sorted[activeIndex - 1]?.id)}><ArrowUpwardRounded /></IconButton></span>
                  </Tooltip>
                  <Typography component="span">{activeIndex + 1}/{sorted.length}</Typography>
                  <Tooltip title="下一筆">
                    <span><IconButton size="small" disabled={activeIndex >= sorted.length - 1} onClick={() => setActiveId(sorted[activeIndex + 1]?.id)}><ArrowDownwardRounded /></IconButton></span>
                  </Tooltip>
                </Box>
                <Button
                  fullWidth
                  className={`checklist-review-action ${activeRecord.reviewed ? 'reviewed' : ''}`}
                  variant={activeRecord.reviewed ? 'outlined' : 'contained'}
                  startIcon={activeRecord.reviewed ? (
                    <>
                      <CheckCircleOutlineRounded className="review-status-icon" />
                      <PendingOutlined className="review-revert-icon" />
                    </>
                  ) : <TaskAltRounded />}
                  aria-label={activeRecord.reviewed ? '切回未審核' : '審核並查看下筆'}
                  disabled={activeRecord.actualReportTime === '-'}
                  onClick={() => {
                    if (activeRecord.reviewed) {
                      setRecords((current) => current.map((record) => (
                        record.id === activeRecord.id ? { ...record, reviewed: false, inspector: null } : record
                      )));
                      setSnackbar('已切回未審核');
                      return;
                    }
                    reviewIds(new Set([activeRecord.id]), '點呼表已審核');
                    setActiveId(sorted[activeIndex + 1]?.id ?? null);
                  }}
                >
                  {activeRecord.actualReportTime === '-' ? '審核並查看下筆' : activeRecord.reviewed ? (
                    <>
                      <span className="review-status-label">已審核</span>
                      <span className="review-revert-label">切回未審核</span>
                    </>
                  ) : '審核並查看下筆'}
                </Button>
              </Stack>
            )}
          </Box>
        </Paper>
      )}

      <Menu anchorEl={menu.anchor} open={Boolean(menu.anchor)} onClose={() => setMenu({ anchor: null, id: null })}>
        <MenuItem
          disabled={menuRecord?.actualReportTime === '-'}
          onClick={() => { setActiveId(menu.id); setEditing(true); setMenu({ anchor: null, id: null }); }}
        >
          <EditOutlined fontSize="small" />編輯
        </MenuItem>
      </Menu>
      <SearchDrawer open={searchOpen} values={filters} onClose={() => setSearchOpen(false)} onReset={() => { setFilters((current) => ({ ...current, drivers: [], reviewed: '' })); setPage(0); }} onApply={(next) => { setFilters(next); setPage(0); setSearchOpen(false); }} />
      <ConfirmDialog
        state={confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          reviewIds(selected);
          setConfirm(null);
        }}
      />
      <Snackbar open={Boolean(snackbar)} autoHideDuration={3200} onClose={() => setSnackbar('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" variant="filled" onClose={() => setSnackbar('')}>{snackbar}</Alert>
      </Snackbar>
    </Box>
  );
}
