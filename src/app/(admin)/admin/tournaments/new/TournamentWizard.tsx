"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createTournamentWithMatches, type CreateTournamentInput, type ParticipantInput } from "./actions";

type Player = { id: string; name: string };

type Step = 1 | 2 | 3 | 4;

const SYSTEMS = [
  {
    value: "round_robin",
    label: "Round Robin",
    desc: "Każdy gra z każdym. Wygrywa najlepszy bilans.",
    icon: "◎",
  },
  {
    value: "americano",
    label: "Americano",
    desc: "Pary rotują co rundę. Liczy się suma gemów każdego gracza.",
    icon: "🔄",
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

  // Step 1: basic info
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");

  // Step 2: format + system
  const [format, setFormat] = useState<"singles" | "doubles">("singles");
  const [system, setSystem] = useState<CreateTournamentInput["system"]>("round_robin");
  const [groupCount, setGroupCount] = useState(2);

  // Step 3: participants
  const [singles, setSingles] = useState<string[]>([]); // player IDs
  const [teams, setTeams] = useState<{ p1: string; p2: string; name: string }[]>([]);

  const participantCount = format === "singles" ? singles.length : teams.length;

  function toggleSingles(id: string) {
    setSingles((prev) =>
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

  async function handleSubmit() {
    setLoading(true);
    try {
      const participants: ParticipantInput[] =
        format === "singles"
          ? singles.map((id) => ({ type: "singles", playerId: id }))
          : teams.map((t) => ({
              type: "doubles",
              player1Id: t.p1,
              player2Id: t.p2,
              name: t.name || undefined,
            }));

      const id = await createTournamentWithMatches({
        name,
        date,
        location: location || undefined,
        notes: notes || undefined,
        format,
        system,
        groups: system === "groups_playoff" ? groupCount : 1,
        participants,
      });
      router.push(`/admin/tournaments/${id}`);
    } finally {
      setLoading(false);
    }
  }

  const usedPlayers = teams.flatMap((t) => [t.p1, t.p2]).filter(Boolean);
  const availableForTeam = (teamIdx: number, slot: "p1" | "p2") =>
    players.filter(
      (p) =>
        !usedPlayers.includes(p.id) ||
        teams[teamIdx][slot] === p.id
    );

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
                  : "bg-gray-200 text-gray-500"
              }`}
            >
              {step > s ? "✓" : s}
            </div>
            {s < 4 && <div className={`h-0.5 w-12 ${step > s ? "bg-green-500" : "bg-gray-200"}`} />}
          </div>
        ))}
        <span className="ml-2 text-sm text-gray-500">
          {["Informacje", "Format", "Uczestnicy", "Podsumowanie"][step - 1]}
        </span>
      </div>

      {/* Step 1: Basic info */}
      {step === 1 && (
        <div className="bg-white rounded-xl shadow-sm p-6 flex flex-col gap-4">
          <h2 className="font-semibold text-lg text-gray-800">Informacje o turnieju</h2>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nazwa *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="np. Turniej Marzec 2026"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Data *</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Lokalizacja</label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="np. Korty Mokotów"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notatki</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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

      {/* Step 2: Format + System */}
      {step === 2 && (
        <div className="bg-white rounded-xl shadow-sm p-6 flex flex-col gap-6">
          <h2 className="font-semibold text-lg text-gray-800">Format i system gry</h2>

          <div>
            <p className="text-xs font-medium text-gray-600 mb-2">Format gry</p>
            <div className="grid grid-cols-2 gap-3">
              {(["singles", "doubles"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className={`p-4 rounded-xl border-2 text-left transition-colors ${
                    format === f ? "border-blue-600 bg-blue-50" : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <p className="font-semibold text-sm">
                    {f === "singles" ? "Singiel" : "Debel"}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {f === "singles" ? "1 gracz vs 1 gracz" : "Para vs para (2 vs 2)"}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-gray-600 mb-2">System rozgrywek</p>
            <div className="grid grid-cols-1 gap-2">
              {SYSTEMS.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setSystem(s.value)}
                  className={`p-4 rounded-xl border-2 text-left transition-colors ${
                    system === s.value ? "border-blue-600 bg-blue-50" : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{s.icon}</span>
                    <div>
                      <p className="font-semibold text-sm">{s.label}</p>
                      <p className="text-xs text-gray-500">{s.desc}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {system === "groups_playoff" && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Liczba grup
              </label>
              <select
                value={groupCount}
                onChange={(e) => setGroupCount(Number(e.target.value))}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {[2, 3, 4].map((n) => (
                  <option key={n} value={n}>{n} grupy</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex gap-3 justify-between">
            <button onClick={() => setStep(1)} className="px-4 py-2 text-gray-600 text-sm hover:underline">
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
        <div className="bg-white rounded-xl shadow-sm p-6 flex flex-col gap-4">
          <h2 className="font-semibold text-lg text-gray-800">
            {format === "singles" ? "Wybierz graczy" : "Utwórz pary (debel)"}
          </h2>

          {format === "singles" ? (
            <div>
              <p className="text-xs text-gray-500 mb-3">
                Zaznacz graczy biorących udział w turnieju ({singles.length} wybranych)
              </p>
              <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto">
                {players.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => toggleSingles(p.id)}
                    className={`px-3 py-2 rounded-lg border text-sm text-left transition-colors ${
                      singles.includes(p.id)
                        ? "border-blue-600 bg-blue-50 font-medium"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {singles.includes(p.id) && <span className="text-blue-600 mr-1">✓</span>}
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-gray-500">
                Utwórz pary debla ({teams.length} par)
              </p>
              {teams.map((team, i) => (
                <div key={i} className="border border-gray-200 rounded-xl p-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-500">Para {i + 1}</span>
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
                      className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Gracz 1...</option>
                      {availableForTeam(i, "p1").map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <select
                      value={team.p2}
                      onChange={(e) => updateTeam(i, "p2", e.target.value)}
                      className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Gracz 2...</option>
                      {availableForTeam(i, "p2").map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <input
                    value={team.name}
                    onChange={(e) => updateTeam(i, "name", e.target.value)}
                    placeholder="Nazwa pary (opcjonalnie)"
                    className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
              <button
                onClick={addTeam}
                className="px-4 py-2 border-2 border-dashed border-gray-300 text-gray-500 rounded-xl text-sm hover:border-blue-400 hover:text-blue-600 transition-colors"
              >
                + Dodaj parę
              </button>
            </div>
          )}

          <div className="flex gap-3 justify-between">
            <button onClick={() => setStep(2)} className="px-4 py-2 text-gray-600 text-sm hover:underline">
              ← Wstecz
            </button>
            <button
              disabled={participantCount < 2}
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
        <div className="bg-white rounded-xl shadow-sm p-6 flex flex-col gap-5">
          <h2 className="font-semibold text-lg text-gray-800">Podsumowanie</h2>

          <div className="bg-gray-50 rounded-xl p-4 flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Turniej</span>
              <span className="font-medium">{name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Data</span>
              <span className="font-medium">{new Date(date).toLocaleDateString("pl-PL")}</span>
            </div>
            {location && (
              <div className="flex justify-between">
                <span className="text-gray-500">Miejsce</span>
                <span className="font-medium">{location}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">Format</span>
              <span className="font-medium">{format === "singles" ? "Singiel" : "Debel"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">System</span>
              <span className="font-medium">
                {SYSTEMS.find((s) => s.value === system)?.label}
                {system === "groups_playoff" && ` (${groupCount} grupy)`}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">
                {format === "singles" ? "Graczy" : "Par"}
              </span>
              <span className="font-medium">{participantCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Meczów (wygenerowanych)</span>
              <span className="font-bold text-blue-600">{estimateMatchCount()}</span>
            </div>
          </div>

          <div className="flex gap-3 justify-between">
            <button onClick={() => setStep(3)} className="px-4 py-2 text-gray-600 text-sm hover:underline">
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
    if (system === "round_robin") return (n * (n - 1)) / 2;
    if (system === "americano") return Math.floor(n / 2);
    if (system === "groups_playoff") return Math.floor(((n / groupCount) * (n / groupCount - 1)) / 2) * groupCount;
    if (system === "elimination") return n - 1;
    return 0;
  }
}
