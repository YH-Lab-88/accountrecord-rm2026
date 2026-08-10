# 车辆维修花费

这是一个手机友好的轻量网页应用，用来从 Google Sheet 读取车辆维修/保养费用，并按月、按年、按车辆查看。

数据来源：

- Google Sheet: `12yoQGCYgyILB4TNYyjd5DfDzyDI9fogaw2YqipC3CLY`
- 当前接入的费用工作表：`589599760`, `1176444304`, `1994879894`, `1451208396`, `1947397665`
- 车辆资料总览：`0`

本地预览：

```bash
python3 -m http.server 5173
```

然后打开 `http://localhost:5173`。

公开发布：

1. 打开 `https://app.netlify.com/drop`
2. 上传 `vehicle-costs-public.zip`
3. Netlify 会给一个公开网址，任何人都可以打开

如果使用 GitHub Pages，把这些文件放进一个 GitHub repository，然后在 Settings > Pages 选择从 main branch 发布即可。
