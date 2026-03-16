import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { deleteTournament } from "./actions";

const SYSTEM_LABELS: Record<string, string> = {
  round_robin: "Round Robin",
  americano: "Americano",
  groups_playoff: "Grupy + Playoff",
  elimination: "Eliminacje",
};

const FORMAT_LABELS: Record<string, string> = {
  singles: "Singiel",
  doubles: "Debel",
};

export default async function TournamentsPage() {
  const tournaments = await prisma.tournament.findMany({
    orderBy: { date: "desc" },
    include: { _count: { select: { matches: true, teams: true } } },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Turnieje</h1>
        <Link
          href="/admin/tournaments/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          + Nowy turniej
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {tournaments.length === 0 ? (
          <p className="px-5 py-12 text-gray-400 text-sm text-center">
            Brak turniejów.{" "}
            <Link href="/admin/tournaments/new" className="text-blue-600 hover:underline">
              Utwórz pierwszy turniej.
            </Link>
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {tournaments.map((t) => (
              <li
                key={t.id}
                className="px-5 py-4 flex items-center justify-between hover:bg-gray-50"
              >
                <div>
                  <p className="font-medium text-gray-800">{t.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(t.date).toLocaleDateString("pl-PL")}
                    {t.location && ` · ${t.location}`}
                    {" · "}
                    {FORMAT_LABELS[t.format] ?? t.format}
                    {" · "}
                    {SYSTEM_LABELS[t.system] ?? t.system}
                    {" · "}
                    {t._count.teams} drużyn{" · "}
                    {t._count.matches} mecz
                    {t._count.matches === 1
                      ? ""
                      : t._count.matches < 5
                        ? "e"
                        : "y"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Link
                    href={`/admin/tournaments/${t.id}`}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Wyniki →
                  </Link>
                  <form
                    action={async () => {
                      "use server";
                      await deleteTournament(t.id);
                    }}
                  >
                    <button
                      type="submit"
                      className="text-xs text-red-500 hover:text-red-700 hover:underline"
                    >
                      Usuń
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
