"use client";

import { useState, useTransition } from "react";
import { enterMatchResult, clearMatchResult } from "./actions";

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function shortName(name: string) {
  const parts = name.trim().split(" ");
  if (parts.length === 1) return name.slice(0, 10);
  return `${parts[0]} ${parts[parts.length - 1].slice(0, 1)}.`;
}

interface CourtMatchCardProps {
  matchId: string;
  tournamentId: string;
  team1Player1: string;
  team1Player2: string | null;
  team2Player1: string;
  team2Player2: string | null;
  status: "pending" | "completed";
  t1Score: number;
  t2Score: number;
  pointsToWin: number;
}

function PadelCourtSVG({
  t1p1, t1p2, t2p1, t2p2,
  t1Score, t2Score,
  completed,
}: {
  t1p1: string; t1p2: string | null;
  t2p1: string; t2p2: string | null;
  t1Score: number; t2Score: number;
  completed: boolean;
}) {
  const t1Win = completed && t1Score > t2Score;
  const t2Win = completed && t2Score > t1Score;

  return (
    <svg
      viewBox="0 0 480 230"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full"
      aria-hidden="true"
    >
      {/* Outer background */}
      <rect width="480" height="230" fill="#0f3d1f" rx="8" />

      {/* Court surface */}
      <rect x="22" y="14" width="436" height="202" fill="#1e6e46" rx="3" />

      {/* Glass walls - ends */}
      <rect x="22" y="14" width="38" height="202" fill="#27885a" opacity="0.5" />
      <rect x="420" y="14" width="38" height="202" fill="#27885a" opacity="0.5" />

      {/* Boundary lines */}
      <rect x="22" y="14" width="436" height="202" fill="none" stroke="white" strokeWidth="2" rx="3" />

      {/* Service lines - left side */}
      <line x1="148" y1="14" x2="148" y2="216" stroke="white" strokeWidth="1.5" opacity="0.8" />
      <line x1="22" y1="115" x2="148" y2="115" stroke="white" strokeWidth="1.5" opacity="0.8" />

      {/* Service lines - right side */}
      <line x1="332" y1="14" x2="332" y2="216" stroke="white" strokeWidth="1.5" opacity="0.8" />
      <line x1="332" y1="115" x2="458" y2="115" stroke="white" strokeWidth="1.5" opacity="0.8" />

      {/* Net shadow */}
      <line x1="240" y1="14" x2="240" y2="216" stroke="white" strokeWidth="4" opacity="0.15" />
      {/* Net */}
      <line x1="240" y1="14" x2="240" y2="216" stroke="white" strokeWidth="2.5" />
      {/* Net mesh effect */}
      <line x1="240" y1="14" x2="240" y2="216" stroke="#e5e7eb" strokeWidth="1" strokeDasharray="5,5" opacity="0.4" />
      {/* Net posts */}
      <rect x="236" y="10" width="8" height="8" rx="2" fill="white" />
      <rect x="236" y="212" width="8" height="8" rx="2" fill="white" />

      {/* ── Team 1 players (left side, blue) ── */}
      {/* Player 1 - upper left */}
      <circle cx="90" cy="72" r="20" fill={t1Win ? "#22c55e" : "#3b82f6"} opacity="0.95" />
      <text x="90" y="78" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">
        {initials(t1p1)}
      </text>
      <text x="90" y="100" textAnchor="middle" fill="white" fontSize="9.5" opacity="0.95">
        {shortName(t1p1)}
      </text>

      {/* Player 2 - lower left */}
      {t1p2 && (
        <>
          <circle cx="90" cy="158" r="20" fill={t1Win ? "#22c55e" : "#3b82f6"} opacity="0.95" />
          <text x="90" y="164" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">
            {initials(t1p2)}
          </text>
          <text x="90" y="186" textAnchor="middle" fill="white" fontSize="9.5" opacity="0.95">
            {shortName(t1p2)}
          </text>
        </>
      )}

      {/* ── Team 2 players (right side, red/orange) ── */}
      {/* Player 1 - upper right */}
      <circle cx="390" cy="72" r="20" fill={t2Win ? "#22c55e" : "#ef4444"} opacity="0.95" />
      <text x="390" y="78" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">
        {initials(t2p1)}
      </text>
      <text x="390" y="100" textAnchor="middle" fill="white" fontSize="9.5" opacity="0.95">
        {shortName(t2p1)}
      </text>

      {/* Player 2 - lower right */}
      {t2p2 && (
        <>
          <circle cx="390" cy="158" r="20" fill={t2Win ? "#22c55e" : "#ef4444"} opacity="0.95" />
          <text x="390" y="164" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">
            {initials(t2p2)}
          </text>
          <text x="390" y="186" textAnchor="middle" fill="white" fontSize="9.5" opacity="0.95">
            {shortName(t2p2)}
          </text>
        </>
      )}

      {/* Score / vs badge at net */}
      {completed ? (
        <>
          <rect x="186" y="95" width="108" height="40" rx="8" fill="rgba(0,0,0,0.65)" />
          <text
            x="240"
            y="122"
            textAnchor="middle"
            fill="#fbbf24"
            fontSize="22"
            fontWeight="bold"
            fontFamily="monospace"
          >
            {t1Score}–{t2Score}
          </text>
        </>
      ) : (
        <>
          <rect x="206" y="100" width="68" height="30" rx="6" fill="rgba(0,0,0,0.45)" />
          <text x="240" y="120" textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="14" fontWeight="bold">
            vs
          </text>
        </>
      )}
    </svg>
  );
}

export function CourtMatchCard({
  matchId,
  tournamentId,
  team1Player1,
  team1Player2,
  team2Player1,
  team2Player2,
  status,
  t1Score,
  t2Score,
  pointsToWin,
}: CourtMatchCardProps) {
  const [s1, setS1] = useState("");
  const [s2, setS2] = useState("");
  const [isPending, startTransition] = useTransition();

  const n1 = s1 === "" ? NaN : Number(s1);
  const n2 = s2 === "" ? NaN : Number(s2);
  const sum = n1 + n2;
  const sumOk = !isNaN(sum) && sum === pointsToWin;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sumOk) return;
    const formData = new FormData();
    formData.set("set1_t1", String(n1));
    formData.set("set1_t2", String(n2));
    startTransition(async () => {
      await enterMatchResult(matchId, tournamentId, formData);
    });
  }

  const completed = status === "completed";

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700">
      {/* Court graphic */}
      <PadelCourtSVG
        t1p1={team1Player1}
        t1p2={team1Player2}
        t2p1={team2Player1}
        t2p2={team2Player2}
        t1Score={t1Score}
        t2Score={t2Score}
        completed={completed}
      />

      {/* Bottom strip */}
      {completed ? (
        <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3 text-sm">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />
              <span className={`font-medium ${t1Score > t2Score ? "text-green-600 dark:text-green-400" : "text-gray-600 dark:text-gray-300"}`}>
                {team1Player1}{team1Player2 ? ` / ${team1Player2}` : ""}
              </span>
            </span>
            <span className="font-mono font-bold text-amber-500 dark:text-amber-400">
              {t1Score} – {t2Score}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
              <span className={`font-medium ${t2Score > t1Score ? "text-green-600 dark:text-green-400" : "text-gray-600 dark:text-gray-300"}`}>
                {team2Player1}{team2Player2 ? ` / ${team2Player2}` : ""}
              </span>
            </span>
          </div>
          <form action={clearMatchResult.bind(null, matchId, tournamentId)}>
            <button
              type="submit"
              className="text-xs text-red-400 hover:text-red-600 dark:hover:text-red-400 px-2 py-1"
              title="Usuń wynik"
            >
              ✕
            </button>
          </form>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-100 dark:border-gray-700 flex flex-col gap-2"
        >
          <div className="flex items-center gap-3 flex-wrap">
            {/* Team 1 score */}
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-500 flex-shrink-0" />
              <input
                type="number"
                min="0"
                max={pointsToWin}
                value={s1}
                onChange={(e) => {
                  const val = e.target.value;
                  setS1(val);
                  const n = Number(val);
                  if (val !== "" && !isNaN(n) && n >= 0 && n <= pointsToWin) {
                    setS2(String(pointsToWin - n));
                  }
                }}
                placeholder="0"
                className="w-14 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
              />
            </div>

            <span className="text-gray-400 font-medium text-lg">–</span>

            {/* Team 2 score */}
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max={pointsToWin}
                value={s2}
                onChange={(e) => setS2(e.target.value)}
                placeholder="0"
                className="w-14 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
              />
              <span className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0" />
            </div>

            {/* Sum validation */}
            <span className="text-xs ml-1">
              {s1 !== "" && s2 !== "" && !isNaN(sum) ? (
                sumOk ? (
                  <span className="text-green-600 dark:text-green-400 font-medium">= {sum} ✓</span>
                ) : (
                  <span className="text-red-500">= {sum} (powinno być {pointsToWin})</span>
                )
              ) : (
                <span className="text-gray-400 dark:text-gray-500">do {pointsToWin} pkt</span>
              )}
            </span>

            <button
              type="submit"
              disabled={!sumOk || isPending}
              className="ml-auto bg-green-600 text-white text-sm px-4 py-1.5 rounded-lg hover:bg-green-700 disabled:opacity-40 transition-colors font-medium"
            >
              {isPending ? "..." : "Zapisz"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
