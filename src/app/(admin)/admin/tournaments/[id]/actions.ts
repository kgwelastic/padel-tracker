"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { generateAmericanoPairs } from "@/lib/tournament-generator";

const POINTS_WIN = 2;
const POINTS_DRAW = 1;
const POINTS_LOSS = 0;

// ── Ranking recalculation ────────────────────────────────

async function recalculateStandardRanking(tournamentId: string) {
  await prisma.rankingEntry.updateMany({
    where: { tournamentId },
    data: { points: 0, wins: 0, losses: 0, gamesWon: 0, gamesLost: 0 },
  });

  const matches = await prisma.match.findMany({
    where: { tournamentId, status: "completed" },
    include: { sets: true },
  });

  for (const match of matches) {
    const t1Games = match.sets.reduce((a, s) => a + s.team1Score, 0);
    const t2Games = match.sets.reduce((a, s) => a + s.team2Score, 0);
    const t1SetsWon = match.sets.filter((s) => s.team1Score > s.team2Score).length;
    const t2SetsWon = match.sets.filter((s) => s.team2Score > s.team1Score).length;

    const t1Points =
      t1SetsWon > t2SetsWon ? POINTS_WIN : t1SetsWon === t2SetsWon ? POINTS_DRAW : POINTS_LOSS;
    const t2Points =
      t2SetsWon > t1SetsWon ? POINTS_WIN : t1SetsWon === t2SetsWon ? POINTS_DRAW : POINTS_LOSS;

    await prisma.rankingEntry.update({
      where: { tournamentId_teamId: { tournamentId, teamId: match.team1Id } },
      data: {
        points: { increment: t1Points },
        wins: { increment: t1SetsWon > t2SetsWon ? 1 : 0 },
        losses: { increment: t1SetsWon < t2SetsWon ? 1 : 0 },
        gamesWon: { increment: t1Games },
        gamesLost: { increment: t2Games },
      },
    });

    await prisma.rankingEntry.update({
      where: { tournamentId_teamId: { tournamentId, teamId: match.team2Id } },
      data: {
        points: { increment: t2Points },
        wins: { increment: t2SetsWon > t1SetsWon ? 1 : 0 },
        losses: { increment: t2SetsWon < t1SetsWon ? 1 : 0 },
        gamesWon: { increment: t2Games },
        gamesLost: { increment: t1Games },
      },
    });
  }
}

async function recalculateAmericanoRanking(tournamentId: string) {
  // Individual player teams (player2Id = null) are the ranking units
  const individualTeams = await prisma.team.findMany({
    where: { tournamentId, player2Id: null },
  });

  await prisma.rankingEntry.updateMany({
    where: { tournamentId },
    data: { points: 0, wins: 0, losses: 0, gamesWon: 0, gamesLost: 0 },
  });

  const playerToTeamId = new Map(individualTeams.map((t) => [t.player1Id, t.id]));

  const matches = await prisma.match.findMany({
    where: { tournamentId, status: "completed" },
    include: { sets: true, team1: true, team2: true },
  });

  for (const match of matches) {
    // Bye match: sitting-out player gets bonus points, no win/loss recorded
    if (match.group === "bye") {
      const bonusPoints = match.sets.reduce((a, s) => a + s.team1Score, 0);
      const teamId = playerToTeamId.get(match.team1.player1Id);
      if (teamId) {
        await prisma.rankingEntry.update({
          where: { tournamentId_teamId: { tournamentId, teamId } },
          data: { points: { increment: bonusPoints } },
        });
      }
      continue;
    }

    const t1Score = match.sets.reduce((a, s) => a + s.team1Score, 0);
    const t2Score = match.sets.reduce((a, s) => a + s.team2Score, 0);
    const t1Won = t1Score > t2Score;
    const t2Won = t2Score > t1Score;

    for (const [team, score, oppScore, won] of [
      [match.team1, t1Score, t2Score, t1Won],
      [match.team2, t2Score, t1Score, t2Won],
    ] as const) {
      for (const pid of [team.player1Id, team.player2Id].filter(Boolean) as string[]) {
        const teamId = playerToTeamId.get(pid);
        if (!teamId) continue;
        await prisma.rankingEntry.update({
          where: { tournamentId_teamId: { tournamentId, teamId } },
          data: {
            points: { increment: score },
            wins: { increment: won ? 1 : 0 },
            losses: { increment: !won ? 1 : 0 },
            gamesWon: { increment: score },
            gamesLost: { increment: oppScore },
          },
        });
      }
    }
  }
}

async function recalculateRanking(tournamentId: string) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { system: true },
  });
  if (!tournament) return;

  if (tournament.system === "americano") {
    await recalculateAmericanoRanking(tournamentId);
  } else {
    await recalculateStandardRanking(tournamentId);
  }
}

// ── Match result entry ────────────────────────────────────

export async function enterMatchResult(
  matchId: string,
  tournamentId: string,
  formData: FormData
) {
  const sets: { setNumber: number; team1Score: number; team2Score: number }[] = [];
  for (let i = 1; i <= 3; i++) {
    const s1 = formData.get(`set${i}_t1`);
    const s2 = formData.get(`set${i}_t2`);
    if (s1 !== "" && s2 !== "" && s1 !== null && s2 !== null) {
      sets.push({ setNumber: i, team1Score: Number(s1), team2Score: Number(s2) });
    }
  }

  if (sets.length === 0) return;

  await prisma.set.deleteMany({ where: { matchId } });
  await prisma.match.update({
    where: { id: matchId },
    data: { status: "completed", sets: { create: sets } },
  });

  await recalculateRanking(tournamentId);
  revalidatePath(`/admin/tournaments/${tournamentId}`);
  revalidatePath("/ranking");
}

export async function clearMatchResult(matchId: string, tournamentId: string) {
  await prisma.set.deleteMany({ where: { matchId } });
  await prisma.match.update({ where: { id: matchId }, data: { status: "pending" } });

  await recalculateRanking(tournamentId);
  revalidatePath(`/admin/tournaments/${tournamentId}`);
  revalidatePath("/ranking");
}

// ── Americano round generation ────────────────────────────

export async function generateNextAmericanoRound(tournamentId: string) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { courts: true, pointsToWin: true },
  });
  if (!tournament) return;

  const courts = tournament.courts;

  // Get individual player teams (registered participants)
  const individualTeams = await prisma.team.findMany({
    where: { tournamentId, player2Id: null },
    include: { rankingEntries: { where: { tournamentId } } },
  });

  // Get pair history to avoid repeating partnerships
  const pairTeams = await prisma.team.findMany({
    where: { tournamentId, player2Id: { not: null } },
  });
  const usedPairKeys = new Set(
    pairTeams.map((t) => [t.player1Id, t.player2Id!].sort().join("|"))
  );

  // Count how many rounds each player has participated in
  const playedCount = new Map<string, number>();
  for (const t of pairTeams) {
    playedCount.set(t.player1Id, (playedCount.get(t.player1Id) || 0) + 1);
    if (t.player2Id) {
      playedCount.set(t.player2Id, (playedCount.get(t.player2Id) || 0) + 1);
    }
  }

  // Sort all players: fewer participations first (priority to play), random tiebreak
  const allPlayerIds = individualTeams.map((t) => t.player1Id);
  const prioritized = [...allPlayerIds]
    .sort(() => Math.random() - 0.5) // random tiebreak
    .sort((a, b) => (playedCount.get(a) || 0) - (playedCount.get(b) || 0));

  // Active players = courts * 4 (must be divisible by 4)
  const activeCount = Math.floor(Math.min(courts * 4, prioritized.length) / 4) * 4;
  const activePlayers = prioritized.slice(0, activeCount);

  if (activePlayers.length < 4) return;

  const pairs = generateAmericanoPairs(activePlayers, usedPairKeys);

  const maxRound = await prisma.match.aggregate({
    where: { tournamentId },
    _max: { round: true },
  });
  const nextRound = (maxRound._max.round ?? 0) + 1;

  for (let i = 0; i < pairs.length; i += 2) {
    const [p1a, p1b] = pairs[i];
    const [p2a, p2b] = pairs[i + 1];

    const team1 = await prisma.team.create({
      data: { tournamentId, player1Id: p1a, player2Id: p1b },
    });
    const team2 = await prisma.team.create({
      data: { tournamentId, player1Id: p2a, player2Id: p2b },
    });

    await prisma.match.create({
      data: { tournamentId, team1Id: team1.id, team2Id: team2.id, round: nextRound, status: "pending" },
    });
  }

  // Create bye matches for sitting-out players and award bonus points
  const sittingOutIds = prioritized.slice(activeCount);
  const byePoints = Math.ceil(tournament.pointsToWin / 2);
  for (const playerId of sittingOutIds) {
    const indivTeam = individualTeams.find((t) => t.player1Id === playerId);
    if (!indivTeam) continue;
    const byeMatch = await prisma.match.create({
      data: {
        tournamentId,
        team1Id: indivTeam.id,
        team2Id: indivTeam.id,
        round: nextRound,
        group: "bye",
        status: "completed",
      },
    });
    await prisma.set.create({
      data: { matchId: byeMatch.id, setNumber: 1, team1Score: byePoints, team2Score: 0 },
    });
  }

  await recalculateAmericanoRanking(tournamentId);
  revalidatePath(`/admin/tournaments/${tournamentId}`);
  revalidatePath("/ranking");
}

export async function generateAmericanoFinalRound(tournamentId: string) {
  // Get individual player rankings sorted desc
  const individualTeams = await prisma.team.findMany({
    where: { tournamentId, player2Id: null },
    include: { rankingEntries: { where: { tournamentId } }, player1: true },
  });

  const sortedPlayers = individualTeams
    .map((t) => ({
      playerId: t.player1Id,
      name: t.player1.name,
      points: t.rankingEntries[0]?.points ?? 0,
      gamesWon: t.rankingEntries[0]?.gamesWon ?? 0,
    }))
    .sort((a, b) => b.points - a.points || b.gamesWon - a.gamesWon)
    .map((t) => t.playerId);

  const maxRound = await prisma.match.aggregate({
    where: { tournamentId },
    _max: { round: true },
  });
  const finalRound = (maxRound._max.round ?? 0) + 1;

  // Pair: (rank1 + rank4) vs (rank2 + rank3), then (rank5 + rank8) vs (rank6 + rank7), …
  for (let i = 0; i + 3 < sortedPlayers.length; i += 4) {
    const r1 = sortedPlayers[i];
    const r2 = sortedPlayers[i + 1];
    const r3 = sortedPlayers[i + 2];
    const r4 = sortedPlayers[i + 3];

    const team1 = await prisma.team.create({
      data: { tournamentId, player1Id: r1, player2Id: r4 },
    });
    const team2 = await prisma.team.create({
      data: { tournamentId, player1Id: r2, player2Id: r3 },
    });

    await prisma.match.create({
      data: {
        tournamentId,
        team1Id: team1.id,
        team2Id: team2.id,
        round: finalRound,
        group: "Final",
        status: "pending",
      },
    });
  }

  revalidatePath(`/admin/tournaments/${tournamentId}`);
}

// ── CSV Import ────────────────────────────────────────────

export async function importCsvData(
  tournamentId: string,
  formData: FormData
): Promise<{ success?: boolean; error?: string; playerCount?: number; matchCount?: number }> {
  const csvText = formData.get("csv") as string;
  if (!csvText?.trim()) return { error: "Brak danych CSV" };

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { pointsToWin: true },
  });
  if (!tournament) return { error: "Turniej nie istnieje" };

  function parsePair(str: string): string[] {
    return str.split("/").map((s) => s.trim()).filter(Boolean);
  }

  const lines = csvText
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !/^runda/i.test(l));

  const parsedRows: {
    round: number;
    pair1: string[];
    score1: number;
    pair2: string[];
    score2: number;
    pauza: string | null;
  }[] = [];

  const playerNames = new Set<string>();

  for (const line of lines) {
    const cols = line.split(";");
    if (cols.length < 5) continue;
    const round = parseInt(cols[0]);
    if (isNaN(round)) continue;
    const pair1 = parsePair(cols[1]);
    const score1 = parseInt(cols[2]);
    const pair2 = parsePair(cols[3]);
    const score2 = parseInt(cols[4]);
    const pauza = cols[5]?.trim() || null;
    if (pair1.length < 2 || pair2.length < 2) continue;
    if (isNaN(score1) || isNaN(score2)) continue;
    pair1.forEach((n) => playerNames.add(n));
    pair2.forEach((n) => playerNames.add(n));
    if (pauza) playerNames.add(pauza);
    parsedRows.push({ round, pair1, score1, pair2, score2, pauza });
  }

  if (parsedRows.length === 0) return { error: "Nie znaleziono poprawnych wierszy danych" };

  // Find or create players
  const playerIdMap = new Map<string, string>();
  for (const name of playerNames) {
    let player = await prisma.player.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
    });
    if (!player) player = await prisma.player.create({ data: { name } });
    playerIdMap.set(name, player.id);
  }

  // Find or create individual teams + ranking entries
  const individualTeamMap = new Map<string, string>(); // playerId -> teamId
  for (const [, playerId] of playerIdMap) {
    let team = await prisma.team.findFirst({
      where: { tournamentId, player1Id: playerId, player2Id: null },
    });
    if (!team) team = await prisma.team.create({ data: { tournamentId, player1Id: playerId } });
    individualTeamMap.set(playerId, team.id);
    await prisma.rankingEntry.upsert({
      where: { tournamentId_teamId: { tournamentId, teamId: team.id } },
      create: { tournamentId, teamId: team.id },
      update: {},
    });
  }

  const byeCreated = new Set<string>();

  for (const row of parsedRows) {
    const p1id1 = playerIdMap.get(row.pair1[0])!;
    const p1id2 = playerIdMap.get(row.pair1[1])!;
    const p2id1 = playerIdMap.get(row.pair2[0])!;
    const p2id2 = playerIdMap.get(row.pair2[1])!;

    const team1 = await prisma.team.create({
      data: { tournamentId, player1Id: p1id1, player2Id: p1id2 },
    });
    const team2 = await prisma.team.create({
      data: { tournamentId, player1Id: p2id1, player2Id: p2id2 },
    });
    const match = await prisma.match.create({
      data: { tournamentId, team1Id: team1.id, team2Id: team2.id, round: row.round, status: "completed" },
    });
    await prisma.set.create({
      data: { matchId: match.id, setNumber: 1, team1Score: row.score1, team2Score: row.score2 },
    });

    if (row.pauza) {
      const pPlayerId = playerIdMap.get(row.pauza);
      const key = `${row.round}_${pPlayerId}`;
      if (pPlayerId && !byeCreated.has(key)) {
        byeCreated.add(key);
        const indivTeamId = individualTeamMap.get(pPlayerId)!;
        const byeMatch = await prisma.match.create({
          data: {
            tournamentId,
            team1Id: indivTeamId,
            team2Id: indivTeamId,
            round: row.round,
            group: "bye",
            status: "completed",
          },
        });
        await prisma.set.create({
          data: {
            matchId: byeMatch.id,
            setNumber: 1,
            team1Score: Math.ceil(tournament.pointsToWin / 2),
            team2Score: 0,
          },
        });
      }
    }
  }

  await recalculateAmericanoRanking(tournamentId);
  revalidatePath(`/admin/tournaments/${tournamentId}`);
  revalidatePath("/ranking");
  return { success: true, playerCount: playerNames.size, matchCount: parsedRows.length };
}
