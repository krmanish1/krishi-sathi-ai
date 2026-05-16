import { guessImagePurpose } from "@/features/chat/guessImagePurpose";

describe("guessImagePurpose", () => {
  it("detects soil keywords (English)", () => {
    expect(guessImagePurpose("soil looks bad today")).toBe("soil_photo");
  });
  it("detects soil keywords (Hindi)", () => {
    expect(guessImagePurpose("मिट्टी की जांच करें")).toBe("soil_photo");
  });
  it("detects pest keywords (English)", () => {
    expect(guessImagePurpose("there is a bug on my plant")).toBe("pest_id");
  });
  it("detects pest keywords (Hindi)", () => {
    expect(guessImagePurpose("फसल पर कीड़ा लग गया")).toBe("pest_id");
  });
  it("defaults to crop_disease", () => {
    expect(guessImagePurpose("my crop is yellow")).toBe("crop_disease");
  });
  it("defaults to crop_disease for empty text", () => {
    expect(guessImagePurpose("")).toBe("crop_disease");
  });
});
