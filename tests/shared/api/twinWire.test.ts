import { normalizeTwinFromApi, serializeTwinForApi } from "@/shared/api/twinWire";
import type { FarmerTwin } from "@/shared/api/types";

describe("twinWire", () => {
  it("normalizeTwinFromApi maps string[] crops to objects", () => {
    const t = normalizeTwinFromApi({
      farmer_id: "f1",
      location: { state: "S", district: "D" },
      current_crops: ["Wheat", "Mustard"],
      preferred_language: "hi",
    });
    expect(t.current_crops).toEqual(["Wheat", "Mustard"]);
  });

  it("serializeTwinForApi emits wire shape (crops, land without irrigation, full location)", () => {
    const twin: FarmerTwin = {
      farmer_id: "f1",
      location: { state: "Punjab", district: "Ludhiana", village: "V1", lat: 1, lng: 2 },
      preferred_language: "hi",
      current_crops: ["Wheat"],
      land: { total_acres: 5, soil_type: "clay" },
    };
    const body = serializeTwinForApi(twin);
    expect(body).toEqual({
      farmer_id: "f1",
      name: "",
      location: {
        state: "Punjab",
        district: "Ludhiana",
        village: "V1",
        lat: 1,
        lng: 2,
      },
      land: { total_acres: 5, soil_type: "clay" },
      current_crops: ["Wheat"],
      preferred_language: "hi",
    });
  });

  it("serializeTwinForApi defaults soil_type, lat/lng, and total_acres", () => {
    const twin: FarmerTwin = {
      farmer_id: "f1",
      location: { state: "S", district: "D" },
    };
    const body = serializeTwinForApi(twin);
    expect(body.land).toEqual({ total_acres: 0, soil_type: "loamy" });
    expect(body.location).toMatchObject({ lat: 0, lng: 0, village: "" });
  });
});
