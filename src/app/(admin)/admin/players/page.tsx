import { prisma } from "@/lib/prisma";
import { addPlayer, deletePlayer } from "./actions";

export default async function PlayersPage() {
  const players = await prisma.player.findMany({ orderBy: { name: "asc" } });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Gracze</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Add form */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 dark:text-gray-100 mb-4">Dodaj gracza</h2>
          <form action={addPlayer} className="flex flex-col gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Imię i nazwisko *
              </label>
              <input
                name="name"
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Email
              </label>
              <input
                name="email"
                type="email"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Telefon
              </label>
              <input
                name="phone"
                type="tel"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Dodaj gracza
            </button>
          </form>
        </div>

        {/* Players list */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
            <span className="font-semibold text-gray-800 dark:text-gray-100">
              Lista graczy ({players.length})
            </span>
          </div>
          {players.length === 0 ? (
            <p className="px-5 py-8 text-gray-400 dark:text-gray-500 text-sm text-center">
              Brak graczy. Dodaj pierwszego gracza.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
              {players.map((player) => (
                <li
                  key={player.id}
                  className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <div>
                    <p className="font-medium text-gray-800 dark:text-gray-100">{player.name}</p>
                    {(player.email || player.phone) && (
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {[player.email, player.phone].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </div>
                  <form
                    action={async () => {
                      "use server";
                      await deletePlayer(player.id);
                    }}
                  >
                    <button
                      type="submit"
                      className="text-xs text-red-500 hover:text-red-700 hover:underline"
                    >
                      Usuń
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
