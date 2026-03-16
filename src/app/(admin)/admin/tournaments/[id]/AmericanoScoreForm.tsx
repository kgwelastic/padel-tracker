"use client";

import { useState, useTransition } from "react";
import { enterMatchResult } from "./actions";

interface Props {
  matchId: string;
  tournamentId: string;
  team1Label: string;
  team2Label: string;
  pointsToWin: number;
}

export function AmericanoScoreForm({
  matchId,
  tournamentId,
  team1Label,
  team2Label,
  pointsToWin,
}: Props) {
  const [s1, setS1] = useState("");
  const [s2, setS2] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const n1 = s1 === "" ? NaN : Number(s1);
  const n2 = s2 === "" ? NaN : Number(s2);
  const sum = n1 + n2;
  const sumOk = !isNaN(sum) && sum === pointsToWin;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isNaN(n1) || isNaN(n2)) {
      setError("Wprowadź wyniki obu drużyn.");
      return;
    }
    if (sum !== pointsToWin) {
      setError(`Suma musi wynosić ${pointsToWin} (teraz: ${sum}).`);
      return;
    }
    setError("");
    const formData = new FormData();
    formData.set("set1_t1", String(n1));
    formData.set("set1_t2", String(n2));
    startTransition(async () => {
      await enterMatchResult(matchId, tournamentId, formData);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div className="text-sm font-medium text-gray-700 mb-1">
        {team1Label}
        <span className="mx-2 text-gray-400 font-normal">vs</span>
        {team2Label}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <input
          type="number"
          min="0"
          max={pointsToWin}
          value={s1}
          onChange={(e) => {
            setS1(e.target.value);
            setError("");
          }}
          placeholder="0"
          className="w-16 border border-gray-300 rounded px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <span className="text-gray-400 font-medium">–</span>
        <input
          type="number"
          min="0"
          max={pointsToWin}
          value={s2}
          onChange={(e) => {
            setS2(e.target.value);
            setError("");
          }}
          placeholder="0"
          className="w-16 border border-gray-300 rounded px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <span className="text-xs text-gray-400">
          {!isNaN(sum) && s1 !== "" && s2 !== "" ? (
            sumOk ? (
              <span className="text-green-600">= {sum} ✓</span>
            ) : (
              <span className="text-red-500">= {sum} (powinno być {pointsToWin})</span>
            )
          ) : (
            `do ${pointsToWin} pkt`
          )}
        </span>
        <button
          type="submit"
          disabled={!sumOk || isPending}
          className="ml-auto bg-green-600 text-white text-xs px-3 py-1.5 rounded hover:bg-green-700 disabled:opacity-40 transition-colors"
        >
          {isPending ? "..." : "Zapisz"}
        </button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </form>
  );
}
