describe("onToken accumulation", () => {
  it("concatenates partial tokens into full response", () => {
    const tokens: string[] = [];
    const onToken = (t: string) => tokens.push(t);

    ["नमस्ते", " किसान", " जी!"].forEach(onToken);

    expect(tokens.join("")).toBe("नमस्ते किसान जी!");
  });
});
