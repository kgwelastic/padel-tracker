"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

export async function addAdmin(formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;

  if (!name || !email || !password || password.length < 8) return;

  // Check if user with this email already exists
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // Update to admin if not already
    await prisma.user.update({
      where: { email },
      data: {
        name,
        role: "admin",
        passwordHash: await bcrypt.hash(password, 12),
      },
    });
  } else {
    await prisma.user.create({
      data: {
        name,
        email,
        role: "admin",
        passwordHash: await bcrypt.hash(password, 12),
      },
    });
  }

  revalidatePath("/admin/admins");
}

export async function removeAdmin(userId: string) {
  await prisma.user.delete({ where: { id: userId } });
  revalidatePath("/admin/admins");
}

export async function changeAdminPassword(formData: FormData) {
  const userId = formData.get("userId") as string;
  const password = formData.get("password") as string;

  if (!userId || !password || password.length < 8) return;

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await bcrypt.hash(password, 12) },
  });

  revalidatePath("/admin/admins");
}
