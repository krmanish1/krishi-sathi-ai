import { enqueueDb } from "@/shared/storage/dbLock.native";

describe("enqueueDb", () => {
  it("runs tasks strictly in order", async () => {
    const order: number[] = [];
    const slow = (n: number, ms: number) =>
      enqueueDb(async () => {
        await new Promise((r) => setTimeout(r, ms));
        order.push(n);
      });

    await Promise.all([slow(1, 30), slow(2, 10), slow(3, 20)]);
    expect(order).toEqual([1, 2, 3]);
  });
});
