# ChatGPT Sites 发布指令

请把当前项目做成一个可发布的 ChatGPT Site，网站名称为“车辆维修花费”。

要求：

- 做成手机优先的轻量 app。
- 第一屏必须是密码界面。
- 用户输入密码 `3388` 并点击“打开”后，才进入 app。
- 未输入正确密码前，不要读取或显示 Google Sheet 数据。
- 进入后显示所有车辆的维修/保养花费。
- 数据从这个 Google Sheet 读取：
  `https://docs.google.com/spreadsheets/d/12yoQGCYgyILB4TNYyjd5DfDzyDI9fogaw2YqipC3CLY/edit?usp=sharing`
- 需要支持按月、按年、按车辆查看。
- 需要手机浏览器和加到主屏幕后都能正常使用。
- 发布为公开链接，让手机和其他人都可以打开。

当前项目文件已经包含：

- `index.html`
- `styles.css`
- `app.js`
- `manifest.webmanifest`
- `sw.js`
- `icon.svg`

请保留现有功能与样式，发布前预览并确认输入 `3388` 后可以正常进入费用看板。
