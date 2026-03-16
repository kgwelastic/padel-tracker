"use client";

import { useTransition } from "react";
import { deleteTournament } from "./actions";

export function DeleteTournamentButton({ tournamentId }: { tournamentId: string }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm("Czy na pewno chcesz usunąć ten turniej?\nUsuniętych danych nie można odzyskać.")) return;
    startTransition(() => deleteTournament(tournamentId));
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="text-xs text-red-500 hover:text-red-700 hover:underline disabled:opacity-40"
    >
      {isPending ? "Usuwam…" : "Usuń"}
    </button>
  );
}
