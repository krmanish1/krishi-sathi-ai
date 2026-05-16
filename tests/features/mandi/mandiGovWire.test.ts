import {
  districtNameFromDirectoryRow,
  mandiRowFromEnamRecord,
  mandiRowsFromEnamRecords,
  stateNameFromDirectoryRow,
} from "@/features/mandi/mandiGovWire";

describe("stateNameFromDirectoryRow", () => {
  it("reads State_Name", () => {
    expect(stateNameFromDirectoryRow({ State_Name: "Bihar" })).toBe("Bihar");
  });

  it("falls back to any string field whose key suggests state", () => {
    expect(stateNameFromDirectoryRow({ stname: "Kerala" })).toBe("Kerala");
  });
});

describe("districtNameFromDirectoryRow", () => {
  it("reads District_Name", () => {
    expect(districtNameFromDirectoryRow({ District_Name: "Khagaria" })).toBe("Khagaria");
  });
});

describe("mandiRowFromEnamRecord", () => {
  it("maps modal and market fields", () => {
    const row = mandiRowFromEnamRecord(
      {
        commodity: "Wheat",
        modal_price: 2400,
        min_price: 2300,
        max_price: 2500,
        market: "Test APMC",
      },
      0,
    );
    expect(row).not.toBeNull();
    expect(row!.label).toBe("Wheat");
    expect(row!.place).toBe("Test APMC");
    expect(row!.price).toContain("2,400");
    expect(row!.changeLabel).toContain("2,300");
  });
});

describe("mandiRowsFromEnamRecords", () => {
  it("skips null rows", () => {
    expect(mandiRowsFromEnamRecords([null, { commodity: "Rice", modal_price: 3000, market: "M" }])).toHaveLength(
      1,
    );
  });
});
