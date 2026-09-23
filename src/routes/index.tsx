import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { parseCsv } from "@/lib/csv";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Glossare — Terma Glossar Studio" },
      {
        name: "description",
        content:
          "Glossare pro Kunde verwalten, Begriffe per CSV importieren und Deutsch / Rumänisch lernen.",
      },
      { property: "og:title", content: "Glossare — Terma Glossar Studio" },
      {
        property: "og:description",
        content: "Deine Kundenglossare Deutsch / Rumänisch an einem Ort.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GlossarePage,
});

type GlossaryRow = {
  id: string;
  name: string;
  subject: string | null;
  terms: { count: number }[];
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function GlossarePage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [showNew, setShowNew] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [name, setName] = useState("");
  const [importTarget, setImportTarget] = useState("");
  const [importInfo, setImportInfo] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: glossaries = [], isLoading } = useQuery({
    queryKey: ["glossaries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("glossaries")
        .select("id, name, subject, terms(count)")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as unknown as GlossaryRow[];
    },
  });

  const createGlossary = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Nicht angemeldet");
      const { error } = await supabase
        .from("glossaries")
        .insert({ name, subject: null, user_id: uid });
      if (error) throw error;
    },
    onSuccess: () => {
      setName("");
      setShowNew(false);
      qc.invalidateQueries({ queryKey: ["glossaries"] });
    },
  });

  async function handleImport(file: File) {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid || !importTarget) return;
    const rows = parseCsv(await file.text());
    if (rows.length === 0) {
      setImportInfo("Keine gültigen Zeilen gefunden.");
      return;
    }
    const { error } = await supabase.from("terms").insert(
      rows.map((r) => ({
        glossary_id: importTarget,
        user_id: uid,
        de: r.de,
        ro: r.ro,
        notes: r.notes,
      })),
    );
    if (error) {
      setImportInfo("Import fehlgeschlagen: " + error.message);
      return;
    }
    setImportInfo(`${rows.length} Begriffe importiert.`);
    qc.invalidateQueries({ queryKey: ["glossaries"] });
  }

  return (
    <AppShell>
      <header className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Kundenbereich
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">Glossare</h1>
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:flex sm:items-center">
          <button
            className="btn-ghost min-w-0 px-3"
            onClick={() => {
              setShowImport((v) => !v);
              setShowNew(false);
            }}
          >
            CSV importieren
          </button>
          <button
            className="btn-primary min-w-0 px-3"
            onClick={() => {
              setShowNew((v) => !v);
              setShowImport(false);
            }}
          >
            + Neues Glossar
          </button>
        </div>
      </header>

      {showNew && (
        <section className="glass mt-5 rounded-3xl p-5">
          <h2 className="font-display text-lg font-semibold">Neues Glossar</h2>
          <div className="mt-3 max-w-xl">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Kunde</label>
              <input
                className="field mt-1"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="z. B. MedSana Kliniken"
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2.5">
            <button
              className="btn-primary"
              disabled={!name.trim() || createGlossary.isPending}
              onClick={() => createGlossary.mutate()}
            >
              Speichern
            </button>
            <button className="btn-ghost" onClick={() => setShowNew(false)}>
              Abbrechen
            </button>
          </div>
        </section>
      )}

      {showImport && (
        <section className="glass mt-5 rounded-3xl p-5">
          <h2 className="font-display text-lg font-semibold">CSV importieren</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Spalten: Deutsch, Rumänisch, Notizen. Trennzeichen Komma, Semikolon oder Tabulator.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Glossar</label>
              <select
                className="field mt-1"
                value={importTarget}
                onChange={(e) => setImportTarget(e.target.value)}
              >
                <option value="">Bitte wählen</option>
                {glossaries.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">CSV-Datei</label>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv,text/plain"
                className="field mt-1"
                disabled={!importTarget}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleImport(f);
                }}
              />
            </div>
          </div>
          {importInfo && <p className="mt-3 text-xs text-muted-foreground">{importInfo}</p>}
        </section>
      )}

      {isLoading ? (
        <p className="mt-6 text-sm text-muted-foreground">Wird geladen …</p>
      ) : glossaries.length === 0 ? (
        <section className="glass mt-6 rounded-3xl p-8 text-center">
          <p className="font-display text-lg font-semibold">Noch keine Glossare</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Lege ein Glossar pro Kunde an und importiere anschließend deine Begriffe.
          </p>
        </section>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {glossaries.map((g) => (
            <div key={g.id} className="glass min-w-0 rounded-3xl p-5">
              <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3">
                <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary to-accent font-display text-sm font-semibold text-primary-foreground">
                  {initials(g.name)}
                </div>
                <span className="min-w-0 justify-self-end rounded-full bg-card/70 px-2.5 py-1 text-[11px] font-medium text-muted-foreground ring-1 ring-black/5">
                  {g.terms?.[0]?.count ?? 0} Begriffe
                </span>
              </div>
              <Link
                to="/glossar/$id"
                params={{ id: g.id }}
                className="mt-4 block break-words font-display text-lg font-semibold hover:text-primary"
              >
                {g.name}
              </Link>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {g.subject ? `${g.subject} · DE / RO` : "DE / RO"}
              </p>
              <div className="mt-4 flex gap-2">
                <button
                  className="flex-1 rounded-xl bg-foreground/5 px-3 py-2 text-sm font-medium hover:bg-foreground/10"
                  onClick={() => navigate({ to: "/glossar/$id", params: { id: g.id } })}
                >
                  Begriffe
                </button>
                <button
                  className="flex-1 rounded-xl bg-primary/10 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/15"
                  onClick={() => navigate({ to: "/lernen/$id", params: { id: g.id } })}
                >
                  Lernen
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
