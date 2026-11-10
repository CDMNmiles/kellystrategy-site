# GitHub 公開審核包

此分支供審閱官網分類程式與公開內容目錄使用。

- 影片清單只收 YouTube Studio 明確標記為 Public 的影片。
- 會員、私人、不公開及 Studio 未匹配影片的 ID、原始匯出和播放列表成員資料未納入此分支。
- 播放列表名稱明確標示會員專享的清單也不納入公開資料集。
- 公開影片尚未完成分類的，保留「待审核」狀態；自動規則不是創作者核准。
- YouTube Studio 原始 CSV／ZIP 留在本地資料來源；此分支不包含原始匯出。

## 檢視入口

- `goal/kellystrategy-content-rebuild-goal.md`：北極星、階段與驗收標準。
- `goal/harness-contract.md`：隱私、結構和發布閘門。
- `content/youtube-public-four-level-directory.csv`：影片逐行分類底稿。
- `content/youtube-public-directory.json`：網站讀取的公開目錄資料。
- `scripts/import_public_channel_directory.py`：從 Studio 匯出重建公開目錄。
- `scripts/audit_public_release.py`：推送公開 GitHub 前掃描受限影片／播放列表 ID；不輸出 ID 本身。

這是可審核的工作版本，不能視為全頻道最終目錄。
