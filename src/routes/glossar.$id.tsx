import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { parseCsv } from "@/lib/csv";

export const Route = createFileRoute("/glossar/$id")({
  head: () => ({
    meta: [
      { title: "Begriffe — Terma Glossar Studio" },
      {
        name: "description",
        content: "Begriffe eines Glossars bearbeiten, ergänzen und per CSV importieren.",
      },
      { property: "og:title", content: "Begriffe — Terma Glossar Studio" },
      {
        property: "og:description",
        content: "Begriffstabelle Deutsch / Rumänisch mit Notizen.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GlossarDetail,
});

type Term = { id: string; de: string; ro: string; notes: string };
type Direction = "de_ro" | "ro_de";
type ProgressRow = { term_id: string; direction: Direction; level: number };

function GlossarDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Term | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Term | null>(null);
  const [newTerm, setNewTerm] = useState({ de: "", ro: "", notes: "" });
  const [importInfo, setImportInfo] = useState<string | null>(null);

  const { data: glossary } = useQuery({
    queryKey: ["glossary", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("glossaries")
        .select("id, name, subject")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: terms = [], isLoading } = useQuery({
    queryKey: ["terms", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("terms")
        .select("id, de, ro, notes")
        .eq("glossary_id", id)
        .order("de", { ascending: true });
      if (error) throw error;
      return data as Term[];
    },
  });

  const { data: progress = [] } = useQuery({
    queryKey: ["progress", id],
    enabled: terms.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("card_progress")
        .select("term_id, direction, level, terms!inner(glossary_id)")
        .eq("terms.glossary_id", id);
      if (error) throw error;
      return data as unknown as ProgressRow[];
    },
  });

  const levelsByTerm = new Map<string, Partial<Record<Direction, number>>>();
  for (const p of progress) {
    const entry = levelsByTerm.get(p.term_id) ?? {};
    entry[p.direction] = p.level;
    levelsByTerm.set(p.term_id, entry);
  }

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["terms", id] });
    qc.invalidateQueries({ queryKey: ["progress", id] });
    qc.invalidateQueries({ queryKey: ["glossaries"] });
  };

  const saveTerm = useMutation({
    mutationFn: async (t: Term) => {
      const { error } = await supabase
        .from("terms")
        .update({ de: t.de, ro: t.ro, notes: t.notes })
        .eq("id", t.id);
      if (error) throw error;
    },
    onSuccess: () => {
      setEditing(null);
      setDraft(null);
      invalidate();
    },
  });

  const deleteTerm = useMutation({
    mutationFn: async (termId: string) => {
      const { error } = await supabase.from("terms").delete().eq("id", termId);
      if (error) throw error;
    },
    onSuccess: () => {
      setPendingDelete(null);
      invalidate();
    },
  });

  const addTerm = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Nicht angemeldet");
      const { error } = await supabase
        .from("terms")
        .insert({ glossary_id: id, user_id: uid, ...newTerm });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewTerm({ de: "", ro: "", notes: "" });
      invalidate();
    },
  });

  async function handleImport(file: File) {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) return;
    const rows = parseCsv(await file.text());
    if (rows.length === 0) {
      setImportInfo("Keine gültigen Zeilen gefunden.");
      return;
    }
    const { error } = await supabase
      .from("terms")
      .insert(rows.map((r) => ({ glossary_id: id, user_id: uid, ...r })));
    setImportInfo(
      error ? "Import fehlgeschlagen: " + error.message : `${rows.length} Begriffe importiert.`,
    );
    invalidate();
  }

  return (
    <AppShell>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {glossary?.subject ? `${glossary.subject} · DE / RO` : "Glossar · DE / RO"}
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
            {glossary?.name ?? "Glossar"}
          </h1>
        </div>
        <div className="flex items-center gap-2.5">
          <label className="btn-ghost cursor-pointer">
            CSV importieren
            <input
              type="file"
              accept=".csv,text/csv,text/plain"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleImport(f);
              }}
            />
          </label>
          <Link to="/lernen/$id" params={{ id }} className="btn-primary">
            Lernen
          </Link>
        </div>
      </header>

      {importInfo && <p className="mt-3 text-xs text-muted-foreground">{importInfo}</p>}

      <section className="glass mt-6 rounded-3xl p-5">
        <h2 className="font-display text-lg font-semibold">Neuer Begriff</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <input
            className="field"
            placeholder="Deutsch"
            value={newTerm.de}
            onChange={(e) => setNewTerm({ ...newTerm, de: e.target.value })}
          />
          <input
            className="field"
            placeholder="Rumänisch"
            value={newTerm.ro}
            onChange={(e) => setNewTerm({ ...newTerm, ro: e.target.value })}
          />
          <input
            className="field"
            placeholder="Notizen"
            value={newTerm.notes}
            onChange={(e) => setNewTerm({ ...newTerm, notes: e.target.value })}
          />
        </div>
        <button
          className="btn-primary mt-3"
          disabled={!newTerm.de.trim() || !newTerm.ro.trim() || addTerm.isPending}
          onClick={() => addTerm.mutate()}
        >
          Speichern
        </button>
      </section>

      <section className="glass mt-5 overflow-hidden rounded-3xl">
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-3.5">
          <h2 className="font-display text-lg font-semibold">Begriffe</h2>
          <span className="text-xs text-muted-foreground">{terms.length} Einträge</span>
        </div>

        {isLoading ? (
          <p className="px-5 py-6 text-sm text-muted-foreground">Wird geladen …</p>
        ) : terms.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted-foreground">
            Noch keine Begriffe. Importiere eine CSV-Datei oder lege oben einen Begriff an.
          </p>
        ) : (
          <div className="divide-y divide-border/60">
            <div className="hidden grid-cols-12 gap-3 px-5 py-2.5 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground sm:grid">
              <span className="col-span-3">Deutsch</span>
              <span className="col-span-3">Rumänisch</span>
              <span className="col-span-4">Notizen</span>
              <span className="col-span-2 text-right">Aktionen</span>
            </div>
            {terms.map((t) =>
              editing === t.id && draft ? (
                <div key={t.id} className="grid grid-cols-1 gap-3 px-5 py-3 sm:grid-cols-12">
                  <input
                    className="field sm:col-span-3"
                    value={draft.de}
                    onChange={(e) => setDraft({ ...draft, de: e.target.value })}
                  />
                  <input
                    className="field sm:col-span-3"
                    value={draft.ro}
                    onChange={(e) => setDraft({ ...draft, ro: e.target.value })}
                  />
                  <input
                    className="field sm:col-span-4"
                    value={draft.notes}
                    onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                  />
                  <div className="flex justify-end gap-2 sm:col-span-2">
                    <button
                      className="text-xs font-semibold text-primary hover:underline"
                      onClick={() => saveTerm.mutate(draft)}
                    >
                      Speichern
                    </button>
                    <button
                      className="text-xs font-medium text-muted-foreground hover:underline"
                      onClick={() => {
                        setEditing(null);
                        setDraft(null);
                      }}
                    >
                      Abbrechen
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  key={t.id}
                  className="grid grid-cols-1 gap-1 px-5 py-3 transition-colors hover:bg-card/40 sm:grid-cols-12 sm:items-center sm:gap-3"
                >
                  <p className="font-display text-[15px] font-semibold sm:col-span-3">{t.de}</p>
                  <p className="text-sm sm:col-span-3">{t.ro}</p>
                  <p className="text-sm text-muted-foreground sm:col-span-4">{t.notes}</p>
                  <div className="mt-1 flex gap-3 sm:col-span-2 sm:mt-0 sm:justify-end">
                    <button
                      className="text-xs font-medium text-primary hover:underline"
                      onClick={() => {
                        setEditing(t.id);
                        setDraft(t);
                      }}
                    >
                      Bearbeiten
                    </button>
                    <button
                      className="text-xs font-medium text-destructive hover:underline"
                      onClick={() => setPendingDelete(t)}
                    >
                      Löschen
                    </button>
                  </div>
                </div>
              ),
            )}
          </div>
        )}
      </section>

      {pendingDelete && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-foreground/20 px-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setPendingDelete(null);
          }}
        >
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-title"
            aria-describedby="delete-description"
            className="glass w-full max-w-md rounded-2xl p-5 shadow-xl"
          >
            <h2 id="delete-title" className="font-display text-lg font-semibold">
              Begriff löschen?
            </h2>
            <p id="delete-description" className="mt-2 text-sm leading-relaxed text-muted-foreground">
              „{pendingDelete.de}“ wird dauerhaft aus diesem Glossar gelöscht.
            </p>
            <div className="mt-5 flex justify-end gap-2.5">
              <button className="btn-ghost" onClick={() => setPendingDelete(null)}>
                Abbrechen
              </button>
              <button
                className="rounded-xl bg-destructive px-4 py-2.5 text-sm font-semibold text-destructive-foreground disabled:opacity-55"
                disabled={deleteTerm.isPending}
                onClick={() => deleteTerm.mutate(pendingDelete.id)}
              >
                Löschen
              </button>
            </div>
          </section>
        </div>
      )}
    </AppShell>
  );
}
