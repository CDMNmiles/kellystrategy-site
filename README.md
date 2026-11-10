# 凱利策略網站

凱利策略（YouTube：[@SpotRisks](https://www.youtube.com/@SpotRisks)）的內容、課程與百家樂工具網站。

## 專案目標

以清楚的分類導航，連接影片、系列、專題、文字資料、課程與自研工具，支援站內觀看與前往 YouTube。

## 網站入口

- 百家樂：觀點與觀察、課程、現場、風險與異常。
- 老虎機：觀點與觀察、課程、現場、機制與風險。
- 賭場追查：全球事件、平台與監管、玩家遭遇、事件後續。
- 博彩雜談：體育博彩與其他相關話題。
- 課程中心：課程介紹、目錄、試看與諮詢入口。
- 百家樂工具：自研軟體介紹、使用方式、版本與可用入口。
- 關於凱利與站內搜尋。

同一影片、課程或工具可從多個分類進入，共用一份內容記錄與固定詳情頁。

## 開發順序

1. 盤點現有內容與工具，建立來源及分類對應。
2. 確定統一目錄與頁面結構。
3. 使用真實內容驗證網站原型。
4. 建設網站並同步整理 YouTube 播放清單與首頁。
5. 驗收手機體驗、觀看、工具、諮詢及搜尋基礎。
6. 持續補充文字資料、專題與事件後續。

## 目前狀態

2026年11月8日（美國洛杉磯時間）：沿用此倉庫，已加入開發前規格、分類設定與核心資料檢查器。網站頁面、資料匯入、部署與正式網址尚未建立。`content/catalog.json`目前為空，沒有以示例冒充全量內容。

## 開發文件入口

- [專案 Goal：官網內容目錄與頻道重整](goal/kellystrategy-content-rebuild-goal.md)
- [Goal Harness 契約與發布閘門](goal/harness-contract.md)

- [PRD與驗收需求](docs/product/prd-v1.md)
- [資訊架構與路由](docs/product/information-architecture.md)
- [設計任務書](docs/design/design-brief.md)
- [資料模型與公開欄位](docs/engineering/data-model.md)
- [技術方向](docs/engineering/technical-direction.md)
- [資料整理與維護流程](docs/operations/content-workflow.md)
- [開發任務與依賴](docs/operations/development-backlog.md)

## 資料契約檢查

重複執行 Goal Harness：`npm run build && npm run harness`。Harness 檢查公開資料的四級目錄路由、YouTube ID/URL、播放列表歸屬、Studio 可見性與資料總數核對；分類尚待人工確認的項目會列出為待審，不會被視為已完成。

僅檢查開發結構：`python3 scripts/validate_content.py --structure-only`。

檢查公開內容目錄：`python3 scripts/validate_content.py`。空目錄回報`INCOMPLETE`並返回退出碼2；不能視為內容已齊或網站可發布。檢查器不會讀取私人Drive、驗證事實或測試軟體運行。

僅將可公開的程式與內容存入本倉庫；私人資料、未公開課程原件及憑證不屬於公開網站內容。
