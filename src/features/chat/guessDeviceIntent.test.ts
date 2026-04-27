import { guessDeviceIntent } from "./guessDeviceIntent";

describe("guessDeviceIntent", () => {
  it("maps market keywords", () => {
    expect(guessDeviceIntent("wheat price in mandi today")).toBe("market_price");
  });
  it("maps weather", () => {
    expect(guessDeviceIntent("mausam kaisa rahega")).toBe("weather");
  });
  it("defaults to general", () => {
    expect(guessDeviceIntent("hello")).toBe("general");
  });
});
