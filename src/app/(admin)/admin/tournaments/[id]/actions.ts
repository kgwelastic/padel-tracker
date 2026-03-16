"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// Points awarded per match result
const POINTS_WIN = 2;
const POINTS_LOSS = 0;

export async function addMatch(tournamentId: string, formData: FormData) {
  const player1Id = formData.get("player1Id") as string;
  const player2Id = formData.get("player2Id") as string;
  const round = (formData.get("round") as string) || null;

  if (!player1Id || !player2Id || player1Id === player2Id) return;

  // Parse sets — up to 3 sets
  const sets: { player1Score: number; player2Score: number }[] = [];
  for (let i = 1; i <= 3; i++) {
    const s1 = formData.get(`set${i}_p1`);
    const s2 = formData.get(`set${i}_p2`);
    if (s1 !== "" && s2 !== "" && s1 !== null && s2 !== null) {
      sets.push({
        player1Score: Number(s1),
        player2Score: Number(s2),
      });
    }
  }

  if (sets.length === 0) return;

  // Create match + sets
  const match = await prisma.match.create({
    data: {
      tournamentId,
      player1Id,
      player2Id,
      round: round?.trim() || null,
      sets: { create: sets.map((s, i) => ({ setNumber: i + 1, ...s })) },
    },
  });

  // Determine winner based on sets won
  const p1SetsWon = sets.filter((s) => s.player1Score > s.player2Score).length;
  const p2SetsWon = sets.filter((s) => s.player2Score > s.player1Score).length;
  const p1Wins = p1SetsWon > p2SetsWon ? 1 : 0;
  const p2Wins = p2SetsWon > p1SetsWon ? 1 : 0;

  const totalP1Sets = sets.reduce((a, s) => a + s.player1Score, 0);
  const totalP2Sets = sets.reduce((a, s) => a + s.player2Score, 0);

  // Upsert ranking entries for both players
  await Promise.all([
    prisma.rankingEntry.upsert({
      where: { tournamentId_playerId: { tournamentId, playerId: player1Id } },
      create: {
        tournamentId,
        playerId: player1Id,
        points: p1Wins ? POINTS_WIN : POINTS_LOSS,
        wins: p1Wins,
        losses: 1 - p1Wins,
        setsWon: totalP1Sets,
        setsLost: totalP2Sets,
      },
      update: {
        points: { increment: p1Wins ? POINTS_WIN : POINTS_LOSS },
        wins: { increment: p1Wins },
        losses: { increment: 1 - p1Wins },
        setsWon: { increment: totalP1Sets },
        setsLost: { increment: totalP2Sets },
      },
    }),
    prisma.rankingEntry.upsert({
      where: { tournamentId_playerId: { tournamentId, playerId: player2Id } },
      create: {
        tournamentId,
        playerId: player2Id,
        points: p2Wins ? POINTS_WIN : POINTS_LOSS,
        wins: p2Wins,
        losses: 1 - p2Wins,
        setsWon: totalP2Sets,
        setsLost: totalP1Sets,
      },
      update: {
        points: { increment: p2Wins ? POINTS_WIN : POINTS_LOSS },
        wins: { increment: p2Wins },
        losses: { increment: 1 - p2Wins },
        setsWon: { increment: totalP2Sets },
        setsLost: { increment: totalP1Sets },
      },
    }),
  ]);

  revalidatePath(`/admin/tournaments/${tournamentId}`);
  revalidatePath("/ranking");
}

export async function deleteMatch(matchId: string, tournamentId: string) {
  // Fetch match with sets before deleting to reverse ranking
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { sets: true },
  });
  if (!match) return;

  const sets = match.sets;
  const p1SetsWon = sets.filter((s) => s.player1Score > s.player2Score).length;
  const p2SetsWon = sets.filter((s) => s.player2Score > s.player1Score).length;
  const p1Won = p1SetsWon > p2SetsWon;
  const p2Won = p2SetsWon > p1SetsWon;
  const totalP1 = sets.reduce((a, s) => a + s.player1Score, 0);
  const totalP2 = sets.reduce((a, s) => a + s.player2Score, 0);

  await prisma.match.delete({ where: { id: matchId } });

  // Reverse ranking impact
  await Promise.all([
    prisma.rankingEntry.update({
      where: { tournamentId_playerId: { tournamentId, playerId: match.player1Id } },
      data: {
        points: { decrement: p1Won ? POINTS_WIN : POINTS_LOSS },
        wins: { decrement: p1Won ? 1 : 0 },
        losses: { decrement: p1Won ? 0 : 1 },
        setsWon: { decrement: totalP1 },
        setsLost: { decrement: totalP2 },
      },
    }).catch(() => {}),
    prisma.rankingEntry.update({
      where: { tournamentId_playerId: { tournamentId, playerId: match.player2Id } },
      data: {
        points: { decrement: p2Won ? POINTS_WIN : POINTS_LOSS },
        wins: { decrement: p2Won ? 1 : 0 },
        losses: { decrement: p2Won ? 0 : 1 },
        setsWon: { decrement: totalP2 },
        setsLost: { decrement: totalP1 },
      },
    }).catch(() => {}),
  ]);

  revalidatePath(`/admin/tournaments/${tournamentId}`);
  revalidatePath("/ranking");
}
