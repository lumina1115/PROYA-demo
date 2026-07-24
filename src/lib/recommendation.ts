import { productMap, products } from "../data/products";
import { recommendationResultSchema, type Concern, type RecommendationResult, type UserProfile } from "../types";

const sensitivityRank = { low: 0, medium: 1, high: 2 } as const;

function concernLabel(concern: Concern) {
  return { dullness: "暗沉倦态", lines: "细纹松弛", sensitivity: "敏感脆弱", dryness: "干燥缺水", oiliness: "油光失衡" }[concern];
}

function makeStep(productId: string, slot: "am" | "pm", order: number, reason: string) {
  const product = productMap.get(productId);
  if (!product) throw new Error(`Unknown product ${productId}`);
  const action = product.category === "cleanser" ? "轻柔清洁，避免长时间揉搓" : product.category === "sunscreen" ? "在出门前均匀涂抹，户外按需补涂" : product.category === "cream" ? "取适量按压至吸收" : "取 1-2 泵，避开眼周轻柔按压";
  return { order, slot, productId, productName: product.name, action, reason };
}

export function retrieveProducts(profile: UserProfile) {
  const allowed = products.filter((product) => sensitivityRank[profile.sensitivity] <= sensitivityRank[product.minSensitivity]);
  return allowed
    .map((product) => ({ product, score: product.concerns.filter((c) => profile.concerns.includes(c)).length * 3 + (product.line === "基础护理" ? 1 : 0) }))
    .sort((a, b) => b.score - a.score)
    .map(({ product }) => product);
}

export function buildLocalRecommendation(profile: UserProfile): RecommendationResult {
  const barrierFirst = profile.sensitivity === "high" || profile.concerns.includes("sensitivity");
  const wantsLines = profile.concerns.includes("lines");
  const wantsBright = profile.concerns.includes("dullness") || profile.environments.includes("lateNight");
  const minimal = profile.routine === "minimal" || profile.budget === "focused";
  const amHero = barrierFirst ? "source-repair-serum" : "double-anti-serum";
  const pmHero = barrierFirst ? "source-repair-serum" : wantsLines ? "ruby-serum" : wantsBright ? "double-anti-serum" : "source-repair-serum";

  const morning = [makeStep("basic-cleanser", "am", 1, "清洁是后续功效护理稳定发挥的起点。"), makeStep(amHero, "am", 2, barrierFirst ? "先稳定屏障状态，再逐步增加功效护理。" : "针对日间氧化压力与暗沉倦态。")];
  if (!minimal) morning.push(makeStep("basic-cream", "am", 3, "补足保湿，降低环境干燥带来的不适。"));
  morning.push(makeStep("basic-sunscreen", "am", morning.length + 1, "防晒是抗老和提亮方案中不可省略的一步。"));

  const evening = [makeStep("basic-cleanser", "pm", 1, "温和卸除日间污垢与防晒残留。"), makeStep(pmHero, "pm", 2, barrierFirst ? "夜间维持精简修护，避免叠加刺激。" : wantsLines ? "聚焦夜间淡纹紧致护理。" : "承接白天功效方向，保持方案简单一致。")];
  evening.push(makeStep("basic-cream", "pm", 3, "锁住水分，完成夜间护理闭环。"));

  const labels = profile.concerns.map(concernLabel);
  const result: RecommendationResult = {
    profileTitle: barrierFirst ? "稳态修护型" : wantsLines && wantsBright ? "透亮紧致型" : wantsLines ? "弹润紧致型" : "鲜活透亮型",
    profileSummary: `${profile.name} 当前更需要关注${labels.join("、")}。方案优先控制步骤数量，再用一条主功效线建立可坚持的早晚节奏。`,
    confidence: profile.concerns.length >= 2 ? 0.92 : 0.86,
    scores: {
      antioxidant: Math.min(96, 52 + (wantsBright ? 34 : 10) + (profile.environments.includes("sun") ? 8 : 0)),
      firming: Math.min(94, 48 + (wantsLines ? 38 : 8)),
      barrier: Math.min(96, 50 + (barrierFirst ? 40 : profile.concerns.includes("dryness") ? 28 : 10)),
    },
    morning,
    evening,
    cautions: barrierFirst
      ? ["当前以修护和防晒为先，不建议同时叠加多种高活性功效产品。", "首次使用先做局部测试；持续红肿、刺痛或脱屑时请停用并咨询专业人士。"]
      : ["新功效产品建议隔天起步，观察耐受后再增加频次。", "使用后持续红肿、刺痛或脱屑时请停用并咨询专业人士。"],
    articles: [
      { tag: "成分课堂", title: barrierFirst ? "屏障波动期，护肤步骤为什么要做减法" : "抗氧与防晒，如何组成日间护理搭档", readTime: "3 分钟" },
      { tag: "使用指南", title: wantsLines ? "新手建立晚间淡纹节奏的 3 个信号" : "熬夜后的暗沉感，怎样拆解护理优先级", readTime: "4 分钟" },
    ],
    conversion: { title: "先体验，再决定完整方案", subtitle: `已为你组合 ${barrierFirst ? "源力修护" : wantsLines ? "双抗 + 红宝石" : "双抗透亮"}体验装`, cta: "领取 7 日体验装" },
    mode: "local",
  };
  return recommendationResultSchema.parse(result);
}
