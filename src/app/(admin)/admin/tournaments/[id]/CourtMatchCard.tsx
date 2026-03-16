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
  courtNumber?: number;
}

function PlayerPin({
  cx, cy, name, color,
}: {
  cx: number; cy: number; name: string; color: string;
}) {
  const parts = name.trim().split(" ");
  const abbr = parts.map((w) => w[0] ?? "").join("").slice(0, 2).toUpperCase();
  const firstName = parts[0] ?? "";
  const lastName = parts.slice(1).join(" ");
  const lastNameShort = lastName.length > 11 ? lastName.slice(0, 10) + "…" : lastName;
  const labelH = lastName ? 26 : 16;

  return (
    <g>
      <circle cx={cx} cy={cy} r={22} fill={color} />
      <text x={cx} y={cy + 5} textAnchor="middle" fill="white" fontSize="13" fontWeight="bold">
        {abbr}
      </text>
      <rect x={cx - 37} y={cy + 24} width={74} height={labelH} rx="4" fill="rgba(0,0,0,0.55)" />
      <text x={cx} y={cy + 35} textAnchor="middle" fill="white" fontSize="10" fontWeight="600">
        {firstName}
      </text>
      {lastName && (
        <text x={cx} y={cy + 46} textAnchor="middle" fill="rgba(255,255,255,0.85)" fontSize="9.5">
          {lastNameShort}
        </text>
      )}
    </g>
  );
}

function PadelCourtSVG({
  t1p1, t1p2, t2p1, t2p2,
  t1Score, t2Score,
  completed, courtNumber,
}: {
  t1p1: string; t1p2: string | null;
  t2p1: string; t2p2: string | null;
  t1Score: number; t2Score: number;
  completed: boolean;
  courtNumber?: number;
}) {
  const t1Win = completed && t1Score > t2Score;
  const t2Win = completed && t2Score > t1Score;
  const c1 = t1Win ? "#22c55e" : "#3b82f6";
  const c2 = t2Win ? "#22c55e" : "#ef4444";

  return (
    <svg viewBox="0 0 480 236" xmlns="http://www.w3.org/2000/svg" className="w-full" aria-hidden="true">
      {/* Background */}
      <rect width="480" height="236" fill="#0d3318" rx="8" />

      {/* Court surface */}
      <rect x="20" y="12" width="440" height="212" fill="#1b6b41" rx="3" />

      {/* Glass back walls (ends) */}
      <rect x="20" y="12" width="42" height="212" fill="#2a8a55" opacity="0.55" />
      <rect x="418" y="12" width="42" height="212" fill="#2a8a55" opacity="0.55" />

      {/* Court boundary */}
      <rect x="20" y="12" width="440" height="212" fill="none" stroke="white" strokeWidth="2" rx="3" />

      {/* ── Padel service lines ── */}
      {/* Service lines at ~30% from net (3m of 10m half-court) */}
      {/* Left service line: x = 240 - 440/2*0.3 = 240-66 = 174 */}
      <line x1="174" y1="12" x2="174" y2="224" stroke="white" strokeWidth="1.5" opacity="0.75" />
      {/* Right service line */}
      <line x1="306" y1="12" x2="306" y2="224" stroke="white" strokeWidth="1.5" opacity="0.75" />
      {/* Center service lines (net to service line, perpendicular) */}
      <line x1="174" y1="118" x2="240" y2="118" stroke="white" strokeWidth="1.5" opacity="0.75" />
      <line x1="240" y1="118" x2="306" y2="118" stroke="white" strokeWidth="1.5" opacity="0.75" />

      {/* Net shadow */}
      <line x1="240" y1="12" x2="240" y2="224" stroke="white" strokeWidth="5" opacity="0.12" />
      {/* Net */}
      <line x1="240" y1="12" x2="240" y2="224" stroke="white" strokeWidth="2.5" />
      {/* Net dashes */}
      <line x1="240" y1="12" x2="240" y2="224" stroke="#d1fae5" strokeWidth="1" strokeDasharray="5,5" opacity="0.35" />
      {/* Net posts */}
      <rect x="236" y="8" width="8" height="8" rx="2" fill="white" />
      <rect x="236" y="220" width="8" height="8" rx="2" fill="white" />

      {/* Court number badge — rendered last to appear above all court elements */}
      {courtNumber !== undefined && (
        <>
          <rect x="172" y="14" width="136" height="26" rx="13" fill="rgba(0,0,0,0.80)" />
          <text x="240" y="32" textAnchor="middle" fill="#fbbf24" fontSize="12" fontWeight="bold" letterSpacing="2">
            KORT {courtNumber}
          </text>
        </>
      )}

      {/* ── Team 1 (left back court) ── */}
      <PlayerPin cx={88} cy={72} name={t1p1} color={c1} />
      {t1p2 && <PlayerPin cx={88} cy={160} name={t1p2} color={c1} />}

      {/* ── Team 2 (right back court) ── */}
      <PlayerPin cx={392} cy={72} name={t2p1} color={c2} />
      {t2p2 && <PlayerPin cx={392} cy={160} name={t2p2} color={c2} />}

      {/* Score / vs badge */}
      {completed ? (
        <>
          <rect x="183" y="96" width="114" height="44" rx="8" fill="rgba(0,0,0,0.68)" />
          <text x="240" y="125" textAnchor="middle" fill="#fbbf24" fontSize="24" fontWeight="bold" fontFamily="monospace">
            {t1Score}–{t2Score}
          </text>
        </>
      ) : (
        <>
          <rect x="205" y="102" width="70" height="32" rx="7" fill="rgba(0,0,0,0.42)" />
          <text x="240" y="123" textAnchor="middle" fill="rgba(255,255,255,0.55)" fontSize="15" fontWeight="bold">
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
  courtNumber,
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
        courtNumber={courtNumber}
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
