import { Referee } from "./referee";

describe("Referee", () => {
  it("picks winner by quality", () => {
    const r = new Referee();
    const result = r.evaluate({quality: 9}, {quality: 6});
    expect(result.winner).toBe("A");
  });
});