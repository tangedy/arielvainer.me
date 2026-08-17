import test from "node:test";
import assert from "node:assert/strict";
import {
  NAME_COLORS,
  boardRemark,
  calculateScore,
  formatLeaderboardTime,
  normalizeNameColor,
  placementLabel,
} from "../src/leaderboard.js";

test("leaderboard score adds email and retry penalties", () => {
  const score = calculateScore({
    times: { cook: 10, docs: 20, blackjack: 30, sprint: 40 },
    stats: {
      emailFailures: 2,
      cookingRetries: 1,
      sprintRetries: 2,
      casinoBailouts: 1,
    },
  });
  assert.equal(score.rawSeconds, 100);
  assert.equal(score.emailFailures, 2);
  assert.equal(score.retries, 4);
  assert.equal(score.penaltySeconds, 100);
  assert.equal(score.adjustedSeconds, 200);
  assert.equal(formatLeaderboardTime(score.adjustedSeconds), "03:20");
});

test("airport board uses placements instead of flight codes", () => {
  assert.equal(placementLabel(0), "1ST");
  assert.equal(placementLabel(1), "2ND");
  assert.equal(placementLabel(2), "3RD");
  assert.equal(placementLabel(3), "4TH");
  assert.equal(placementLabel(10), "11TH");
  assert.equal(placementLabel(11), "12TH");
  assert.equal(placementLabel(12), "13TH");
  assert.equal(placementLabel(20), "21ST");
  assert.equal(boardRemark(0, false), "ON TIME");
  assert.equal(boardRemark(3, false), "DELAYED");
  assert.equal(boardRemark(1, true), "DEPARTED");
});

test("name colors stay on the allowed palette", () => {
  assert.equal(normalizeNameColor("#41a6f6"), "#41a6f6");
  assert.equal(normalizeNameColor("#FF0000"), NAME_COLORS[0]);
  assert.equal(normalizeNameColor(""), NAME_COLORS[0]);
});
