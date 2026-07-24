# PROYA SkinLab

珀莱雅 AI 实习生笔试场景 Demo：通过轻量问卷采集用户需求，由规则约束的推荐引擎生成可解释的早晚护肤方案，并将用户行为同步到运营洞察页。

在线体验：[https://lumina1115.github.io/PROYA-demo/](https://lumina1115.github.io/PROYA-demo/)

## 运行

```bash
npm install
npm run dev
```

打开 `http://127.0.0.1:4173`。未配置模型时会自动使用本地推荐引擎，所有用户流程和运营数据均可正常演示。

生产模式：

```bash
npm run build
npm start
```

## GitHub Pages

推送到 `main` 后，`.github/workflows/deploy-pages.yml` 会自动构建并发布静态页面。Pages 环境使用本地推荐引擎，不会请求服务端 API；本地运行仍支持可选 AI 模式。

## 可选 AI 模式

复制 `.env.example` 为 `.env`，配置 OpenAI-compatible API：

```env
AI_API_KEY=your_key
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4.1-mini
```

服务端只把问卷答案、规则检索出的知识和本地基线方案发送给模型。模型不能改变产品候选和使用顺序；超时、无密钥、未知产品或非法 JSON 都会回退本地方案。密钥不会发送给浏览器。

## 验证

```bash
npm run check
npm test
npm run build
npm run visual:test
```

视觉测试复用 Windows 本机 Chrome，自动检查 1440px 和 390px 视口，并走完问卷、结果页与运营页。

## 产品知识与视觉来源

- 珀莱雅官网：[https://www.proya.com/](https://www.proya.com/)
- 双抗系列产品资料：[https://www.proya.com/product_detail-pId-674.html](https://www.proya.com/product_detail-pId-674.html)
- 红宝石系列产品资料：[https://www.proya.com/product_detail-pId-695.html](https://www.proya.com/product_detail-pId-695.html)
- 本地图片 `public/assets/` 均下载自上述官方站点，仅用于本次非商业招聘演示。

应用中的基础洁面、保湿和防晒为方案步骤占位，不代表具体在售 SKU；功效描述保持在日常护肤范围，不构成医疗诊断或治疗意见。
