import { prisma } from "@/lib/prisma";
import { TournamentWizard } from "./TournamentWizard";

export default async function NewTournamentPage() {
  const players = await prisma.player.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Nowy turniej</h1>
      <TournamentWizard players={players} />
    </div>
  );
}
