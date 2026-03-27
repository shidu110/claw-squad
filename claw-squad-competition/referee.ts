export class Referee {
  evaluate(resultA: any, resultB: any) {
    const scoreA = this.qualityScore(resultA);
    const scoreB = this.qualityScore(resultB);
    return { winner: scoreA > scoreB ? "A" : "B", scores: {A: scoreA, B: scoreB} };
  }
  qualityScore(r: any) { return r ? 8 : 5; }
}