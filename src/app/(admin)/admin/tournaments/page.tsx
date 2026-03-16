import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { addTournament, deleteTournament } from "./actions";

export default async function TournamentsPage() {
  const tournaments = await prisma.tournament.findMany({
    orderBy: { date: "desc" },
    include: { _count: { select: { matches: true } } },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Turnieje</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Add form */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Dodaj turniej</h2>
          <form action={addTournament} className="flex flex-col gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Nazwa *
              </label>
              <input
                name="name"
                required
                placeholder="np. Turniej Marzec 2026"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Data *
              </label>
              <input
                name="date"
                type="date"
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Lokalizacja
              </label>
              <input
                name="location"
                placeholder="np. Korty Mokotów"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Notatki
              </label>
              <textarea
                name="notes"
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Dodaj turniej
            </button>
          </form>
        </div>

        {/* Tournaments list */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <span className="font-semibold text-gray-800">
              Lista turniejów ({tournaments.length})
            </span>
          </div>
          {tournaments.length === 0 ? (
            <p className="px-5 py-8 text-gray-400 text-sm text-center">
              Brak turniejów. Dodaj pierwszy.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {tournaments.map((t) => (
                <li
                  key={t.id}
                  className="px-5 py-3 flex items-center justify-between hover:bg-gray-50"
                >
                  <div>
                    <p className="font-medium text-gray-800">{t.name}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(t.date).toLocaleDateString("pl-PL")}
                      {t.location && ` · ${t.location}`}
                      {` · ${t._count.matches} mecz${t._count.matches === 1 ? "" : t._count.matches < 5 ? "e" : "y"}`}
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
    </div>
  );
}
