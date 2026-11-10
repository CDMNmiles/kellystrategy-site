# Harness Contract：凱利策略官網內容目錄

## Harness 用途

把北極星轉成每次資料匯入與建置後都能重複執行的核驗。Harness 只驗證資料完整性、隱私邊界、四級路由和可用入口；它不替 Miles 判斷影片的思想歸屬，也不會自動操作 YouTube Studio。

## 執行命令

```bash
npm run build
npm run harness
```

Before publishing source files to the public GitHub repository, also run the release privacy scan with paths to the local Studio exports:

```bash
npm run audit:public -- --repo . --studio-csv /path/to/08_Studio完整清单.csv --merged-csv /path/to/09_合并总表.csv --playlists-zip /path/to/channel-export.zip
```

The audit reads the private source files locally and reports only affected repository paths and counts; it never prints restricted IDs. The raw exports themselves must stay outside the repository.

回傳碼：

- `0`：結構與隱私硬檢查通過；尚未核實的分類會列出作為進度，不代表分類已完成。
- `1`：發現硬錯誤，例如非公開影片流入公開目錄、影片 ID／URL 不一致、斷裂播放列表歸屬或目標頁缺失。

## 角色視角

1. **新觀眾任務**：入口頁能看到模組名稱、摘要和代表內容，不會誤以為網站只有一兩支影片。
2. **老觀眾任務**：可以沿「模組 → 系列 → 播放列表 → 影片」逐層找到內容；大量影片不會擠成無限長單頁。
3. **搜尋／AI 任務**：影片和列表具備穩定標識、標題、URL、分類欄位與可追溯來源。
4. **隱私審查任務**：網站公開輸出只含 Studio 明確公開的影片，會員與未知狀態不外洩。

## 硬性檢查

- 目錄根節點含清單來源及核對數據。
- 每支公開影片有唯一 ID、YouTube URL 且 URL 中的 ID 相符。
- `visibility` 必須明確為 Public／公開。
- 每一影片放置必須指向存在的公開播放列表；未匹配影片要明確進待核分類。
- 播放列表需有唯一 ID、非空標題、YouTube playlist URL、模組、系列及狀態。
- 模組 ID 必須在核准集合內；未確認影片／播放列表可以標 `pending`，不可以偽裝成 `approved`。
- 建置後的模組、系列與播放列表路由必須存在；播放列表頁需有真實影片連結或清楚的待匹配提示。
- 搜尋索引不得納入非公開影片；公開影片搜尋結果要有可追溯 YouTube URL。
- 當匯入資料總數或權限分布變更時，報告差異，不沿用舊的固定總數假設。

## 人工審核清單

Harness 不會將下列項目自動判為通過：

- 系列名稱是否符合 Miles 的頻道理念與觀眾理解。
- 播放列表是否應拆分、合併、改名或重新歸屬。
- 首屏輪播影片是否有代表性，而非只有高播放量。
- 會員內容的網站呈現與存取權限。
- 課程、工具、聯絡方式及文章資料是否適合公開。

人工核准必須寫入資料狀態與審核人／日期，不以口頭推測代替。

## 發布閘門

- 原型可在權限保護的預覽環境展示；預覽頁保留 `noindex`。
- 對公眾發布之前，需有：G0 差異核清、G1 分類核准、隱私掃描通過、連結檢查通過、SEO 放行紀錄。
- 任何 Studio 寫入操作都需要逐項變更清單和 Miles 明確批准；Harness 本身絕不寫入 Studio。
