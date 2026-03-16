"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  generateRoundRobin,
  generateAmericanoRound1,
  generateGroupsRoundRobin,
  generateElimination,
} from "@/lib/tournament-generator";

export type CreateTournamentInput = {
  name: string;
  date: string;
  location?: string;
  notes?: string;
  format: "singles" | "doubles";
  system: "round_robin" | "americano" | "groups_playoff" | "elimination";
  groups?: number;
  participants: ParticipantInput[];
};

export type ParticipantInput =
  | { type: "singles"; playerId: string }
  | { type: "doubles"; player1Id: string; player2Id: string; name?: string };

export async function createTournamentWithMatches(input: CreateTournamentInput) {
  const { name, date, location, notes, format, system, groups = 1, participants } = input;

  const tournament = await prisma.tournament.create({
    data: {
      name,
      date: new Date(date),
      location: location || null,
      notes: notes || null,
      format,
      system,
      groups,
    },
  });

  // Create teams
  const teams = await Promise.all(
    participants.map(async (p) => {
      if (p.type === "singles") {
        return prisma.team.create({
          data: {
            tournamentId: tournament.id,
            player1Id: p.playerId,
          },
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

  // Generate matches based on system
  let generatedMatches: ReturnType<typeof generateRoundRobin> = [];

  if (system === "round_robin") {
    generatedMatches = generateRoundRobin(teams.length);
  } else if (system === "americano") {
    generatedMatches = generateAmericanoRound1(teams.length);
  } else if (system === "groups_playoff") {
    generatedMatches = generateGroupsRoundRobin(teams.length, groups);
  } else if (system === "elimination") {
    generatedMatches = generateElimination(teams.length);
  }

  // Save matches to DB
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

  // Initialize ranking entries for all teams
  await prisma.rankingEntry.createMany({
    data: teams.map((t) => ({
      tournamentId: tournament.id,
      teamId: t.id,
    })),
  });

  revalidatePath("/admin/tournaments");
  return tournament.id;
}
