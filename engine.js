// engine.js — 手势识别引擎(录制学习法 / KNN)
//   Gesture-recognition engine (record-and-learn / KNN).
// 用 MediaPipe(lite 模型)提取「姿态 + 双手」关键点 → 录样本 → 最近邻(KNN)分类。
//   Uses MediaPipe (lite models) to extract pose + both-hands landmarks → record samples → k-nearest-neighbour classify.
// 纯前端、无第三方分类库,作者原创实现。
//   Pure front-end, no third-party classifier; original implementation.
import { FilesetResolver, PoseLandmarker, HandLandmarker }
  from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs";

// ---------- 特征提取 / Feature extraction ----------
// 每只手 5 根手指的「伸/屈」状态(拇指看 x,其余看指尖是否高于指节)
//   Per hand, the extended/curled state of 5 fingers (thumb by x; others by whether the tip is above the knuckle).
export function dedosEstado(lm, izq){ const tip=[8,12,16,20], mid=[6,10,14,18];
  const out=[(izq ? lm[4].x>lm[3].x : lm[4].x<lm[3].x) ? 1 : 0];
  for(let i=0;i<4;i++) out.push(lm[tip[i]].y < lm[mid[i]].y ? 1 : 0);
  return out; }

// 特征向量 = 5 个姿态点(鼻/双肘双腕)按肩宽归一化(10 维) + 左手[5指+捏合] + 右手[5指+捏合] = 22 维
//   Feature vector = 5 pose points (nose / both elbows / both wrists) normalized by shoulder width (10 dims)
//   + left hand [5 fingers + pinch] + right hand [5 fingers + pinch] = 22 dims.
export function features(pose, manos){ if(!pose) return null;
  const cx=(pose[11].x+pose[12].x)/2, cy=(pose[11].y+pose[12].y)/2;
  const sw=Math.hypot(pose[11].x-pose[12].x, pose[11].y-pose[12].y)+1e-6; const f=[];
  for(const i of [0,13,14,15,16]) f.push((pose[i].x-cx)/sw, (pose[i].y-cy)/sw);
  let izq=[0,0,0,0,0,0], der=[0,0,0,0,0,0];
  for(const m of manos){ const s=[...m.ded, m.pinch]; if(m.izq) izq=s; else der=s; }
  return f.concat(izq, der); }

// ---------- KNN 分类(距离阈值 + 中性优先)/ KNN classify (distance threshold + neutral priority) ----------
export function clasificar(feat, muestras, k=7){ if(!feat || !muestras.length) return null;
  const ds=muestras.map(([lab,v])=>{ let s=0; for(let i=0;i<feat.length;i++){ const d=feat[i]-v[i]; s+=d*d; } return [s,lab]; }).sort((a,b)=>a[0]-b[0]);
  if(ds[0][0] > 16) return null;                                   // 离所有样本都太远 → 判为「无」 / too far from everything → none
  const dN=ds.find(([,l])=>l==="neutral"), dG=ds.find(([,l])=>l!=="neutral");
  if(dN && (!dG || dN[0] <= dG[0]*1.3)) return "neutral";          // 最近的中性够近 → 中性 / nearest neutral close enough → neutral
  const c={}; for(let i=0;i<Math.min(k,ds.length);i++){ const l=ds[i][1]; c[l]=(c[l]||0)+1; }
  return Object.entries(c).sort((a,b)=>b[1]-a[1])[0][0]; }         // 前 k 个投票 / majority vote of the k nearest

// ---------- 引擎:摄像头 + 检测循环 + 录制/识别 / Engine: camera + detection loop + record/recognize ----------
const LS_KEY="gesto_engine_samples";   // 样本存浏览器 localStorage / samples live in the browser's localStorage
export async function createEngine(canvas, { onGesture, onStatus, onRecordProgress, strings }={}){
  const ctx=canvas.getContext("2d"), W=canvas.width, H=canvas.height;
  const S=(k,d)=>(strings && strings[k]!=null) ? strings[k] : d;   // 文案可由外部按语言注入
  const POSE_CONN=[[11,12],[11,13],[13,15],[12,14],[14,16],[0,11],[0,12]];
  const HAND_CONN=[[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[0,9],[9,10],[10,11],[11,12],[0,13],[13,14],[14,15],[15,16],[0,17],[17,18],[18,19],[19,20],[5,9],[9,13],[13,17]];
  const MINVOTOS=12, BUFMAX=16, PREP=120, REC=180;   // 投票阈值 / 缓冲 / 准备~2s / 录制~3s

  let custom = load();
  function load(){ try{ return JSON.parse(localStorage.getItem(LS_KEY)||"{}"); }catch{ return {}; } }
  function save(){ try{ localStorage.setItem(LS_KEY, JSON.stringify(custom)); }catch(e){ onStatus&&onStatus(S("storageFull","⚠ 浏览器存储已满,样本太多了")); } }
  function todasMuestras(){ return Object.entries(custom).flatMap(([lab,d])=>d.samples.map(v=>[lab,v])); }

  onStatus && onStatus(S("loadingModel","加载模型中…(首次要下载几 MB)"));
  const vision=await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm");
  const pose=await PoseLandmarker.createFromOptions(vision,{baseOptions:{modelAssetPath:"https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",delegate:"GPU"},runningMode:"VIDEO",numPoses:1});
  const hand=await HandLandmarker.createFromOptions(vision,{baseOptions:{modelAssetPath:"https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",delegate:"GPU"},runningMode:"VIDEO",numHands:2});

  const video=document.createElement("video"); video.autoplay=true; video.playsInline=true;
  video.srcObject=await navigator.mediaDevices.getUserMedia({video:{width:640,height:480}});
  await video.play();
  onStatus && onStatus(S("ready","好了!上传图 + 录个手势试试 👋"));
  onGesture && onGesture(null);

  function dibujar(conns,lms,col){ ctx.strokeStyle=col; ctx.lineWidth=2; ctx.fillStyle=col;
    for(const [a,b] of conns) if(lms[a]&&lms[b]){ ctx.beginPath(); ctx.moveTo(lms[a].x*W,lms[a].y*H); ctx.lineTo(lms[b].x*W,lms[b].y*H); ctx.stroke(); }
    for(const p of lms) if(p){ ctx.beginPath(); ctx.arc(p.x*W,p.y*H,2,0,7); ctx.fill(); } }

  let _pl=null,_manos=[],ultimo=0;
  function detectar(ts){ const pr=pose.detectForVideo(canvas,ts), hr=hand.detectForVideo(canvas,ts);
    _pl=(pr.landmarks&&pr.landmarks[0])||null; _manos=[];
    if(hr.landmarks) for(let i=0;i<hr.landmarks.length;i++){ const lm=hr.landmarks[i], izq=hr.handednesses[i][0].categoryName==="Left";
      const ded=dedosEstado(lm,izq); const palma=Math.hypot(lm[0].x-lm[9].x,lm[0].y-lm[9].y)+1e-6;
      const pinch=Math.hypot(lm[4].x-lm[8].x,lm[4].y-lm[8].y)/palma; _manos.push({ded,izq,pinch,lm}); } }

  let grabando=null, grabBuf=[], faltan=0;
  let buf=[], imgActual=null;

  function loop(){
    ctx.save(); ctx.scale(-1,1); ctx.drawImage(video,-W,0,W,H); ctx.restore();   // 镜像画面
    const ts=performance.now(); if(ts-ultimo>30){ ultimo=ts; detectar(ts); }
    if(_pl) dibujar(POSE_CONN,_pl,"#5c8"); _manos.forEach(m=>dibujar(HAND_CONN,m.lm,"#8c5"));

    if(grabando){ const feat=features(_pl,_manos);
      const phase = faltan>REC ? "prep" : "rec";
      onRecordProgress && onRecordProgress(phase, Math.ceil((phase==="prep"?faltan-REC:faltan)/60));
      if(phase==="rec" && feat && faltan%2===0) grabBuf.push(feat);
      faltan--;
      if(faltan<=0){
        if(custom[grabando.label]) custom[grabando.label].samples=custom[grabando.label].samples.concat(grabBuf);
        else custom[grabando.label]={ name:grabando.name, img:grabando.img, samples:grabBuf };
        save(); const done=grabando; grabando=null;
        const lf=S("learned",null); onStatus && onStatus(lf?lf(done.name):("✓ 学会「"+done.name+"」啦,比比看"));
        onRecordProgress && onRecordProgress("done", custom[done.label].samples.length);
      }
      requestAnimationFrame(loop); return;
    }

    const key=clasificar(features(_pl,_manos), todasMuestras());
    buf.push(key); if(buf.length>BUFMAX) buf.shift();
    const c={}; buf.forEach(x=>c[x]=(c[x]||0)+1);
    const neutralVotos=(c["neutral"]||0)+(c["null"]||0);
    const acc=Object.entries(c).filter(([k])=>k!=="neutral"&&k!=="null").sort((a,b)=>b[1]-a[1])[0];
    let next=imgActual;
    if(acc && acc[1]>=MINVOTOS && acc[1]>=neutralVotos*2) next=acc[0];
    else if(neutralVotos>=4) next=null;
    if(next!==imgActual){ imgActual=next;
      onGesture && onGesture(imgActual && custom[imgActual] ? { label:imgActual, name:custom[imgActual].name, img:custom[imgActual].img } : null); }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // ---------- 对外 API / Public API ----------
  return {
    record({ label, name, img, neutral }={}){                 // 开始录制一个手势(neutral=录中性)/ start recording a gesture (neutral=record the neutral pose)
      grabando = neutral ? { label:"neutral", name:"中性", img:null } : { label, name, img };
      if(img===undefined && custom[grabando.label]) grabando.img=custom[grabando.label].img; // 累加时保留原图
      grabBuf=[]; faltan=PREP+REC; },
    gestures(){ return Object.entries(custom).map(([label,d])=>({ label, name:d.name, img:d.img, count:Math.round(d.samples.length/90) })); },
    remove(label){ delete custom[label]; save(); },
    clearAll(){ custom={}; save(); },
    export(){ return JSON.stringify(custom); }
  };
}
