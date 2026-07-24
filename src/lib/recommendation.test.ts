import { describe, expect, it } from "vitest";
import { buildLocalRecommendation, retrieveProducts } from "./recommendation";
import { recommendationResultSchema, type UserProfile } from "../types";

const base: UserProfile = {
  name: "测试用户",
  concerns: ["dullness", "lines"],
  sensitivity: "low",
  environments: ["lateNight", "sun"],
  currentRoutine: ["cleanser"],
  budget: "balanced",
  routine: "standard",
};

describe("local recommendation", () => {
  it("returns a schema-valid brightening and firming plan", () => {
    const result = buildLocalRecommendation(base);
    expect(recommendationResultSchema.safeParse(result).success).toBe(true);
    expect(result.morning.some((step) => step.productId === "double-anti-serum")).toBe(true);
    expect(result.evening.some((step) => step.productId === "ruby-serum")).toBe(true);
  });

  it("keeps high-sensitivity profiles on the repair line", () => {
    const result = buildLocalRecommendation({ ...base, concerns: ["sensitivity", "dryness"], sensitivity: "high" });
    expect(result.morning.some((step) => step.productId === "ruby-serum")).toBe(false);
    expect(result.evening.some((step) => step.productId === "source-repair-serum")).toBe(true);
    expect(retrieveProducts({ ...base, sensitivity: "high" }).some((product) => product.id === "ruby-serum")).toBe(false);
  });

  it("makes a shorter morning plan for focused budgets", () => {
    const result = buildLocalRecommendation({ ...base, budget: "focused", routine: "minimal" });
    expect(result.morning).toHaveLength(3);
  });

  it("rejects an invalid AI-shaped response", () => {
    const result = buildLocalRecommendation(base);
    const invalid = { ...result, confidence: 1.4, morning: [{ ...result.morning[0], order: 0 }] };
    expect(recommendationResultSchema.safeParse(invalid).success).toBe(false);
  });
});
