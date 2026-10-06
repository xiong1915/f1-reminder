# 🏎️ F1 比赛开赛前 30 分钟云端自动化提醒 (GitHub Actions)

**电脑彻底关机、断电、手机也能在开赛前 30 分钟准时收到微信提醒！**
基于 GitHub Actions 7×24 小时全天候免费云端运行，无需购买任何云服务器。

---

## 📁 项目文件一览

- [reminder.js](file:///C:/Users/Administrator/.gemini/antigravity/scratch/f1-race-reminder-cloud/reminder.js) - 核心赛程检测与微信推送脚本（Node.js 原生零依赖，秒级启动）
- [.github/workflows/f1-reminder.yml](file:///C:/Users/Administrator/.gemini/antigravity/scratch/f1-race-reminder-cloud/.github/workflows/f1-reminder.yml) - GitHub Actions 云端定时任务定义（每 15 分钟云端自动执行）
- [history.json](file:///C:/Users/Administrator/.gemini/antigravity/scratch/f1-race-reminder-cloud/history.json) - 已推送比赛历史（云端自动提交维护，绝不重复打扰）

---

## 🚀 3 步在 GitHub 上启用（完全在网页操作）

### 第一步：在 GitHub 新建一个仓库
1. 登录您的 GitHub 账号（若没有可免费注册一个）。
2. 点击右上角的 **`+` $\rightarrow$ `New repository`**。
3. 仓库名称填写：`f1-reminder`，选择 **Private（私有）** 或 **Public（公开）** 均可，点击 **Create repository**。

---

### 第二步：上传/创建两个文件
在新建的仓库页面上，点击 **Add file $\rightarrow$ Create new file**：

1. **第一个文件**：
   - 文件名填：`reminder.js`
   - 内容直接复制本地的 [`reminder.js`](file:///C:/Users/Administrator/.gemini/antigravity/scratch/f1-race-reminder-cloud/reminder.js) 的全部代码并点击 **Commit changes**。

2. **第二个文件**：
   - 文件名填：`.github/workflows/f1-reminder.yml`
   - 内容直接复制本地的 [`f1-reminder.yml`](file:///C:/Users/Administrator/.gemini/antigravity/scratch/f1-race-reminder-cloud/.github/workflows/f1-reminder.yml) 的全部代码并点击 **Commit changes**。

---

### 第三步：配置您的微信推送密钥（Secret）

1. 进入仓库上方的 **Settings**（设置） $\rightarrow$ 左侧栏 **Secrets and variables** $\rightarrow$ **Actions**。
2. 点击绿色的 **New repository secret** 按钮：
   - **Name** 填：`PUSH_KEY`
   - **Secret** 填：您的 **Pushplus Token**（或企业微信 Webhook、Server酱 Key）
   - 点击 **Add secret**。
3. （可选）如果您使用的是 Pushplus 的微信 ClawBot 渠道：
   - 再添加一个 Secret：
     - **Name** 填：`PUSHPLUS_CHANNEL`
     - **Secret** 填：`clawbot`

---

### 第四步：测试运行并坐等提醒

1. 进入仓库顶部的 **Actions** 标签页。
2. 在左侧列表中点击 **F1 Race 30-Min Reminder** 工作流。
3. 点击右侧的 **Run workflow $\rightarrow$ 绿色按钮 Run workflow** 进行一次手动测试。
4. **大功告成！** 
   - 以后云端会每 15 分钟自动巡检一次；
   - 在任意练习赛、排位赛、冲刺赛、正赛开赛前 **30 分钟**，云端会自动给您的微信推送消息；
   - **您的电脑无论开机、关机、休眠、甚至断网，都丝毫不会影响推送！**
