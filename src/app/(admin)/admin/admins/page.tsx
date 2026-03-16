import { prisma } from "@/lib/prisma";
import { addAdmin, removeAdmin, changeAdminPassword } from "./actions";

export default async function AdminsPage() {
  const admins = await prisma.user.findMany({
    where: { role: "admin" },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true },
  });

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Zarządzanie adminami</h1>

      {/* Add admin form */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 mb-6">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100 mb-4">Dodaj admina</h2>
        <form action={addAdmin} className="flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Imię i nazwisko *
              </label>
              <input
                name="name"
                required
                placeholder="Jan Kowalski"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Email *
              </label>
              <input
                name="email"
                type="email"
                required
                placeholder="jan@example.com"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Hasło * (min. 8 znaków)
            </label>
            <input
              name="password"
              type="password"
              required
              minLength={8}
              placeholder="••••••••"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            className="self-end px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Dodaj admina
          </button>
        </form>
      </div>

      {/* Admin list */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <span className="font-semibold text-gray-800 dark:text-gray-100">Admini w bazie danych</span>
          <span className="text-xs text-gray-400 dark:text-gray-500">{admins.length} kont</span>
        </div>

        {/* Root admin info */}
        <div className="px-5 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Admin (konto główne)</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {process.env.ADMIN_EMAIL ?? "—"} · konfigurowany przez zmienne środowiskowe
            </p>
          </div>
          <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded">
            env
          </span>
        </div>

        {admins.length === 0 ? (
          <p className="px-5 py-6 text-sm text-gray-400 dark:text-gray-500 text-center">
            Brak dodatkowych adminów.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {admins.map((admin) => (
              <li key={admin.id} className="px-5 py-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{admin.name}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{admin.email}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <form action={changeAdminPassword} className="flex items-center gap-2">
                      <input type="hidden" name="userId" value={admin.id} />
                      <input
                        name="password"
                        type="password"
                        required
                        minLength={8}
                        placeholder="Nowe hasło"
                        className="border border-gray-300 rounded-lg px-2 py-1 text-xs w-28 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="submit"
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap"
                      >
                        Zmień
                      </button>
                    </form>
                    <form
                      action={async () => {
                        "use server";
                        await removeAdmin(admin.id);
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
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
