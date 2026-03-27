import { CEOBrain } from "./ceo-brain";

describe("CEO Brain", () => {
  it("processes tasks", async () => {
    const ceo = new CEOBrain();
    const result = await ceo.processTask("test");
    expect(result.status).toBe("ok");
  });
});