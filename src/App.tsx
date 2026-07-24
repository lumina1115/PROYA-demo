import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Bookmark,
  Check,
  ChevronRight,
  CircleHelp,
  FlaskConical,
  Leaf,
  LoaderCircle,
  Menu,
  Moon,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Sun,
  ThumbsDown,
  ThumbsUp,
  X,
} from "lucide-react";
import { products, productMap } from "./data/products";
import { loadAnalytics, track } from "./lib/analytics";
import { buildLocalRecommendation, retrieveProducts } from "./lib/recommendation";
import { recommendationResultSchema, type AnalyticsEvent, type Concern, type RecommendationResult, type UserProfile } from "./types";

type View = "lab" | "insights";
type Phase = "intro" | "quiz" | "analyzing" | "result";

const initialProfile: UserProfile = {
  name: "",
  concerns: [],
  sensitivity: "medium",
  environments: [],
  currentRoutine: [],
  budget: "balanced",
  routine: "standard",
};

const concernOptions: { id: Concern; label: string; detail: string }[] = [
  { id: "dullness", label: "暗沉倦态", detail: "熬夜后气色不佳、肤色不匀" },
  { id: "lines", label: "细纹松弛", detail: "表情纹、干纹或弹润感下降" },
  { id: "sensitivity", label: "敏感脆弱", detail: "容易泛红、刺痛或状态波动" },
  { id: "dryness", label: "干燥缺水", detail: "紧绷、起皮或上妆卡粉" },
  { id: "oiliness", label: "油光失衡", detail: "T 区油光或水油不平衡" },
];

const environmentOptions = [
  { id: "lateNight", label: "经常熬夜" },
  { id: "sun", label: "户外日晒" },
  { id: "aircon", label: "久处空调房" },
  { id: "stress", label: "压力较大" },
] as const;

function Logo() {
  return (
    <div className="brand" aria-label="PROYA SkinLab">
      <span className="brand-word">PROYA</span>
      <span className="brand-divider" />
      <span className="brand-lab">SKINLAB</span>
    </div>
  );
}

function Header({ view, setView }: { view: View; setView: (view: View) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <header className="topbar">
      <Logo />
      <nav className={open ? "main-nav open" : "main-nav"} aria-label="主导航">
        <button className={view === "lab" ? "nav-item active" : "nav-item"} onClick={() => { setView("lab"); setOpen(false); }}>智能方案</button>
        <button className={view === "insights" ? "nav-item active" : "nav-item"} onClick={() => { setView("insights"); setOpen(false); }}>运营洞察</button>
      </nav>
      <div className="header-meta"><span className="status-dot" /> 本地知识库已就绪</div>
      <button className="icon-button menu-button" aria-label={open ? "关闭菜单" : "打开菜单"} title={open ? "关闭菜单" : "打开菜单"} onClick={() => setOpen(!open)}>{open ? <X size={20} /> : <Menu size={20} />}</button>
    </header>
  );
}

function Intro({ profile, setProfile, onStart }: { profile: UserProfile; setProfile: (p: UserProfile) => void; onStart: () => void }) {
  return (
    <main className="intro-layout">
      <section className="intro-copy">
        <div className="eyebrow"><Sparkles size={16} /> AI 肌肤方案实验室</div>
        <h1>从你的肌肤信号，<br />找到刚好的护理节奏。</h1>
        <p>约 2 分钟完成需求采集。SkinLab 会基于珀莱雅功效产品知识，组合一套有依据、能坚持的早晚方案。</p>
        <div className="trust-row">
          <span><ShieldCheck size={17} /> 规则约束推荐</span>
          <span><FlaskConical size={17} /> 产品知识溯源</span>
          <span><Leaf size={17} /> 敏感状态优先</span>
        </div>
        <div className="name-entry">
          <label htmlFor="name">怎么称呼你</label>
          <div className="input-action">
            <input id="name" maxLength={20} placeholder="输入昵称" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} onKeyDown={(e) => e.key === "Enter" && profile.name.trim() && onStart()} />
            <button className="primary-button" onClick={onStart} disabled={!profile.name.trim()}>开始分析 <ArrowRight size={18} /></button>
          </div>
          <small>仅用于生成本次体验，不会上传个人身份信息。</small>
        </div>
      </section>
      <section className="product-stage" aria-label="珀莱雅功效产品线">
        <div className="stage-label"><span>01</span><div>知识库覆盖<br /><strong>三大功效线</strong></div></div>
        <div className="product-visual main"><img src="/assets/double-anti.jpg" alt="珀莱雅双抗产品官方视觉" /><span>日间透亮</span></div>
        <div className="product-visual secondary"><img src="/assets/ruby.png" alt="珀莱雅红宝石精华官方视觉" /><span>夜间紧致</span></div>
        <div className="stage-note">不是“猜产品”，而是先理解需求，再匹配可解释的护理路径。</div>
      </section>
    </main>
  );
}

function OptionButton({ selected, children, onClick, detail }: { selected: boolean; children: React.ReactNode; onClick: () => void; detail?: string }) {
  return <button className={selected ? "option selected" : "option"} onClick={onClick}><span className="option-check">{selected && <Check size={15} />}</span><span><strong>{children}</strong>{detail && <small>{detail}</small>}</span></button>;
}

function Quiz({ profile, setProfile, step, setStep, onComplete }: { profile: UserProfile; setProfile: (p: UserProfile) => void; step: number; setStep: (n: number) => void; onComplete: () => void }) {
  const toggle = <T extends string>(values: T[], value: T, max?: number) => values.includes(value) ? values.filter((item) => item !== value) : max && values.length >= max ? values : [...values, value];
  const valid = step === 0 ? profile.concerns.length > 0 : step === 1 ? Boolean(profile.sensitivity) : step === 2 ? profile.environments.length > 0 : true;
  const titles = ["你最想优先改善什么？", "最近的肌肤耐受状态如何？", "哪些生活场景更接近你？", "最后，定下你能坚持的节奏"];
  const subtitles = ["最多选择 3 项，我们会据此确定功效优先级。", "耐受状态会直接影响产品候选和使用频次。", "环境压力会改变日间防护与夜间修护的权重。", "真正有效的方案，首先应该能被长期执行。"];
  return (
    <main className="quiz-shell">
      <aside className="quiz-aside">
        <div><span className="aside-index">0{step + 1}</span><span className="aside-total">/ 04</span></div>
        <div className={`progress-rail progress-${step + 1}`}><span style={{ height: `${(step + 1) * 25}%` }} /></div>
        <p>肤况采集</p>
      </aside>
      <section className="quiz-panel">
        <div className="quiz-heading"><span>STEP {step + 1}</span><h2>{titles[step]}</h2><p>{subtitles[step]}</p></div>
        <div className={step === 0 ? "option-grid concerns" : "option-grid"}>
          {step === 0 && concernOptions.map((item) => <OptionButton key={item.id} selected={profile.concerns.includes(item.id)} onClick={() => setProfile({ ...profile, concerns: toggle(profile.concerns, item.id, 3) })} detail={item.detail}>{item.label}</OptionButton>)}
          {step === 1 && ([{ id: "low", label: "状态稳定", detail: "很少出现泛红或刺痛" }, { id: "medium", label: "偶有波动", detail: "换季或熬夜时会不稳定" }, { id: "high", label: "容易敏感", detail: "近期有泛红、刺痛或脱屑" }] as const).map((item) => <OptionButton key={item.id} selected={profile.sensitivity === item.id} onClick={() => setProfile({ ...profile, sensitivity: item.id })} detail={item.detail}>{item.label}</OptionButton>)}
          {step === 2 && environmentOptions.map((item) => <OptionButton key={item.id} selected={profile.environments.includes(item.id)} onClick={() => setProfile({ ...profile, environments: toggle(profile.environments, item.id) })}>{item.label}</OptionButton>)}
          {step === 3 && <FinalPreferences profile={profile} setProfile={setProfile} />}
        </div>
        <div className="quiz-actions">
          <button className="text-button" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}><ArrowLeft size={17} /> 上一步</button>
          <button className="primary-button" disabled={!valid} onClick={() => step === 3 ? onComplete() : setStep(step + 1)}>{step === 3 ? "生成我的方案" : "继续"} <ArrowRight size={18} /></button>
        </div>
      </section>
    </main>
  );
}

function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { id: T; label: string }[]; onChange: (value: T) => void }) {
  return <div className="segmented">{options.map((item) => <button key={item.id} className={value === item.id ? "active" : ""} onClick={() => onChange(item.id)}>{item.label}</button>)}</div>;
}

function FinalPreferences({ profile, setProfile }: { profile: UserProfile; setProfile: (p: UserProfile) => void }) {
  return <div className="preferences">
    <div className="preference-row"><div><strong>每日步骤</strong><small>选择你更容易坚持的复杂度</small></div><Segmented value={profile.routine} onChange={(routine) => setProfile({ ...profile, routine })} options={[{ id: "minimal", label: "极简" }, { id: "standard", label: "标准" }, { id: "advanced", label: "进阶" }]} /></div>
    <div className="preference-row"><div><strong>方案投入</strong><small>决定核心产品与完整护理的取舍</small></div><Segmented value={profile.budget} onChange={(budget) => setProfile({ ...profile, budget })} options={[{ id: "focused", label: "重点投入" }, { id: "balanced", label: "均衡配置" }, { id: "complete", label: "完整体验" }]} /></div>
  </div>;
}

function Analyzing() {
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setStage((value) => Math.min(2, value + 1)), 620);
    return () => window.clearInterval(timer);
  }, []);
  return <main className="analyzing"><div className="analysis-orbit"><LoaderCircle size={56} /><span>AI</span></div><div className="analysis-copy"><span>正在构建你的方案</span><h2>{["读取肌肤需求权重", "检索产品知识与使用边界", "组合可执行的早晚节奏"][stage]}</h2><div className="analysis-steps">{[0, 1, 2].map((item) => <i key={item} className={stage >= item ? "done" : ""} />)}</div><p>推荐规则先确定安全候选，AI 只在已验证的知识范围内组织解释。</p></div></main>;
}

function ScoreBars({ result }: { result: RecommendationResult }) {
  return <div className="score-bars">{[["抗氧提亮", result.scores.antioxidant], ["紧致淡纹", result.scores.firming], ["屏障稳态", result.scores.barrier]].map(([label, value]) => <div className="score-row" key={label}><span>{label}</span><div><i style={{ width: `${value}%` }} /></div><strong>{value}</strong></div>)}</div>;
}

function RoutineColumn({ title, icon, steps }: { title: string; icon: React.ReactNode; steps: RecommendationResult["morning"] }) {
  return <section className="routine-column"><div className="routine-title">{icon}<div><span>ROUTINE</span><h3>{title}</h3></div></div><div className="routine-list">{steps.map((step, index) => { const product = productMap.get(step.productId); return <article className="routine-step" key={`${step.slot}-${step.order}`}><span className="step-number">{String(step.order).padStart(2, "0")}</span><img src={product?.image} alt={step.productName} /><div><div className="step-meta"><span>{product?.line}</span><small>{product?.category === "serum" ? "功效精华" : "基础护理"}</small></div><h4>{step.productName}</h4><p>{step.reason}</p><details><summary>使用方法 <ChevronRight size={14} /></summary><small>{step.action}</small></details></div>{index < steps.length - 1 && <span className="step-line" />}</article>; })}</div></section>;
}

function ResultView({ result, onRestart, saved, onSave, feedback, onFeedback, onConvert }: { result: RecommendationResult; onRestart: () => void; saved: boolean; onSave: () => void; feedback: "up" | "down" | null; onFeedback: (value: "up" | "down") => void; onConvert: () => void }) {
  return <main className="result-shell">
    <section className="result-hero">
      <div className="result-kicker"><span className="mode-badge"><span /> {result.mode === "ai" ? "AI 增强方案" : "本地规则方案"}</span><span>{Math.round(result.confidence * 100)}% 匹配度</span></div>
      <div className="result-heading"><div><span>YOUR SKIN SIGNAL</span><h1>{result.profileTitle}</h1><p>{result.profileSummary}</p></div><ScoreBars result={result} /></div>
      <div className="result-actions"><button className={saved ? "secondary-button saved" : "secondary-button"} onClick={onSave}><Bookmark size={17} fill={saved ? "currentColor" : "none"} />{saved ? "方案已保存" : "保存方案"}</button><button className="icon-button" title="重新测试" aria-label="重新测试" onClick={onRestart}><RefreshCw size={18} /></button></div>
    </section>
    <div className="routine-grid"><RoutineColumn title="晨间｜防护与透亮" icon={<Sun size={22} />} steps={result.morning} /><RoutineColumn title="夜间｜修护与更新" icon={<Moon size={22} />} steps={result.evening} /></div>
    <section className="caution-band"><ShieldCheck size={22} /><div><h3>耐受提醒</h3>{result.cautions.map((item) => <p key={item}>{item}</p>)}</div></section>
    <section className="content-section"><div className="section-heading"><div><span>LEARN WITH YOUR ROUTINE</span><h2>为这套方案补两节功课</h2></div></div><div className="article-grid">{result.articles.map((article, index) => <article key={article.title}><div className={`article-visual visual-${index + 1}`}><span>{String(index + 1).padStart(2, "0")}</span><FlaskConical size={32} /></div><div><span>{article.tag} · {article.readTime}</span><h3>{article.title}</h3><button>阅读全文 <ArrowRight size={15} /></button></div></article>)}</div></section>
    <section className="conversion-band"><div><span>7-DAY TRIAL</span><h2>{result.conversion.title}</h2><p>{result.conversion.subtitle}</p></div><button className="light-button" onClick={onConvert}>{result.conversion.cta} <ArrowRight size={18} /></button></section>
    <section className="feedback-row"><div><CircleHelp size={18} /><span>这套方案对你有帮助吗？</span></div><div><button className={feedback === "up" ? "active" : ""} onClick={() => onFeedback("up")} aria-label="有帮助" title="有帮助"><ThumbsUp size={17} /></button><button className={feedback === "down" ? "active" : ""} onClick={() => onFeedback("down")} aria-label="没帮助" title="没帮助"><ThumbsDown size={17} /></button></div></section>
    <p className="medical-note">本结果为日常护肤建议，不构成医疗诊断或治疗意见。</p>
  </main>;
}

function Insights({ analytics }: { analytics: ReturnType<typeof loadAnalytics> }) {
  const funnel = [
    ["开始问卷", analytics.quizStarted], ["完成采集", analytics.quizCompleted], ["查看方案", analytics.resultViewed], ["保存方案", analytics.planSaved], ["转化点击", analytics.conversionClicked],
  ] as const;
  const max = analytics.quizStarted;
  const completion = Math.round((analytics.quizCompleted / analytics.quizStarted) * 100);
  const saveRate = Math.round((analytics.planSaved / analytics.resultViewed) * 100);
  const positiveRate = Math.round((analytics.positive / (analytics.positive + analytics.negative)) * 100);
  return <main className="insights-shell">
    <section className="insights-header"><div><div className="eyebrow"><BarChart3 size={16} /> 运营洞察台</div><h1>把每次推荐，变成下一次增长的依据。</h1><p>数据为产品演示样本；你刚才在前台产生的行为会实时计入。</p></div><div className="live-chip"><span /> LIVE DEMO</div></section>
    <section className="metric-strip"><div><span>问卷完成率</span><strong>{completion}%</strong><small>较上周 +3.2%</small></div><div><span>方案保存率</span><strong>{saveRate}%</strong><small>目标线 50%</small></div><div><span>推荐好评率</span><strong>{positiveRate}%</strong><small>{analytics.positive + analytics.negative} 份反馈</small></div><div><span>体验装意向</span><strong>{Math.round((analytics.conversionClicked / analytics.resultViewed) * 100)}%</strong><small>高意向人群</small></div></section>
    <div className="insights-grid">
      <section className="data-panel funnel-panel"><div className="panel-heading"><div><span>CONVERSION</span><h2>推荐链路漏斗</h2></div><small>最近 7 天</small></div><div className="funnel">{funnel.map(([label, value], index) => <div key={label}><span>{label}</span><div><i style={{ width: `${(value / max) * 100}%` }} /></div><strong>{value.toLocaleString()}</strong><small>{index === 0 ? "100%" : `${Math.round((value / max) * 100)}%`}</small></div>)}</div></section>
      <section className="data-panel segments-panel"><div className="panel-heading"><div><span>AUDIENCE</span><h2>核心需求人群</h2></div></div><div className="segment-donut"><div className="donut"><span><strong>41%</strong>暗沉倦态</span></div><div className="segment-legend"><p><i className="c1" />暗沉 + 熬夜 <strong>41%</strong></p><p><i className="c2" />细纹 + 干燥 <strong>27%</strong></p><p><i className="c3" />敏感 + 屏障 <strong>19%</strong></p><p><i className="c4" />其他组合 <strong>13%</strong></p></div></div></section>
      <section className="data-panel recommendation-panel"><div className="panel-heading"><div><span>RECOMMENDATION</span><h2>产品线触达</h2></div></div><div className="product-reach">{[["双抗", 46, "/assets/double-anti.jpg"], ["源力", 31, "/assets/source-repair.jpg"], ["红宝石", 23, "/assets/ruby.png"]].map(([name, value, image]) => <div key={name}><img src={String(image)} alt={`${name}产品线`} /><span>{name}</span><div><i style={{ width: `${value}%` }} /></div><strong>{value}%</strong></div>)}</div></section>
      <section className="data-panel opportunities-panel"><div className="panel-heading"><div><span>CONTENT GAP</span><h2>待补内容机会</h2></div><span className="priority">按机会值排序</span></div><div className="opportunity-list"><div><span className="rank">01</span><div><strong>敏感期能不能做功效护理？</strong><small>搜索高 · 现有内容覆盖低</small></div><span className="score high">92</span></div><div><span className="rank">02</span><div><strong>双抗与红宝石如何搭配</strong><small>结果页退出用户高频疑问</small></div><span className="score">86</span></div><div><span className="rank">03</span><div><strong>极简护肤的步骤取舍</strong><small>18-24 岁人群保存率高</small></div><span className="score">78</span></div></div></section>
    </div>
    <section className="insight-note"><Sparkles size={18} /><p><strong>本周建议：</strong>优先补齐“敏感期功效护理”内容，并在高敏感用户结果页前置入口。该人群占比 19%，但负反馈率是平均值的 1.6 倍。</p><button>创建内容任务 <ArrowRight size={16} /></button></section>
  </main>;
}

export default function App() {
  const [view, setView] = useState<View>("lab");
  const [phase, setPhase] = useState<Phase>("intro");
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<UserProfile>(initialProfile);
  const [result, setResult] = useState<RecommendationResult | null>(null);
  const [analytics, setAnalytics] = useState(loadAnalytics);
  const [saved, setSaved] = useState(false);
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);

  const emit = (event: AnalyticsEvent) => setAnalytics((current) => track(current, event));
  const groundedKnowledge = useMemo(() => retrieveProducts(profile).map(({ id, name, line, concerns, claims, when, minSensitivity, source }) => ({ id, name, line, concerns, claims, when, minSensitivity, source })), [profile]);

  const start = () => { emit("quiz_started"); setPhase("quiz"); };
  const complete = async () => {
    emit("quiz_completed");
    setPhase("analyzing");
    const local = buildLocalRecommendation(profile);
    let final = local;
    const minimumDelay = new Promise((resolve) => setTimeout(resolve, 1900));
    try {
      const response = await fetch("/api/recommend", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profile, knowledge: groundedKnowledge, baseline: { ...local, mode: "ai" } }) });
      if (response.ok) final = recommendationResultSchema.parse(await response.json());
    } catch { /* Local result is the intentional fallback. */ }
    await minimumDelay;
    setResult(final);
    emit("result_viewed");
    setPhase("result");
  };
  const restart = () => { setPhase("intro"); setStep(0); setResult(null); setSaved(false); setFeedback(null); };
  const save = () => { if (!saved) emit("plan_saved"); setSaved(!saved); };
  const sendFeedback = (value: "up" | "down") => { if (!feedback) emit(value === "up" ? "feedback_positive" : "feedback_negative"); setFeedback(value); };

  return <div className="app"><Header view={view} setView={setView} />{view === "insights" ? <Insights analytics={analytics} /> : phase === "intro" ? <Intro profile={profile} setProfile={setProfile} onStart={start} /> : phase === "quiz" ? <Quiz profile={profile} setProfile={setProfile} step={step} setStep={setStep} onComplete={complete} /> : phase === "analyzing" ? <Analyzing /> : result && <ResultView result={result} onRestart={restart} saved={saved} onSave={save} feedback={feedback} onFeedback={sendFeedback} onConvert={() => emit("conversion_clicked")} />}</div>;
}
