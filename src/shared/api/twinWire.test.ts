import { normalizeTwinFromApi, serializeTwinForApi } from "./twinWire";
import type { FarmerTwin } from "./types";

describe("twinWire", () => {
  it("normalizeTwinFromApi maps string[] crops to objects", () => {
    const t = normalizeTwinFromApi({
      farmer_id: "f1",
      location: { state: "S", district: "D" },
      current_crops: ["Wheat", "Mustard"],
      preferred_language: "hi",
    });
    expect(t.current_crops).toEqual([
      { name: "Wheat", area_acres: 0 },
      { name: "Mustard", area_acres: 0 },
    ]);
  });

  it("serializeTwinForApi emits string crops and irrigated|rainfed", () => {
    const twin: FarmerTwin = {
      farmer_id: "f1",
      location: { state: "Punjab", district: "Ludhiana" },
      preferred_language: "hi",
      current_crops: [{ name: "Wheat", area_acres: 2 }],
      land: { total_acres: 5, irrigation: "irrigated" },
    };
    const body = serializeTwinForApi(twin);
    expect(body.current_crops).toEqual(["Wheat"]);
    expect(body.land).toMatchObject({
      total_acres: 5,
      irrigation: "irrigated",
    });
  });

  it("serializeTwinForApi maps legacy yes/no irrigation", () => {
    const twin: FarmerTwin = {
      farmer_id: "f1",
      location: { state: "S", district: "D" },
      land: { irrigation: "yes" },
    };
    const body = serializeTwinForApi(twin);
    expect((body.land as { irrigation: string }).irrigation).toBe("irrigated");
  });
});
