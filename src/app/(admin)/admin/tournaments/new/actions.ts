"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  generateRoundRobin,
  generateAmericanoRound1,
  generateGroupsRoundRobin,
  generateElimination,
  generateAmericanoPairs,
} from "@/lib/tournament-generator";

export type CreateTournamentInput = {
  name: string;
  date: string;
  location?: string;
  notes?: string;
  format: "singles" | "doubles";
  system: "round_robin" | "americano" | "groups_playoff" | "elimination";
  groups?: number;
  courts?: number;      // Americano only
  pointsToWin?: number; // Americano only
  participants: ParticipantInput[];
};

export type ParticipantInput =
  | { type: "singles"; playerId: string }
  | { type: "doubles"; player1Id: string; player2Id: string; name?: string };

export async function createTournamentWithMatches(input: CreateTournamentInput) {
  const {
    name,
    date,
    location,
    notes,
    format,
    system,
    groups = 1,
    courts = 1,
    pointsToWin = 21,
    participants,
  } = input;

  const tournament = await prisma.tournament.create({
    data: {
      name,
      date: new Date(date),
      location: location || null,
      notes: notes || null,
      format,
      system,
      groups,
      courts,
      pointsToWin,
    },
  });

  // ── Americano: individual player registration + dynamic round 1 pairs ──
  if (system === "americano") {
    // Create individual player teams (tracking units for ranking)
    const individualTeams = await Promise.all(
      participants.map(async (p) => {
        const playerId = p.type === "singles" ? p.playerId : p.player1Id;
        return prisma.team.create({
          data: { tournamentId: tournament.id, player1Id: playerId },
        });
      })
    );

    // RankingEntries only for individual teams
    await prisma.rankingEntry.createMany({
      data: individualTeams.map((t) => ({
        tournamentId: tournament.id,
        teamId: t.id,
      })),
    });

    // Determine active players for round 1 (courts * 4 max)
    const allPlayerIds = shuffle(individualTeams.map((t) => t.player1Id));
    const activeCount = Math.floor(Math.min(courts * 4, allPlayerIds.length) / 4) * 4;
    const activePlayers = allPlayerIds.slice(0, activeCount);

    if (activePlayers.length >= 4) {
      const pairs = generateAmericanoPairs(activePlayers, new Set());
      await createAmericanoRoundMatches(tournament.id, pairs, 1);
    }

    revalidatePath("/admin/tournaments");
    return tournament.id;
  }

  // ── Standard formats ──────────────────────────────────────
  const teams = await Promise.all(
    participants.map(async (p) => {
      if (p.type === "singles") {
        return prisma.team.create({
          data: { tournamentId: tournament.id, player1Id: p.playerId },
        });
      } else {
        return prisma.team.create({
          data: {
            tournamentId: tournament.id,
            player1Id: p.player1Id,
            player2Id: p.player2Id,
            name: p.name || null,
          },
        });
      }
    })
  );

  let generatedMatches: ReturnType<typeof generateRoundRobin> = [];

  if (system === "round_robin") {
    generatedMatches = generateRoundRobin(teams.length);
  } else if (system === "groups_playoff") {
    generatedMatches = generateGroupsRoundRobin(teams.length, groups);
  } else if (system === "elimination") {
    generatedMatches = generateElimination(teams.length);
  }

  await prisma.match.createMany({
    data: generatedMatches.map((m) => ({
      tournamentId: tournament.id,
      team1Id: teams[m.team1Index].id,
      team2Id: teams[m.team2Index].id,
      round: m.round ?? null,
      group: m.group ?? null,
      status: "pending",
    })),
  });

  await prisma.rankingEntry.createMany({
    data: teams.map((t) => ({
      tournamentId: tournament.id,
      teamId: t.id,
    })),
  });

  revalidatePath("/admin/tournaments");
  return tournament.id;
}

// Helper: create pair teams + matches for one Americano round
export async function createAmericanoRoundMatches(
  tournamentId: string,
  pairs: Array<[string, string]>,
  roundNumber: number
) {
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
      data: {
        tournamentId,
        team1Id: team1.id,
        team2Id: team2.id,
        round: roundNumber,
        status: "pending",
      },
    });
  }
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}
