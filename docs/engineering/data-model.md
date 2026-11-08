# 网站内容数据模型 V1

日期：2026年11月8日｜美国洛杉矶时间
状态：开发契约草案；定义字段与发布规则，尚未完成数据导入或全量盘点。

## 1. 数据分层与存储

首版复用已有资料库，按批次生成可复查的发布数据，不新建数据库服务，也不假设已有自动同步。

| 层 | 用途 | 存放与访问 |
| --- | --- | --- |
| 原始来源 | 原文、图片、演示、课程原件与原始链接 | 已有私人资料库；不复制到公开仓库 |
| 内部整理 | 来源版本、定位、提取结果、核验状态、公开范围、迁移记录 | 私人工作文件；不得打进网页、搜索索引或源映射 |
| 发布数据 | 经核验、允许公开的标题、正文、关联与入口 | 仓库中版本化JSON／Markdown，供构建使用 |
| 生成产物 | 分类页、详情页、搜索索引、站点地图 | 从发布数据生成；与对应提交关联 |

公开仓库只存放第三层及必要开发规范。即使内部资料暂时没有正文，也不能把私人来源ID、链接或文件名当作占位项提交。`.gitignore`是额外保护，发布导出仍须按白名单构造新对象，不能直接序列化内部行。

## 2. 身份、分类与关联

内部对象ID创建后不因标题、分类或网址变化而改变。建议前缀：`vid_`视频、`art_`文章、`ser_`系列、`top_`专题、`crs_`课程、`tool_`工具、`src_`内部来源、`cat_`分类。后缀由导入器生成并持久保存；禁止以行号作为ID。

每个对象具有稳定的`slug`和一个详情页。归入多个栏目时只增加关联，不复制对象。URL由路由配置和slug生成；详情页的规范网址不得由进入它的分类改变。slug调整时记录旧路径并重定向，不能仅删除旧页。

四个主分类key固定为：

| key | 界面名称 | 主要边界 |
| --- | --- | --- |
| `baccarat` | 百家樂 | 游戏相关观察、现场、课程与工具 |
| `slots` | 老虎機 | 游戏相关观察、现场、课程及机制 |
| `investigations` | 賭場追查 | 以具体事件、监管、平台争议或玩家遭遇为核心 |
| `commentary` | 博彩雜談 | 其他博彩领域及相关思考；目录名称待最终设计校准 |

`primary_category`单选；`additional_categories`允许交叉展示且不能包含主分类。`section_ids`表示子栏目，`topic_ids`表示跨栏目专题，`series_ids`表示系列关联。内容形式和观看权限分别记录，不作为主分类。

`courses`和`tools`是功能导航入口，不增加第五、第六种主分类。百家乐课程同时进入百家樂和課程中心；百家乐软件同时进入百家樂和百家樂工具，两处指向同一详情。

系列成员使用有序`items`关联；同一对象不能在同一系列重复。专题是围绕问题组织的关联集合，不要求播放顺序。文章可关联视频，文章与视频仍是两个不同对象，分别表明内容形式。

## 3. 公共字段契约

以下是可公开的编辑字段；发布批次顶层为`schema_version: 1`与`items`数组，分类来自`content/taxonomy.json`。`content/catalog.json`仅接收已核验公开数据；空数组表示尚未导入，不代表全频道没有内容。

| 字段 | 类型 | 约束 |
| --- | --- | --- |
| `id` | string | 全站唯一且稳定 |
| `kind` | enum | `video`／`article`／`series`／`topic`／`course`／`tool` |
| `slug` | string | 同kind内唯一，不含查询参数、斜线或私人标识 |
| `title` | string | 已核对的展示标题；公开界面默认繁体 |
| `summary` | string | 实质简介，不从标题臆造内容 |
| `primary_category` | enum | 四个key之一 |
| `additional_categories` | string[] | 可为空，引用有效分类 |
| `section_ids`／`topic_ids`／`series_ids` | string[] | 按需关联，引用必须存在 |
| `tags`／`search_aliases` | string[] | 公开检索词；简繁与历史栏目别名可在此维护 |
| `thumbnail` | object或null | `url`、`alt`；使用允许公开的素材与替代说明 |
| `published_at` | ISO 8601或null | 原内容公开时间，不能用抓取时间替代 |
| `updated_at` | ISO 8601日期 | 本网页实质更新时间，不随每次构建自动刷新 |
| `public_review` | enum | 发布项必须为`approved`；不把此值当作自动公开授权 |
| `provenance_key` | string或缺省 | 可选无语义溯源键；不得编码私人ID、原件链接、路径或账号信息 |
| `public_references` | object[] | 仅公开出处，含标题、URL与可选定位；不得引用内部来源记录 |
| `related_ids` | string[] | 引用已公开对象，不包含内部草稿ID |

日期未知时为null并由界面隐藏日期，不能补猜测值。草稿不进入发布数据；使用者不能只靠`status=published`这一字段使内部行自动公开。

## 4. 对象专用字段

### 视频 Video

| 字段 | 说明 |
| --- | --- |
| `youtube_id`／`youtube_url` | 实际视频标识及官方观看链接；`youtube_id`全局唯一 |
| `format` | `long`／`short`／`live-replay`，尚未结束的直播另行处理 |
| `access` | `public`／`members`／`purchase`；反映真实观看条件 |
| `embed_status` | `allowed`／`blocked`／`unknown`；带最近核验时间 |
| `duration_seconds` | 实际时长或null |
| `chapters` | `{label,start_seconds}`数组；首项及顺序按真实时间点核对 |
| `transcript` | 可为空；`type`区分逐字稿与整理稿，不能混称 |
| `body` | 本集说明、要点与已核实补充资料 |

会员或付费视频可有公开介绍页；私享播放链接、课程正文或绕过权限的方法不得进入发布数据。没有可公开的YouTube目标时不展示失效跳转按钮。

### 文章 Article 与事件档案

`body`为公开正文；`author_display_name`为核实的公开署名；`article_type`为`analysis`／`reference`／`event`。事件另含`event_date`、`timeline`、`follow_up_ids`、`corrections`。发生日期与报道日期分别记录。时间线每项保存公开文字与出处；事实、当事人说法、个人判断在正文和引用层面表明，不由导入程序强行合并。

### 系列 Series 与专题 Topic

均含`body`与关联`items`。系列items含`content_id`、`order`、可选`episode_label`；专题items含`content_id`与编辑排序。未来集数可在系列说明中如实说明，不生成不存在的视频记录或假链接。

### 课程 Course

`modules`为核实目录，`preview_ids`指向可公开试看内容，`delivery`与`access_term`说明授课及访问方式。`offers`记录购买类型、币种、数额、条件和核验日期；价格未核实则不输出价格字段，界面显示“諮詢課程”。

`contact_keys`引用网站统一公开联系配置；邮箱、微信及WhatsApp仅使用确认可公开的信息。预填内容可以带课程标题，但不得自动发送消息。会员与单购的条件分别记录，不推定包含同样模块和权限。

`content/contacts.json`根字段为`schema_version:1`与`channels`数组，目前为空。每项含`key`（唯一ASCII标识）、`type`（email/wechat/whatsapp）、`label`、`value`、`verified_at`及`public_review:approved`，可选`qr_url`。WhatsApp号码用带加号的国际格式，邮件保存地址而非任意查询字符串；链接与预填文本由页面安全构造。所有`contact_keys`必须在此登记，否则检查失败。未经核验不填占位联系方式。

### 工具 Tool

`availability`为`available`／`trial`／`development`／`retired`。另含`purpose`、`features`、`instructions`、`version`、`platforms`、`requirements`和`release_notes`。

`launch_url`、`download_url`仅在实际核验后输出；`available`至少具备一个有效使用或下载入口。需要多平台版本时可扩展`downloads`数组，下载项包含版本、平台、文件类型和可选校验值。`verified_at`表示入口与主要功能检查日期。开发中可以有准确介绍，但不能出现空的“立即使用”按钮。仓库链接只有明确可以公开时才输出。

## 5. 内部来源与处理记录

内部`SourceRecord`至少含：`source_id`、`provider`、`original_url`、`provider_file_id`、`source_version`、`observed_at`、`source_type`、`owner_scope`、`reading_state`、`public_scope`、`locator`、`extraction_notes`。这些字段描述来源和处理过程，不应发布。

内部`ContentDraft`关联一个或多个来源，保存`source_id`、原文位置、草稿版本、编辑者、核验人及公开范围决定；公开对象ID与内部来源ID通过私有映射关联。删除公开页面不删除来源，保留内部历史。

内部`ImportBatch`记录范围、分页状态、来源时间、导入版本、唯一来源数、处理结果、排除原因和异常。实际导入运行后才填完成数，不把文档中的预算或旧快照当实测。

## 6. 发布字段白名单

导出器应为每种kind声明允许字段，未知字段拒绝而非透传。基础白名单为第3节的字段；专用白名单为第4节相应kind字段。联系配置单独核验。仅复制必要值，不把内部对象放入`metadata`、`debug`或任意扩展字段。

禁止公开：原始私人Drive链接与文件ID、账号身份、内部备注、未公开原文、销售对话、后台数据、会员名单、凭证、私享资源地址、来源未读清单及内部审计证据。公开出处只来自`public_references`，与内部来源路径无关。

发布数据及生成的HTML、JSON、搜索索引、站点地图、浏览器脚本和源映射均检查。校验结构不能替代人工阅读公开内容；白名单通过也不表示资料真实性已证明。

## 7. 批次导入约束

1. 按稳定来源ID去重；同名不直接判重复，同文件不同版本保留版本记录。
2. 按YouTube ID匹配视频；标题改变更新同一记录，不新建视频。
3. 课程、工具采用已登记内部ID；模糊同名进入人工复核，不自动覆盖。
4. 重复运行相同批次不新增重复条目；只更新有确定变更的字段。
5. 导入结果先进入内部整理层；只有已核验公开对象才导出。
6. 所有引用必须解析；公开对象不能指向内部草稿或不存在的关联。
7. 任一发布对象未通过字段、权限或引用检查时阻止该批发布，原线上版本继续有效。

## 8. 需要实现的验证条件

数据实现阶段至少覆盖：ID与YouTube ID唯一、slug唯一、分类合法、引用完整、系列顺序、非负时长与章节边界、公开字段白名单、课程多入口同页、工具状态与入口一致。源数据范围覆盖需要独立对账，不能从这些结构检查推断。

本批已实现核心公开目录检查器 `scripts/validate_content.py`：基础必填、ID与slug、固定导航路径、公开状态、子栏目与联系键注册、关联、视频ID、章节、课程报价核心字段、工具状态与入口、顶层字段白名单及内部链接特征检查。它不代表完整导出器、权限审计或同步器。文字稿、时间线、模块、多平台下载等富结构契约尚未实现，当前检查器拒绝这些字段的非空值；页面开发时须补充具体嵌套契约和检查后再启用。日期新鲜度、来源真实性、工具运行和全量范围另行验收。

事件使用`kind=article, article_type=event`，与普通文章共用`/articles/{slug}/`规范地址，只有展示版式不同；不再另建`/events/`副本。同kind的slug冲突一律拒绝。

子栏目在`taxonomy.sections`登记，`id={category}-{slug}`，状态为`candidate/active/retired`。候选子栏目不生成页面，只有与实际内容核对后设为`active`才能被目录引用；跨分类引用需在`additional_categories`中明确记录。
