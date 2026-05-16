import {
  getBundledIndiaStateDistrictRows,
  uniqueSortedDistrictsForState,
  uniqueSortedStatesFromRows,
} from "@/features/mandi/indiaStateDistrictDataset";

describe("uniqueSortedStatesFromRows", () => {
  it("collects unique state names", () => {
    const rows = [{ StateName: "Bihar" }, { StateName: "Bihar" }, { StateName: "Kerala" }];
    expect(uniqueSortedStatesFromRows(rows)).toEqual(["Bihar", "Kerala"]);
  });
});

describe("getBundledIndiaStateDistrictRows", () => {
  it("returns the full bundled LGD-style list", () => {
    const rows = getBundledIndiaStateDistrictRows();
    expect(rows.length).toBe(777);
    expect(rows[0]?.SNo).toBe(1);
    expect(rows[rows.length - 1]?.SNo).toBe(777);
  });
});

describe("uniqueSortedDistrictsForState", () => {
  it("filters by state case-insensitively", () => {
    const rows = [
      { StateName: "Bihar", "DistrictName(InEnglish)": "Patna" },
      { StateName: "bihar", "DistrictName(InEnglish)": "Gaya" },
      { StateName: "Kerala", "DistrictName(InEnglish)": "Kochi" },
    ];
    expect(uniqueSortedDistrictsForState(rows, "Bihar")).toEqual(["Gaya", "Patna"]);
  });
});
