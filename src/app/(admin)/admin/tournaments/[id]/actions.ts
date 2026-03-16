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
    const t1Score = match.sets.reduce((a, s) => a + s.team1Score, 0);
    const t2Score = match.sets.reduce((a, s) => a + s.team2Score, 0);
    const t1Won = t1Score > t2Score;
    const t2Won = t2Score > t1Score;
    const draw = t1Score === t2Score;

    const t1Points = t1Won ? POINTS_WIN : draw ? POINTS_DRAW : POINTS_LOSS;
    const t2Points = t2Won ? POINTS_WIN : draw ? POINTS_DRAW : POINTS_LOSS;

    for (const [team, score, oppScore, won, pts] of [
      [match.team1, t1Score, t2Score, t1Won, t1Points],
      [match.team2, t2Score, t1Score, t2Won, t2Points],
    ] as const) {
      for (const pid of [team.player1Id, team.player2Id].filter(Boolean) as string[]) {
        const teamId = playerToTeamId.get(pid);
        if (!teamId) continue;
        await prisma.rankingEntry.update({
          where: { tournamentId_teamId: { tournamentId, teamId } },
          data: {
            points: { increment: pts },
            wins: { increment: won ? 1 : 0 },
            losses: { increment: !won && !draw ? 1 : 0 },
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
    select: { courts: true },
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

  revalidatePath(`/admin/tournaments/${tournamentId}`);
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
