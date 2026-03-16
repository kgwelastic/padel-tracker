"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createTournamentWithMatches, type CreateTournamentInput, type ParticipantInput } from "./actions";

type Player = { id: string; name: string };
type Step = 1 | 2 | 3 | 4;

const SYSTEMS = [
  {
    value: "americano",
    label: "Americano",
    desc: "Pary losowane co rundę. Ranking indywidualny po punktach.",
    icon: "🔄",
  },
  {
    value: "mexicano",
    label: "Mexicano",
    desc: "Runda 1 losowa, kolejne: 1. z 2., 3. z 4. itd. Ranking decyduje o parach.",
    icon: "🇲🇽",
  },
  {
    value: "groups_playoff",
    label: "Grupy + Play-off",
    desc: "Faza grupowa Round Robin, potem drabinka play-off.",
    icon: "🏆",
  },
  {
    value: "elimination",
    label: "Puchar",
    desc: "Przegrana = odpadasz. Drabinka pucharowa.",
    icon: "⚡",
  },
] as const;

export function TournamentWizard({ players }: { players: Player[] }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);

  // Step 1
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");

  // Step 2
  const [system, setSystem] = useState<CreateTournamentInput["system"]>("americano");
  const [groupCount, setGroupCount] = useState(2);
  const [courts, setCourts] = useState(2);
  const [courtNumbers, setCourtNumbers] = useState<number[]>([1, 2]);
  const [pointsToWin, setPointsToWin] = useState(21);

  // Step 3
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [teams, setTeams] = useState<{ p1: string; p2: string; name: string }[]>([]);

  const isAmericanoLike = system === "americano" || system === "mexicano";

  const participantCount = isAmericanoLike ? selectedPlayerIds.length : teams.length;

  function handleCourtsChange(n: number) {
    setCourts(n);
    setCourtNumbers(Array.from({ length: n }, (_, i) => i + 1));
  }

  function updateCourtNumber(idx: number, val: number) {
    setCourtNumbers((prev) => prev.map((n, i) => (i === idx ? val : n)));
  }

  function togglePlayer(id: string) {
    setSelectedPlayerIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function addTeam() {
    setTeams((prev) => [...prev, { p1: "", p2: "", name: "" }]);
  }

  function updateTeam(i: number, field: "p1" | "p2" | "name", value: string) {
    setTeams((prev) => prev.map((t, idx) => (idx === i ? { ...t, [field]: value } : t)));
  }

  function removeTeam(i: number) {
    setTeams((prev) => prev.filter((_, idx) => idx !== i));
  }

  const usedPlayers = teams.flatMap((t) => [t.p1, t.p2]).filter(Boolean);
  const availableForTeam = (teamIdx: number, slot: "p1" | "p2") =>
    players.filter(
      (p) => !usedPlayers.includes(p.id) || teams[teamIdx][slot] === p.id
    );

  async function handleSubmit() {
    setLoading(true);
    try {
      let participants: ParticipantInput[];

      if (isAmericanoLike) {
        participants = selectedPlayerIds.map((id) => ({ type: "singles", playerId: id }));
      } else {
        participants = teams.map((t) => ({
          type: "doubles",
          player1Id: t.p1,
          player2Id: t.p2,
          name: t.name || undefined,
        }));
      }

      const id = await createTournamentWithMatches({
        name,
        date,
        location: location || undefined,
        notes: notes || undefined,
        format: "doubles",
        system,
        groups: system === "groups_playoff" ? groupCount : 1,
        courts: isAmericanoLike ? courts : 1,
        courtNumbers: isAmericanoLike ? courtNumbers : [],
        pointsToWin: isAmericanoLike ? pointsToWin : 21,
        participants,
      });
      router.push(`/admin/tournaments/${id}`);
    } finally {
      setLoading(false);
    }
  }

  const matchesPerRound = isAmericanoLike
    ? Math.floor(Math.min(courts * 4, participantCount) / 4)
    : null;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress */}
      <div className="flex items-center gap-2 mb-8">
        {([1, 2, 3, 4] as Step[]).map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                step === s
                  ? "bg-blue-600 text-white"
                  : step > s
                  ? "bg-green-500 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
              }`}
            >
              {step > s ? "✓" : s}
            </div>
            {s < 4 && (
              <div className={`h-0.5 w-12 ${step > s ? "bg-green-500" : "bg-gray-200 dark:bg-gray-700"}`} />
            )}
          </div>
        ))}
        <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
          {["Informacje", "Format", "Uczestnicy", "Podsumowanie"][step - 1]}
        </span>
      </div>

      {/* Step 1: Basic info */}
      {step === 1 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 flex flex-col gap-4">
          <h2 className="font-semibold text-lg text-gray-800 dark:text-gray-100">Informacje o turnieju</h2>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Nazwa *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="np. Turniej Marzec 2026"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Data *</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Lokalizacja</label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="np. Korty Mokotów"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Notatki</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
            />
          </div>
          <button
            disabled={!name || !date}
            onClick={() => setStep(2)}
            className="self-end px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors"
          >
            Dalej →
          </button>
        </div>
      )}

      {/* Step 2: System */}
      {step === 2 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 flex flex-col gap-6">
          <h2 className="font-semibold text-lg text-gray-800 dark:text-gray-100">System gry</h2>

          <div>
            <p className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-2">System rozgrywek</p>
            <div className="grid grid-cols-1 gap-2">
              {SYSTEMS.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setSystem(s.value)}
                  className={`p-4 rounded-xl border-2 text-left transition-colors ${
                    system === s.value
                      ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20"
                      : "border-gray-200 dark:border-gray-600 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{s.icon}</span>
                    <div>
                      <p className="font-semibold text-sm text-gray-800 dark:text-gray-100">{s.label}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{s.desc}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Groups count — for groups_playoff */}
          {system === "groups_playoff" && (
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Liczba grup</label>
              <select
                value={groupCount}
                onChange={(e) => setGroupCount(Number(e.target.value))}
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
              >
                {[2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    {n} grupy
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Americano / Mexicano settings */}
          {isAmericanoLike && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 flex flex-col gap-4">
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wide">
                Ustawienia {system === "mexicano" ? "Mexicano" : "Americano"}
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                    Liczba kortów *
                  </label>
                  <select
                    value={courts}
                    onChange={(e) => handleCourtsChange(Number(e.target.value))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                  >
                    {[1, 2, 3, 4, 5, 6].map((n) => (
                      <option key={n} value={n}>
                        {n} {n === 1 ? "kort" : n < 5 ? "korty" : "kortów"}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    {courts * 4} graczy aktywnych / rundę
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                    Punkty do wygrania *
                  </label>
                  <input
                    type="number"
                    value={pointsToWin}
                    onChange={(e) => setPointsToWin(Number(e.target.value))}
                    min={5}
                    max={100}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                  />
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Suma punktów na mecz</p>
                </div>
              </div>

              {/* Court numbers */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-2">
                  Numery kortów
                </label>
                <div className="flex flex-wrap gap-3">
                  {Array.from({ length: courts }, (_, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <span className="text-xs text-gray-500 dark:text-gray-400">Kort {i + 1}:</span>
                      <input
                        type="number"
                        value={courtNumbers[i] ?? i + 1}
                        onChange={(e) => updateCourtNumber(i, Number(e.target.value))}
                        min={1}
                        max={99}
                        className="w-14 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Rzeczywiste numery kortów (np. jeśli dostępne są korty 3, 5, 7)
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-3 justify-between">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 text-gray-600 dark:text-gray-300 text-sm hover:underline"
            >
              ← Wstecz
            </button>
            <button
              onClick={() => setStep(3)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Dalej →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Participants */}
      {step === 3 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 flex flex-col gap-4">
          <h2 className="font-semibold text-lg text-gray-800 dark:text-gray-100">
            {isAmericanoLike ? "Wybierz uczestników" : "Utwórz pary (debel)"}
          </h2>

          {/* Individual player selection for Americano/Mexicano */}
          {isAmericanoLike && (
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                Zaznacz uczestników turnieju ({selectedPlayerIds.length} wybranych). Pary będą losowane automatycznie.
              </p>
              {selectedPlayerIds.length > 0 && selectedPlayerIds.length < courts * 4 && (
                <div className="mb-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 rounded-lg text-xs text-amber-700 dark:text-amber-400">
                  Minimum {courts * 4} graczy dla {courts} {courts === 1 ? "kortu" : "kortów"}.
                  Aktualnie: {selectedPlayerIds.length}. Możliwa jest gra z mniejszą liczbą (kto nie gra — pauzuje).
                </div>
              )}
              {selectedPlayerIds.length >= 4 && selectedPlayerIds.length % 4 !== 0 && (
                <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg text-xs text-blue-700 dark:text-blue-400">
                  {selectedPlayerIds.length % 4} gracz
                  {selectedPlayerIds.length % 4 === 1 ? "" : "e"} będzie pauzować w każdej rundzie (rotacja).
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto">
                {players.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => togglePlayer(p.id)}
                    className={`px-3 py-2 rounded-lg border text-sm text-left transition-colors ${
                      selectedPlayerIds.includes(p.id)
                        ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20 font-medium"
                        : "border-gray-200 dark:border-gray-600 hover:border-gray-300"
                    }`}
                  >
                    {selectedPlayerIds.includes(p.id) && (
                      <span className="text-blue-600 mr-1">✓</span>
                    )}
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Team builder: doubles (non-Americano/Mexicano) */}
          {!isAmericanoLike && (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">Utwórz pary debla ({teams.length} par)</p>
              {teams.map((team, i) => (
                <div
                  key={i}
                  className="border border-gray-200 dark:border-gray-600 rounded-xl p-3 flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Para {i + 1}</span>
                    <button
                      onClick={() => removeTeam(i)}
                      className="text-xs text-red-400 hover:text-red-600"
                    >
                      Usuń
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={team.p1}
                      onChange={(e) => updateTeam(i, "p1", e.target.value)}
                      className="border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                    >
                      <option value="">Gracz 1...</option>
                      {availableForTeam(i, "p1").map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={team.p2}
                      onChange={(e) => updateTeam(i, "p2", e.target.value)}
                      className="border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                    >
                      <option value="">Gracz 2...</option>
                      {availableForTeam(i, "p2").map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <input
                    value={team.name}
                    onChange={(e) => updateTeam(i, "name", e.target.value)}
                    placeholder="Nazwa pary (opcjonalnie)"
                    className="border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                  />
                </div>
              ))}
              <button
                onClick={addTeam}
                className="px-4 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 rounded-xl text-sm hover:border-blue-400 hover:text-blue-600 transition-colors"
              >
                + Dodaj parę
              </button>
            </div>
          )}

          <div className="flex gap-3 justify-between">
            <button
              onClick={() => setStep(2)}
              className="px-4 py-2 text-gray-600 dark:text-gray-300 text-sm hover:underline"
            >
              ← Wstecz
            </button>
            <button
              disabled={participantCount < (isAmericanoLike ? 4 : 2)}
              onClick={() => setStep(4)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors"
            >
              Dalej →
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Summary */}
      {step === 4 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 flex flex-col gap-5">
          <h2 className="font-semibold text-lg text-gray-800 dark:text-gray-100">Podsumowanie</h2>

          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 flex flex-col gap-2 text-sm">
            <Row label="Turniej" value={name} />
            <Row label="Data" value={new Date(date).toLocaleDateString("pl-PL")} />
            {location && <Row label="Miejsce" value={location} />}
            {isAmericanoLike ? (
              <>
                <Row label="System" value={system === "mexicano" ? "Mexicano (Debel)" : "Americano (Debel)"} />
                <Row
                  label="Korty"
                  value={courtNumbers.map((n) => `Kort ${n}`).join(", ")}
                />
                <Row label="Punkty do wygrania" value={`${pointsToWin}`} />
                <Row label="Uczestników" value={`${participantCount}`} />
                {matchesPerRound !== null && matchesPerRound > 0 && (
                  <Row label="Meczów / rundę" value={`${matchesPerRound}`} highlight />
                )}
                {participantCount > courts * 4 && (
                  <Row label="Pauzuje / rundę" value={`${participantCount - courts * 4} graczy`} />
                )}
              </>
            ) : (
              <>
                <Row
                  label="System"
                  value={SYSTEMS.find((s) => s.value === system)?.label ?? system}
                />
                {system === "groups_playoff" && (
                  <Row label="Grup" value={`${groupCount}`} />
                )}
                <Row label="Par" value={`${participantCount}`} />
                <Row label="Meczów (wygenerowanych)" value={`${estimateMatchCount()}`} highlight />
              </>
            )}
          </div>

          <div className="flex gap-3 justify-between">
            <button
              onClick={() => setStep(3)}
              className="px-4 py-2 text-gray-600 dark:text-gray-300 text-sm hover:underline"
            >
              ← Wstecz
            </button>
            <button
              disabled={loading}
              onClick={handleSubmit}
              className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "Tworzę turniej..." : "Utwórz turniej i generuj mecze →"}
            </button>
          </div>
        </div>
      )}
    </div>
  );

  function estimateMatchCount(): number {
    const n = participantCount;
    if (system === "groups_playoff")
      return (
        Math.floor(((n / groupCount) * (n / groupCount - 1)) / 2) * groupCount
      );
    if (system === "elimination") return n - 1;
    return 0;
  }
}

function Row({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span className={highlight ? "font-bold text-blue-600" : "font-medium text-gray-800 dark:text-gray-100"}>
        {value}
      </span>
    </div>
  );
}
