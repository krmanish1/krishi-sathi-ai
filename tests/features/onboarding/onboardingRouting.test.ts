import { shouldSkipOnboardingAfterSignIn } from "@/features/onboarding/store";

describe("shouldSkipOnboardingAfterSignIn", () => {
  it("sends returning users to the app when onboarding was completed once", () => {
    expect(shouldSkipOnboardingAfterSignIn({ hasCompletedOnboarding: true })).toBe(true);
  });

  it("sends new signups through onboarding until the done step sets the flag", () => {
    expect(shouldSkipOnboardingAfterSignIn({ hasCompletedOnboarding: false })).toBe(false);
  });
});
