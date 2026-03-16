"use client";

import { useState, useTransition, useRef } from "react";
import { importCsvData } from "./actions";

export function ImportCsvForm({ tournamentId }: { tournamentId: string }) {
  const [open, setOpen] = useState(false);
  const [csv, setCsv] = useState("");
  const [result, setResult] = useState<{
    success?: boolean;
    error?: string;
    playerCount?: number;
    matchCount?: number;
  } | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setCsv((ev.target?.result as string) ?? "");
    reader.readAsText(file, "UTF-8");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);
    const formData = new FormData();
    formData.set("csv", csv);
    startTransition(async () => {
      const res = await importCsvData(tournamentId, formData);
      setResult(res ?? null);
      if (res?.success) {
        setCsv("");
        if (fileRef.current) fileRef.current.value = "";
        setTimeout(() => { setOpen(false); setResult(null); }, 2500);
      }
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
      >
        ↑ Import CSV
      </button>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm text-gray-800 dark:text-gray-100">Import danych z CSV</h3>
        <button
          onClick={() => { setOpen(false); setResult(null); setCsv(""); }}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg leading-none"
        >
          ✕
        </button>
      </div>

      <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-xs text-gray-500 dark:text-gray-400 space-y-1">
        <p>
          <span className="font-medium text-gray-700 dark:text-gray-300">Nagłówek:</span>{" "}
          <code className="bg-white dark:bg-gray-800 px-1 rounded border border-gray-200 dark:border-gray-600">
            Runda;Para 1;Wynik 1;Para 2;Wynik 2;Pauza
          </code>
        </p>
        <p>
          <span className="font-medium text-gray-700 dark:text-gray-300">Para:</span>{" "}
          <code className="bg-white dark:bg-gray-800 px-1 rounded border border-gray-200 dark:border-gray-600">
            Jan Kowalski / Anna Nowak
          </code>
        </p>
        <p>Separator kolumn: <strong>;</strong> (średnik). Pauza — opcjonalna.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {/* File upload */}
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Wybierz plik .csv
          </label>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.txt"
            onChange={handleFile}
            className="w-full text-xs text-gray-600 dark:text-gray-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-700 dark:file:bg-blue-900/30 dark:file:text-blue-400 hover:file:bg-blue-100 cursor-pointer"
          />
        </div>

        <p className="text-xs text-center text-gray-400 dark:text-gray-500">— lub wklej zawartość —</p>

        {/* Textarea paste */}
        <textarea
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          rows={7}
          placeholder={"Runda;Para 1;Wynik 1;Para 2;Wynik 2;Pauza\n1;Jan Kowalski / Anna Nowak;10;Piotr Wiś / Kasia Marek;11;\n1;Marek Zając / Tomek Koc;15;Sara Bąk / Michał Lis;6;Jan Kowalski"}
          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 resize-y"
        />

        {result?.error && (
          <p className="text-sm text-red-500 dark:text-red-400">{result.error}</p>
        )}
        {result?.success && (
          <p className="text-sm text-green-600 dark:text-green-400 font-medium">
            ✓ Zaimportowano {result.matchCount} meczów · {result.playerCount} graczy
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => { setOpen(false); setResult(null); setCsv(""); }}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:underline"
          >
            Anuluj
          </button>
          <button
            type="submit"
            disabled={!csv.trim() || isPending}
            className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors"
          >
            {isPending ? "Importuję…" : "Importuj"}
          </button>
        </div>
      </form>
    </div>
  );
}
