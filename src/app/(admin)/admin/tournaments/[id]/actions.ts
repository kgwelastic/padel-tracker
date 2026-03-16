"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

const POINTS_WIN = 2;
const POINTS_DRAW = 1;
const POINTS_LOSS = 0;

async function recalculateRanking(tournamentId: string) {
  // Reset all entries to zero
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

  // Delete old sets and mark completed
  await prisma.set.deleteMany({ where: { matchId } });
  await prisma.match.update({
    where: { id: matchId },
    data: {
      status: "completed",
      sets: { create: sets },
    },
  });

  await recalculateRanking(tournamentId);
  revalidatePath(`/admin/tournaments/${tournamentId}`);
  revalidatePath("/ranking");
}

export async function clearMatchResult(matchId: string, tournamentId: string) {
  await prisma.set.deleteMany({ where: { matchId } });
  await prisma.match.update({
    where: { id: matchId },
    data: { status: "pending" },
  });

  await recalculateRanking(tournamentId);
  revalidatePath(`/admin/tournaments/${tournamentId}`);
  revalidatePath("/ranking");
}
