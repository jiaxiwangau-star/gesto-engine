# ✋ GESTO Engine — 手势识别引擎(录制学习法 / KNN)

> Gesture-recognition engine · record-and-learn / KNN · pure front-end · powered by MediaPipe
> 对着摄像头做手势 → 浏览器里实时识别 → 弹出你绑定的图片 / emoji。

**不写死规则**,而是「录几段样本 → 最近邻(KNN)分类」:你录什么手势,它就认什么。上传自己的图、训练自己的手势。

> 这是原作品 **[gestomeme.com](https://gestomeme.com)**(作者 **@hi.jessie**)的**识别引擎**部分,抽出来做成可复用的独立模块。感谢大家的信任与支持 🙏
> This is the recognition engine behind [gestomeme.com](https://gestomeme.com), extracted as a reusable module.

---

## 🚀 快速开始 · Quick start

需要**摄像头**,并在 **https 或 localhost** 下打开(浏览器安全限制)。

```bash
python3 -m http.server 8000      # 或 npx serve .
# 浏览器打开 http://localhost:8000,允许摄像头
```

选图 / 填 emoji → 起名 → 「录制手势」→ 摆好姿势(准备 ~2s,录制 ~3s)。同名再录会累加样本;记得也录几段「🧘 中性」(放松、不做手势)避免乱识别。做训练过的手势 → 对应图/emoji 就弹出来。数据存浏览器 `localStorage`,可导出 json 备份。

## 🔌 接进你自己的项目 · Engine API

```js
import { createEngine } from "./engine.js";

const engine = await createEngine(canvasEl, {
  onStatus:  txt => {},
  onGesture: g  => {   // g === null 表示无/中性;否则 g = { label, name, img }
  },
  onRecordProgress: (phase, val) => {}   // phase: "prep" | "rec" | "done"
});

engine.record({ label:"g1", name:"举手", img:"😆" }); // 录一个手势(img 可为 emoji 或 dataURL)
engine.record({ neutral:true });                       // 录「中性」
engine.gestures(); engine.remove(label); engine.clearAll(); engine.export();
```

也可直接用三个纯函数:`features(pose, manos)`、`clasificar(feat, muestras)`、`dedosEstado(lm, izq)`。

## 📁 文件 · Files

| 文件 | 作用 |
|------|------|
| `index.html` | 完整 demo(中英双语,训练面板 + 结果显示) |
| `example-minimal.html` | 极简接入示例(~30 行,想快速看懂就看这个) |
| `engine.js` | 识别核心:特征提取 + KNN + 摄像头循环 + 录制 API |
| `samples.example.json` | 样本数据格式示例 |

## 🧠 原理 · How it works

MediaPipe `@mediapipe/tasks-vision`(pose + hand,lite 模型,CDN 加载)提取关键点 → 22 维特征向量(姿态按肩宽归一 + 双手指状态/捏合)→ 录样本 → KNN 最近邻投票分类。纯前端,无第三方分类库,作者原创。

## 🔒 隐私 · Privacy

纯前端。**摄像头画面只在你自己的浏览器里处理,不上传、不储存。** 训练样本只存在你本机的 `localStorage`。

## 📄 授权 · License

本项目采用 **[PolyForm Noncommercial License 1.0.0](https://polyformproject.org/licenses/noncommercial/1.0.0)**(源码可见 · source-available):

- ✅ **个人、学习、研究等【非商业】用途**免费使用、修改、分发;分发时须**保留条款与署名**(Required Notice)。
  Free to use, modify and share for **non-commercial** purposes; keep the license terms and the Required Notice when distributing.
- ❌ **禁止任何商业用途**(含转售、再授权、用于收费产品/服务)。
  **No commercial use** (incl. resale, sublicensing, or use in any paid product/service).

Required Notice: Copyright (c) 2026 Hi.jessie (@hi.jessie) · gestomeme.com

完整条款见 [`LICENSE`](./LICENSE)。**商用授权请联系 · For a commercial licence:** jiaxiwang.au@gmail.com
