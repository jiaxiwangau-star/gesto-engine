# ✋ Gesture Trainer — 手势识别引擎(录制学习法 / KNN)

对着摄像头做手势 → 网页实时识别 → 弹出你绑定的图片/emoji。
**不写死规则**,而是「录几段样本 → 最近邻分类」:你录什么手势,它就认什么。上传自己的图,训练自己的手势。

> 这是原作品 [gestomeme.com](https://gestomeme.com)(作者 @hi.jessie)的**识别引擎**部分,抽出来做成可复用的独立模块。感谢大家的信任和支持 🙏

> **📄 授权:免费个人 & 非商业使用 · 使用请保留署名(@hi.jessie / gestomeme.com)· ⚠️ 未经授权不得商用**
> Free for personal & non-commercial use · keep attribution · ⚠️ no commercial use without permission.
> (完整条款见下方「使用条款 / Terms of Use」)

## 怎么跑

需要**摄像头** + 在 **https 或 localhost** 下打开(浏览器安全限制)。

```bash
# 任选一种本地静态服务器:
python3 -m http.server 8000
#   或
npx serve .
```
然后浏览器打开 `http://localhost:8000`,允许摄像头权限。

- 选一张图 / 填一个 emoji → 起名 → 点「录制手势」→ 摆好姿势(准备~2 秒,录制~3 秒)。
- 想更准:同名再录几次会**累加样本**;并录几段「🧘 中性」(没做手势的放松样子),避免乱识别。
- 做训练过的手势 → 对应图/emoji 就弹出来。数据存在浏览器 `localStorage`,可「导出 json」备份。

## 文件

| 文件 | 作用 |
|------|------|
| `index.html` | 完整 demo(中英双语,首次可选语言;含使用说明 + 训练面板 + 结果显示 + 使用条款) |
| `example-minimal.html` | **极简接入示例**(约 30 行:创建引擎 → 录一个手势 → 弹结果),想快速看懂怎么用就看这个 |
| `engine.js` | **识别核心**:特征提取 + KNN 分类 + 摄像头循环 + 录制 API(中英注释) |
| `samples.example.json` | 样本数据格式示例 |

## 引擎用法(接进你自己的项目)

```js
import { createEngine } from "./engine.js";

const engine = await createEngine(canvasEl, {
  onStatus:  txt => {},                       // 状态提示
  onGesture: g  => {                          // 识别结果变化时回调
    // g === null 表示中性/无;否则 g = { label, name, img }
  },
  onRecordProgress: (phase, val) => {}         // phase: "prep" | "rec" | "done"
});

engine.record({ label:"g1", name:"举手", img:"😆" }); // 开始录一个手势(img 可为 emoji 或 dataURL 图片)
engine.record({ neutral:true });                      // 录「中性」样本
engine.gestures();   // 已训练的手势列表
engine.remove(label); engine.clearAll(); engine.export();
```

也可直接用三个纯函数:`features(pose, manos)`、`clasificar(feat, muestras)`、`dedosEstado(lm, izq)`。

## 原理速查

- 检测:MediaPipe `@mediapipe/tasks-vision`(pose + hand,lite 模型,从 CDN 加载)。
- 特征(22 维):5 个姿态点(鼻/双肘双腕)按肩宽归一化(10) + 左手[5 指 + 捏合] + 右手[5 指 + 捏合]。
- 分类:对当前帧特征算到所有样本的欧氏距离,阈值 `>16` 判为「无」;`neutral` 够近则优先判中性;否则前 `k=7` 个投票。
- 防抖:连续帧投票,`MINVOTOS=12` 才切换,避免闪烁。

## 使用条款

> 原作品:gestomeme.com　作者:@hi.jessie

本作品(手势识别引擎)免费分享,欢迎自由使用、修改与二次创作。使用本作品即视为同意以下条款。

1. **授权范围**:您可免费将本作品用于个人、学习及非商业性用途,并可对其进行修改与二次开发。
2. **署名**:使用或二次创作时,请保留原作者署名"@hi.jessie"及原作品链接"gestomeme.com";请勿将本作品冒充为您的原创作品发布。
3. **商业使用**:如需将本作品或其衍生版本用于商业用途(包括但不限于销售、付费下载、付费服务或课程、商业产品、广告变现、企业或品牌推广),请事先联系作者获得授权。
4. **图像内容**:本作品不包含任何表情包或第三方图像。您自行上传的图像,其版权、授权及合规性由您自行承担,与原作者无关。
5. **第三方组件**:本作品的姿态与手势检测依赖 MediaPipe(`@mediapipe/tasks-vision`),其使用受各自开源许可约束。
6. **免责声明**:本作品按"现状"提供,不对识别准确性、稳定性或对特定用途的适用性作任何明示或默示担保,使用风险由使用者自行承担。
7. **联系**:商业授权或商务合作,请通过小红书私信联系 @hi.jessie,或邮件 jiaxiwang.au@gmail.com。

## Terms of Use

> Original work: gestomeme.com　Author: @hi.jessie

This Work (the gesture-recognition engine) is shared free of charge. You are welcome to use, modify, and build upon it. By using the Work you agree to the following terms.

1. **Grant of Use.** You may use the Work free of charge for personal, educational, and non-commercial purposes, and may modify it and create derivative works.
2. **Attribution.** When using or adapting the Work, please retain attribution to the original author "@hi.jessie" and the original work link "gestomeme.com," and please do not present the Work as your own original creation.
3. **Commercial Use.** For any commercial use of the Work or its derivatives (including but not limited to sale, paid downloads, paid services or courses, commercial products, advertising or monetization, or corporate/brand promotion), please contact the author in advance to obtain authorization.
4. **Image Content.** The Work contains no meme images or third-party images. You are solely responsible for the rights, licensing, and compliance of any images you upload; the author bears no responsibility in this regard.
5. **Third-Party Components.** Pose and hand detection rely on MediaPipe (`@mediapipe/tasks-vision`), governed by its respective open-source license.
6. **Disclaimer.** The Work is provided "as is," without warranty of any kind as to recognition accuracy, stability, or fitness for a particular purpose. You assume all risks arising from its use.
7. **Contact.** For commercial licensing or collaboration, please contact @hi.jessie via Xiaohongshu direct message, or email jiaxiwang.au@gmail.com.

## 致谢 / Credits

- 手势与姿态识别基于 Google 开源的 [MediaPipe](https://github.com/google-ai-edge/mediapipe)(`@mediapipe/tasks-vision`,Apache-2.0 许可)。分类(KNN)与特征提取为作者原创实现。
- Pose & hand detection are powered by Google's open-source [MediaPipe](https://github.com/google-ai-edge/mediapipe) (`@mediapipe/tasks-vision`, Apache-2.0). The classifier (KNN) and feature extraction are the author's own implementation.
