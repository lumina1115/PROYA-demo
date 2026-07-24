import { z } from "zod";

export const concernSchema = z.enum(["dullness", "lines", "sensitivity", "dryness", "oiliness"]);
export const sensitivitySchema = z.enum(["low", "medium", "high"]);
export const budgetSchema = z.enum(["focused", "balanced", "complete"]);
export const routineSchema = z.enum(["minimal", "standard", "advanced"]);

export const userProfileSchema = z.object({
  name: z.string().trim().min(1).max(20),
  concerns: z.array(concernSchema).min(1).max(3),
  sensitivity: sensitivitySchema,
  environments: z.array(z.enum(["lateNight", "sun", "aircon", "stress"])).min(1),
  currentRoutine: z.array(z.enum(["cleanser", "serum", "cream", "sunscreen"])),
  budget: budgetSchema,
  routine: routineSchema,
});

export type UserProfile = z.infer<typeof userProfileSchema>;
export type Concern = z.infer<typeof concernSchema>;

export interface ProductKnowledge {
  id: string;
  name: string;
  line: "双抗" | "红宝石" | "源力" | "基础护理";
  category: "cleanser" | "serum" | "cream" | "sunscreen";
  concerns: Concern[];
  claims: string[];
  when: "am" | "pm" | "both";
  minSensitivity: "low" | "medium" | "high";
  image: string;
  source: { label: string; url: string };
}

export const routineStepSchema = z.object({
  order: z.number().int().positive(),
  slot: z.enum(["am", "pm"]),
  productId: z.string(),
  productName: z.string(),
  action: z.string(),
  reason: z.string(),
});

export const recommendationResultSchema = z.object({
  profileTitle: z.string(),
  profileSummary: z.string(),
  confidence: z.number().min(0).max(1),
  scores: z.object({
    antioxidant: z.number().min(0).max(100),
    firming: z.number().min(0).max(100),
    barrier: z.number().min(0).max(100),
  }),
  morning: z.array(routineStepSchema),
  evening: z.array(routineStepSchema),
  cautions: z.array(z.string()).min(1),
  articles: z.array(z.object({ tag: z.string(), title: z.string(), readTime: z.string() })).min(2),
  conversion: z.object({ title: z.string(), subtitle: z.string(), cta: z.string() }),
  mode: z.enum(["local", "ai"]),
});

export type RecommendationResult = z.infer<typeof recommendationResultSchema>;

export type AnalyticsEvent =
  | "quiz_started"
  | "quiz_completed"
  | "result_viewed"
  | "plan_saved"
  | "conversion_clicked"
  | "feedback_positive"
  | "feedback_negative";

export interface AnalyticsState {
  quizStarted: number;
  quizCompleted: number;
  resultViewed: number;
  planSaved: number;
  conversionClicked: number;
  positive: number;
  negative: number;
}
