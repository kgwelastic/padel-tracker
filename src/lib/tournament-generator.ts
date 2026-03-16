// Match generation logic for each tournament system

export type GeneratedMatch = {
  team1Index: number;
  team2Index: number;
  round?: number;
  group?: string;
};

// ── Round Robin ───────────────────────────────────────────
// Every team plays every other team once
export function generateRoundRobin(teamCount: number): GeneratedMatch[] {
  const matches: GeneratedMatch[] = [];
  for (let i = 0; i < teamCount; i++) {
    for (let j = i + 1; j < teamCount; j++) {
      matches.push({ team1Index: i, team2Index: j });
    }
  }
  return matches;
}

// ── Americano ────────────────────────────────────────────
// Players rotate partners every round.
// Classic padel Americano: pairs change based on current standings.
// Round 1: static pairs (top+bottom). Subsequent rounds: recalculate.
// Here we generate round 1 pairs only; further rounds are generated
// after each round's scores are entered (dynamic Americano).
export function generateAmericanoRound1(teamCount: number): GeneratedMatch[] {
  // Americano works best with 4, 8, 12... players (pairs of pairs)
  // Initial round: 0 vs 1, 2 vs 3, 4 vs 5, ...
  const matches: GeneratedMatch[] = [];
  for (let i = 0; i < teamCount - 1; i += 2) {
    matches.push({ team1Index: i, team2Index: i + 1, round: 1 });
  }
  return matches;
}

// Generate next Americano round based on current standings (sorted by points desc)
// Returns pairs: top two play, bottom two play, etc.
export function generateAmericanoNextRound(
  sortedTeamIndices: number[], // sorted by points desc
  roundNumber: number
): GeneratedMatch[] {
  const matches: GeneratedMatch[] = [];
  for (let i = 0; i < sortedTeamIndices.length - 1; i += 2) {
    matches.push({
      team1Index: sortedTeamIndices[i],
      team2Index: sortedTeamIndices[i + 1],
      round: roundNumber,
    });
  }
  return matches;
}

// ── Groups + Playoff ─────────────────────────────────────
// Split teams into groups, round robin within each group
export function generateGroupsRoundRobin(
  teamCount: number,
  groupCount: number
): GeneratedMatch[] {
  const groups = splitIntoGroups(teamCount, groupCount);
  const matches: GeneratedMatch[] = [];
  const groupLabels = "ABCDEFGH";

  groups.forEach((group, gi) => {
    const label = groupLabels[gi] ?? `G${gi + 1}`;
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        matches.push({
          team1Index: group[i],
          team2Index: group[j],
          group: label,
        });
      }
    }
  });

  return matches;
}

// Generate playoff bracket (called after group stage)
// advanceCount = number of teams advancing from each group
export function generatePlayoffBracket(
  groupWinnerIndices: number[] // sorted by seed, e.g. [winner_A, winner_B, runner_A, runner_B]
): GeneratedMatch[] {
  const matches: GeneratedMatch[] = [];
  const teams = [...groupWinnerIndices];
  let round = 1;
  // Cross-match: A1 vs B2, B1 vs A2 (standard seeding)
  while (teams.length >= 2) {
    for (let i = 0; i < Math.floor(teams.length / 2); i++) {
      matches.push({
        team1Index: teams[i],
        team2Index: teams[teams.length - 1 - i],
        round,
        group: round === 1 ? "QF" : round === 2 ? "SF" : "F",
      });
    }
    // Halve the bracket (winners advance — determined after results entered)
    teams.splice(Math.floor(teams.length / 2));
    round++;
  }
  return matches;
}

// ── Single Elimination ───────────────────────────────────
// Bracket with byes if needed (next power of 2)
export function generateElimination(teamCount: number): GeneratedMatch[] {
  const matches: GeneratedMatch[] = [];
  const bracketSize = nextPowerOf2(teamCount);
  const byes = bracketSize - teamCount;
  // Seed positions: top seeds get byes
  const seeded = Array.from({ length: teamCount }, (_, i) => i);
  // Round 1: pair up seeds, byes for top teams
  let round1Participants: (number | null)[] = [];
  for (let i = 0; i < bracketSize; i++) {
    round1Participants.push(i < teamCount ? seeded[i] : null);
  }
  for (let i = 0; i < bracketSize; i += 2) {
    const t1 = round1Participants[i];
    const t2 = round1Participants[i + 1];
    if (t1 !== null && t2 !== null) {
      matches.push({ team1Index: t1, team2Index: t2, round: 1 });
    }
    // If t2 is null → t1 gets a bye (no match generated, auto-advances)
  }
  return matches;
}

// ── Americano pair generation ────────────────────────────
// Given active player IDs and a history of used partnerships,
// returns an array of [player1, player2] pairs (length = activePlayerIds.length / 2).
// Consecutive pairs form matches: pairs[0] vs pairs[1], pairs[2] vs pairs[3], …
// Tries to avoid repeating partnerships; falls back to minimum-repeat solution.
export function generateAmericanoPairs(
  activePlayerIds: string[], // length must be divisible by 4
  usedPairKeys: Set<string>  // each key = sorted IDs joined with "|"
): Array<[string, string]> {
  const n = activePlayerIds.length;
  let bestPairs: Array<[string, string]> = [];
  let bestRepeats = Infinity;

  for (let attempt = 0; attempt < 150; attempt++) {
    const shuffled = [...activePlayerIds].sort(() => Math.random() - 0.5);
    const pairs: Array<[string, string]> = [];
    let repeats = 0;

    for (let i = 0; i < n; i += 2) {
      const a = shuffled[i];
      const b = shuffled[i + 1];
      const key = [a, b].sort().join("|");
      if (usedPairKeys.has(key)) repeats++;
      pairs.push([a, b]);
    }

    if (repeats < bestRepeats) {
      bestRepeats = repeats;
      bestPairs = pairs;
    }
    if (repeats === 0) break;
  }

  return bestPairs;
}

// ── Helpers ───────────────────────────────────────────────
function splitIntoGroups(teamCount: number, groupCount: number): number[][] {
  const groups: number[][] = Array.from({ length: groupCount }, () => []);
  for (let i = 0; i < teamCount; i++) {
    groups[i % groupCount].push(i);
  }
  return groups;
}

function nextPowerOf2(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}
