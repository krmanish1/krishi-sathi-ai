import { getOrCreateFarmerId, __resetFarmerIdForTests } from "./anonymous";

const mem: Record<string, string> = {};
jest.mock("@/shared/storage/secure", () => ({
  secureGet: async (k: string) => mem[k] ?? null,
  secureSet: async (k: string, v: string) => {
    mem[k] = v;
  },
}));

beforeEach(() => {
  for (const k of Object.keys(mem)) {
    delete mem[k];
  }
  __resetFarmerIdForTests();
});

describe("getOrCreateFarmerId", () => {
  it("creates and persists an id on first call", async () => {
    const id1 = await getOrCreateFarmerId();
    expect(id1).toMatch(/^anon_[0-9a-f-]{36}$/);
    const id2 = await getOrCreateFarmerId();
    expect(id2).toBe(id1);
  });
});
