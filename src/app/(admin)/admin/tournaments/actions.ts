"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function addTournament(formData: FormData) {
  const name = formData.get("name") as string;
  const date = formData.get("date") as string;
  const location = (formData.get("location") as string) || undefined;
  const notes = (formData.get("notes") as string) || undefined;

  if (!name?.trim() || !date) return;

  await prisma.tournament.create({
    data: {
      name: name.trim(),
      date: new Date(date),
      location: location?.trim() || null,
      notes: notes?.trim() || null,
    },
  });

  revalidatePath("/admin/tournaments");
}

export async function deleteTournament(id: string) {
  await prisma.tournament.delete({ where: { id } });
  revalidatePath("/admin/tournaments");
}
