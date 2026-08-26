# NX POC UI Pattern

本文件整理目前 Prototype 已出現的元件與互動，作為後續新增頁面的共用規則。它描述的是元件契約、狀態與組合方式，不是特定頁面的畫面截圖。

視覺 Token、字體、顏色與基礎元件規格以 [`DESIGN.md`](./DESIGN.md) 為準；產品目的與設計原則以 [`PRODUCT.md`](./PRODUCT.md) 為準。

## 1. 使用方式

新增頁面前，依序檢查：

1. `src/theme.js` 是否已有對應的顏色、字體、圓角與 MUI override。
2. 本文件是否已有可沿用的頁面或互動 Pattern。
3. 現有頁面是否已有相同元件契約，可抽成共用元件。
4. 僅在前三層皆無法滿足需求時，才新增頁面專屬元件與 CSS。

共用優先順序固定為：

`Theme Token → MUI 基礎元件 → 共用 Pattern → 頁面業務組合`

不要直接複製另一頁的整段 JSX 或 CSS。當同一 Pattern 在第二個頁面出現時，應抽到 `src/components/`，並由單一 `src/components/index.js` 對外輸出。

## 2. Pattern 與業務邏輯的界線

可以共用：

- 版面骨架、工具列、表格、搜尋 Sheet、右側工作面板與 Dialog 結構。
- 按鈕層級、狀態呈現、Hover／Focus／Disabled 行為。
- Selection、Filter、Pagination、Save Feedback 與 Progressive Disclosure 流程。
- 時間軸、地圖與詳情面板之間的 Focus 同步方式。

留在頁面內：

- 牛奶便、他項任務、點呼表、電子圍籬等業務名詞與判斷公式。
- 候選車輛計算、ETA、延遲容許值與站點座標推算。
- 特定 API payload、權限規則與資料轉換。

判斷原則：元件應接收明確的 `state`、`tone`、`items` 與 callback，不應在共用元件內自行推導物流規則。

## 3. 現有元件盤點與建議共用名稱

| Pattern | 現有參考 | 建議共用名稱 | 使用時機 |
| --- | --- | --- | --- |
| 應用程式骨架 | `Sidebar`、`TopHeader`、`.app-shell` | `AppShell` | 所有後台頁面的導覽與內容框架 |
| 頁面標題列 | `.page-heading-row`、`.monitoring-settings-heading` | `PageHeader` | 頁名、主要動作、輔助入口 |
| 工作區工具列 | `.operations-toolbar` | `WorkspaceToolbar` | 篩選、顯示控制、檢視切換 |
| 分段篩選 | `ToggleButtonGroup.overview-filter-group` | `SegmentedFilter` | 3 至 5 個互斥快速篩選 |
| 管理清單 | `ChecklistManagementPage` 的 table 結構 | `ManagementTable` | 可排序、可選取、可分頁的資料列表 |
| 批次操作列 | `.checklist-selection-bar` | `BulkActionBar` | 選取資料後才出現的批次動作 |
| 分頁列 | `PageControls` | `TablePaginationBar` | 每頁筆數、範圍、首末頁與搜尋入口 |
| 搜尋側板 | `SearchDrawer` | `SearchSheet` | 多條件搜尋與 Filter 編輯 |
| 篩選摘要 | 可刪除的 Filter `Chip` | `AppliedFilterList` | 搜尋套用後顯示目前條件 |
| 右側詳情面板 | `.checklist-detail-panel` | `DetailWorkPanel` | 不離開清單的檢視、編輯、連續處理 |
| 任務決策面板 | `TaskPanel` | `DecisionWorkPanel` | 選擇候選、比較影響、確認安排 |
| 情境地圖 | `.context-map-panel` | `ContextMapPanel` | 主工作流中的定位、比較與距離關係 |
| 監控時間軸 | `Timeline`、`TaskBlock` | `MonitoringTimeline`、`ScheduleBlock` | 計畫、實際、候選空檔與現在時間 |
| 候選空檔 | `CandidateSlot` | `CandidateSlot` | 可點擊或拖放的可安排區段 |
| 狀態文字 | `Status`、時間軸差異文字 | `StatusText` | 一般狀態與營運差異，不濫用 Chip |
| 表單欄位 | `.app-form-field`、`SettingField` | `FormField`、`SettingRow` | 一般表單與設定型欄位 |
| 確認對話框 | `ConfirmDialog` | `ConfirmDialog` | 需明確確認且會改變狀態的短流程 |
| 長表單對話框 | `KeyInDialog` | `FormDialog` | 新增資料等會中斷主流程的完整表單 |
| 調整預覽 | `PreviewDialog` | `BeforeAfterDialog` | 正式寫入前呈現影響與前後差異 |
| 補充說明 | `ChecklistPreview`、`EtaWarningNotes` | `PreviewTooltip`、`ReferencePopover` | 次要預覽與不影響主流程的參考內容 |
| 操作回饋 | `Snackbar`、`Alert` | `ActionFeedback` | 儲存、審核、重設等操作結果 |

## 4. 頁面骨架 Pattern

### 4.1 App Shell

- 桌面側欄展開寬度為 `220px`，收合為 `56px`。
- 小於 `1180px` 時改為 `56px` 高的 Top Header，側欄以 Overlay 方式進出。
- 導覽項目最小高度 `44px`，支援滑鼠、Enter、Space 與 `aria-current="page"`。
- 收合狀態隱藏文字時，必須以 Tooltip 提供名稱。
- 子選單僅在父層展開時顯示；Disabled 項目不可保留可點擊 role 或 tab stop。

### 4.2 Page Header

- 左側放頁面名稱，右側只放頁面級動作。
- 頁面標題使用 `h5`，24px／750。
- 頁面級主要動作每頁最多一個；次要動作使用 outlined 或 icon button。
- 與目前工作內容直接相關的控制應放在 Workspace Toolbar，不要全部塞進 Page Header。

### 4.3 Workspace

- 主要工作表面使用白底與結構邊線，避免卡片層層包覆。
- 工具列固定在工作表面頂部，內容區獨立捲動。
- 主工作區與右側面板共享選取狀態，不各自維護不同來源。
- 面板開啟時主內容縮排；窄螢幕則改為固定於右側的 Overlay。

## 5. 操作層級

### 5.1 Button

| 層級 | 樣式 | 用法 |
| --- | --- | --- |
| Primary | `contained`、深藍 | 儲存、確認、建立、指派，每個操作區只保留一個 |
| Secondary | `outlined` | 搜尋、開啟工具、非破壞性替代操作 |
| Tertiary | text 或 `color="inherit"` | 取消、重設、返回 |
| Icon Action | `IconButton` 搭配 Tooltip | 定位、編輯、關閉、更多操作 |
| Destructive | error 色 | 刪除或不可逆操作，必須搭配確認 |

規則：

- Button 最小高度 `36px`、圓角 `8px`。
- IconButton 必須有 `aria-label`；只有圖示且語意不明時必須搭配 Tooltip。
- Loading 應保留按鈕寬度並停用重複操作，文字改為進行式，例如「指派中…」。
- Disabled 不只降低透明度，也要保留原因於鄰近說明或 Tooltip。

### 5.2 Segmented Filter

- 適用於少量互斥選項，例如「總覽／執行中／異常」。
- Selected 使用白底、品牌藍文字與低陰影；未選取維持中性色。
- 數量寫在 Label 內，狀態圖示僅用於需要快速掃描的例外選項。
- 選項超過 5 個時改用 Select、Tabs 或 Search Sheet。

## 6. 管理清單 Pattern

### 6.1 Management Table

必要狀態：

- Default、Row Hover、Keyboard Focus、Selected、Active Detail、Disabled、Empty。
- Header 可排序時顯示目前方向；未啟用排序的提示圖示降低視覺權重。
- Row Click 開啟詳情；Checkbox 與 More Action 必須停止事件冒泡。
- Row 必須支援 Enter 與 Space，不能只靠滑鼠點擊。
- 沒有資料時，在表格範圍內顯示具體空狀態，例如「沒有符合條件的點呼表」。

### 6.2 Selection 與 Bulk Action

- 批次操作列只在 `selectedCount > 0` 時出現。
- 顯示已選數量、取消選取與主要批次動作。
- 全選僅選取目前可操作的資料；不可操作列的 Checkbox 保持 Disabled。
- 批次狀態改變前使用 Confirm Dialog，完成後清除選取並顯示 Snackbar。

### 6.3 Pagination 與 Search

- Pagination Bar 同時顯示每頁筆數、目前範圍、總筆數與首末頁控制。
- 搜尋使用右側 Search Sheet，不把多個欄位永久攤在工具列。
- Search Sheet 內使用 Draft State；按「搜尋」才套用，按「取消」不改變目前結果。
- 套用條件後，以可點擊、可刪除的 Filter Chip 顯示摘要；刪除單一 Chip 只清除該條件。
- Applied Filter 列與上方 Pagination Bar 間距 `16px`，Chip 之間固定 `8px`。
- Filter 或 Page Size 變更後回到第一頁；目前 Detail 不在結果內時關閉 Detail。

## 7. Progressive Disclosure Pattern

### 7.1 Hover Action

- 適用於低頻、次要操作，例如車輛定位、列更多操作。
- Hover 顯示的動作也必須能透過 Focus Within 顯示，不能只支援滑鼠。
- Hover 不得改變元件尺寸或造成時間軸、表格位移。
- 完成流程所需的唯一操作不可只藏在 Hover。

### 7.2 Tooltip

- 用於圖示名稱、截斷內容與短預覽。
- 不放主要 CTA、表單或必讀錯誤訊息。
- 大型預覽需限制最大寬度，內容保持唯讀。
- 短空狀態 Tooltip 不設定固定最小高度，容器高度依文字內容與內距決定。
- Tooltip 的方向與箭頭需對齊觸發元素，避免遮住正在比較的資料。

### 7.3 Popover

- 用於不需要離開頁面的參考資料，例如 ETA 機制筆記。
- 需有標題、關閉按鈕、最大高度與獨立捲動區。
- 不承載正式提交流程；需要提交時改用 Panel 或 Dialog。

### 7.4 Right Panel

- `DetailWorkPanel` 用於檢視、快速編輯與連續處理。
- Header 固定：標題、編輯入口與關閉。
- Body 獨立捲動；Footer 固定主要操作與上一筆／下一筆。
- 桌面寬度建議介於 `320px` 與 viewport 的 `40%`；可 Resize 時同時支援 Pointer 與鍵盤方向鍵。
- 進入編輯狀態後，Footer 改為「取消／儲存」，不要同時保留瀏覽狀態操作。

### 7.5 Dialog

- Confirm Dialog：短訊息、明確結果、`maxWidth="xs"`。
- Form Dialog：新增或多區段表單，內容可捲動，Header 與 Footer 固定。
- Before／After Dialog：正式寫入前比較影響，先說明「確認前不會修改正式資料」。
- 所有 Dialog 都需要明確標題、關閉方式、取消與主要動作。

## 8. 監控時間軸 Pattern

### 8.1 結構

- 左側 `176px` 固定 Entity Column，右側為可水平捲動的 Timeline Track。
- Header 與 Entity Column 使用 Sticky，讓車輛與時間刻度在捲動時仍可辨識。
- 每列最小高度 `80px`；時間區塊高度 `30px`、圓角 `6px`。
- 現在時間使用深藍垂直線與「現在」標籤，不只靠顏色表達位置。

### 8.2 計畫與實際

- 預設顯示 24 小時，可切換其他範圍。
- 未開啟比較時，單列顯示計畫區塊。
- 開啟「顯示實際狀況」時，計畫區塊置上，實際狀態以較細的線段與端點呈現。
- 準時、提早、延遲必須同時使用顏色、文字時間差與位置關係。
- 橘色預估風險與紅色已發生異常內文使用 Medium；一般計畫文字維持 Regular。

### 8.3 Candidate Slot

- 候選空檔必須對應特定車輛、開始時間、結束時間與前後任務。
- 支援 Click 選取與 Drag／Drop；拖放不可是唯一操作。
- Drag Over 只改變邊框、背景與 Shadow，不改變寬度或列高。
- 選取後同步高亮時間軸列、候選卡與右側決策面板。
- 使用者應能理解「前一便次 → 插單 → 下一便次」，不要只顯示抽象空檔。

### 8.4 Timeline Focus

- 從候選卡或任務入口聚焦時間軸時，同步切換為包含目標車輛的 Filter。
- 水平捲動至目標時間中心，垂直捲動至目標車輛列中心。
- Focus 使用淡藍底與結構線，不用大面積飽和色。
- Hover 與 Selected 分開管理；Hover 離開後不可清除已選狀態。

## 9. Context Map Pattern

### 9.1 開啟與定位

- 地圖是主工作流的情境層，不是獨立 Dashboard。
- 從車輛層級定位時，展開地圖、聚焦車輛，並顯示目前前往站點、連結線與距離。
- 若車輛沒有進行中或未來任務，只定位車輛，不顯示站點 Marker、連結線或距離。
- 從任務層級定位時，顯示該任務站點，不以車輛目前站點覆蓋使用者意圖。

### 9.2 視覺語意

- 車輛使用 Truck Marker；異常狀態另加警示圖示，不能只改 Marker 顏色。
- 站點 Marker 使用永久 Tooltip 顯示「前往站點｜站名」或對應業務 Label。
- 車輛到站點使用次級藍虛線；線段中點顯示直線距離。
- 聚焦時以 `fitBounds` 同時容納車輛與站點；只有單一座標時才使用 `flyTo`。

### 9.3 面板行為

- 地圖展開／收合使用 150 至 250ms 的狀態轉場。
- Resize 後需重新計算地圖尺寸；支援 Pointer 與鍵盤調整高度。
- 放大地圖時保留收合／還原入口，不遮住地圖縮放控制。
- 地圖 Focus 與時間軸 Focus 使用同一個 `focusedEntityId`，避免兩邊各自選到不同資料。

## 10. 表單與設定 Pattern

### 10.1 Form Field

- Label 位於欄位上方，Placeholder 只提供輸入提示，不取代 Label。
- Required、Readonly、Disabled、Error 與 Helper Text 必須清楚區分。
- 少量互斥選項使用 Radio；大量或可搜尋選項使用 Select／Autocomplete。
- Autocomplete 必須定義 `noOptionsText`、相等判斷與清除策略。
- 數值欄位顯示單位並設定合理的 `min`、`max` 或 validation。

### 10.2 Setting Row

- 左側為設定名稱與 Helper，右側為 Control。
- 桌面使用 `minmax(260px, 1fr) / minmax(200px, 280px)`；窄畫面改為單欄。
- 相關設定依主題分 Section，Section 間使用共用邊線，不建立多層 Card。
- 可讀性比表單密度優先；規則句型可將數值輸入嵌入句子，但仍需 `aria-label`。

### 10.3 Save／Reset

- 設定頁 Footer 固定於工作區底部。
- Reset 使用 Tertiary；Save 使用 Primary。
- Save 成功後使用 Snackbar，訊息描述結果，不只寫「成功」。
- Prototype 尚未正式寫入時，頁面需明確標註「示意」或「討論起點」。

## 11. 狀態與回饋

### 11.1 狀態語意

| 語意 | 顏色角色 | 表達方式 |
| --- | --- | --- |
| Success | `success` | 文字＋完成圖示，必要時搭配淡綠背景 |
| Info／Early | `info` | 文字＋時間／資訊圖示，避免與主要操作藍混淆 |
| Warning | `warning` | 預估風險或待注意，使用橘色＋短語 |
| Error／Delayed | `error` | 已發生異常或破壞性操作，使用紅色＋警示圖示 |
| Neutral | text secondary | 尚未開始、無資料、一般歷史狀態 |

- 狀態不可只靠顏色；至少再搭配文字、圖示、形狀或位置。
- Chip 只用於封閉集合或已套用 Filter，不把每個一般欄位都做成 Chip。
- 同一狀態在表格、時間軸、地圖與詳情面板應使用相同名稱。

### 11.2 Feedback

- 成功且不需使用者立即決策：Snackbar。
- 頁面級重要說明或風險：Alert。
- 欄位錯誤：欄位附近的 Error／Helper Text。
- 不可逆或狀態改變：Confirm Dialog。
- Snackbar 建議 2600 至 3200ms，且不能是唯一的錯誤復原入口。

## 12. Responsive 與 Accessibility

- `1180px` 以下切換為 Top Header＋Overlay Sidebar。
- `900px` 以下右側 Detail Panel 改為 Overlay，隱藏 Resize Handle。
- 複雜 Grid 應依序改為兩列再單欄，不縮小文字維持桌面排版。
- 所有可操作元件需有可見的 `:focus-visible`，目前基準為 `2px #2F73C8`。
- 自訂 `role="button"` 必須支援 Enter 與 Space。
- Resize Handle 使用 `role="separator"`、方向、最小值、最大值與目前值。
- 動畫尊重 `prefers-reduced-motion`。
- Hover、拖曳、顏色都不能成為完成任務的唯一方式。

## 13. 建議的共用元件目錄

當第二個頁面開始使用相同 Pattern 時，依下列結構抽離：

```text
src/components/
  index.js
  layout/
    AppShell.jsx
    PageHeader.jsx
    WorkspaceToolbar.jsx
  feedback/
    ActionFeedback.jsx
    ConfirmDialog.jsx
    StatusText.jsx
  forms/
    FormField.jsx
    SearchSheet.jsx
    SettingRow.jsx
  data-display/
    ManagementTable.jsx
    TablePaginationBar.jsx
    AppliedFilterList.jsx
  workspaces/
    DetailWorkPanel.jsx
    ContextMapPanel.jsx
    MonitoringTimeline.jsx
```

抽離時的必要條件：

- Props 描述 UI 狀態，不直接耦合特定頁面的資料結構。
- 共用 CSS 與 Token 集中管理，頁面只能增加版面組合樣式。
- 所有元件具備 Default、Hover、Focus、Active／Selected、Disabled、Loading 或 Empty 中適用的狀態。
- `src/components/index.js` 是唯一公開入口，頁面不跨資料夾深層引用實作檔。

## 14. 新頁面檢查清單

### 開始設計前

- [ ] 已閱讀 `PRODUCT.md`、`DESIGN.md` 與本文件。
- [ ] 已將畫面元素對應到現有 Pattern。
- [ ] 已確認哪些是共用 UI，哪些是頁面業務邏輯。
- [ ] 已確認不會複製已存在的 Table、Search、Panel 或 Dialog。

### 實作時

- [ ] 使用 `src/theme.js` Token，不新增近似色或近似間距。
- [ ] 主要操作每個區域不超過一個。
- [ ] Selection、Hover、Focus 與 Active 狀態彼此分離。
- [ ] IconButton 有 `aria-label`，Tooltip 不是唯一操作入口。
- [ ] Panel、Drawer、Dialog 的使用符合 Progressive Disclosure 層級。
- [ ] 空狀態、Disabled、Loading 與 Error 已定義。

### 完成前

- [ ] 鍵盤可完成主要操作。
- [ ] 狀態不只靠顏色表達。
- [ ] 窄畫面不因固定寬度破版。
- [ ] `npm run build` 與 `git diff --check` 通過。
- [ ] 若 Pattern 契約改變，已同步更新本文件與 `DESIGN.md`。
