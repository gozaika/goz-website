import { describe, expect, it } from "vitest";
import fixture from "../../test-fixtures/mobile/onboarding.json";
import { mobileEnvelopeSchema } from "./envelope";
import { onboardingTaskUpdateSchema, restaurantOnboardingDataSchema } from "./onboarding";

describe("onboarding wizard contract (Slice 12)", () => {
  it("the fixture is a valid envelope + payload", () => {
    expect(mobileEnvelopeSchema.safeParse(fixture).success).toBe(true);
    expect(restaurantOnboardingDataSchema.safeParse(fixture.data).success).toBe(true);
  });

  it("completedSteps equals the number of done steps", () => {
    const data = restaurantOnboardingDataSchema.parse(fixture.data);
    expect(data.completedSteps).toBe(data.steps.filter((s) => s.done).length);
    expect(data.totalSteps).toBe(data.steps.length);
  });

  it("task transitions accept known statuses and reject junk", () => {
    expect(onboardingTaskUpdateSchema.safeParse({ taskCode: "TRAIN_PICKUP_STAFF", statusCode: "COMPLETED" }).success).toBe(true);
    expect(onboardingTaskUpdateSchema.safeParse({ taskCode: "TRAIN_PICKUP_STAFF", statusCode: "WAIVED" }).success).toBe(false);
    expect(onboardingTaskUpdateSchema.safeParse({ taskCode: "", statusCode: "PENDING" }).success).toBe(false);
  });
});
