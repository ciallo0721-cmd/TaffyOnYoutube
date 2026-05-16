# YouTube 塔菲缩略图叠加扩展

这是一个 Chrome Manifest V3 浏览器扩展，会在 YouTube 的视频封面缩略图上随机叠加“永雏塔菲 / Taffy”透明图片。扩展不会替换原始封面，只是在封面上添加一个可爱的塔菲贴纸层，适合做成整活、梗图风格的 YouTube 浏览体验。

## 功能

- 只在 `https://www.youtube.com/*` 页面运行。
- 支持 YouTube 首页、搜索结果、视频页推荐栏、订阅页等常见缩略图位置。
- 随机选择多张塔菲透明素材。
- 随机左下角或右下角显示，并带有轻微大小和旋转变化。
- 使用 `MutationObserver` 和定时兜底扫描处理 YouTube 动态加载内容。
- 弹窗支持启用/禁用、调整大小、选择位置。

## 安装

1. 打开 `chrome://extensions`
2. 开启右上角的“开发者模式”
3. 点击“加载已解压的扩展程序”
4. 选择这个项目文件夹
5. 打开或刷新 YouTube 页面

## 素材

塔菲透明图片放在 `images/processed/` 目录中，素材列表由 `images/assets.json` 管理。

如果添加新图片，请把处理好的透明 PNG 放进 `images/processed/`，并把相对路径加入 `images/assets.json`。
