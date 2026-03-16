"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function addPlayer(formData: FormData) {
  const name = formData.get("name") as string;
  const email = (formData.get("email") as string) || undefined;
  const phone = (formData.get("phone") as string) || undefined;

  if (!name?.trim()) return;

  await prisma.player.create({
    data: { name: name.trim(), email: email?.trim() || null, phone: phone?.trim() || null },
  });

  revalidatePath("/admin/players");
}

export async function deletePlayer(id: string) {
  await prisma.player.delete({ where: { id } });
  revalidatePath("/admin/players");
}
