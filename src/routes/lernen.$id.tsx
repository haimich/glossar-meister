import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageBackground } from "@/components/AppShell";
import { useAuth } from "@/lib/useAuth";
import { intervalLabel, nextSchedule, type Direction } from "@/lib/learning";

export const Route = createFileRoute("/lernen/$id")({
  head: () => ({
    meta: [
      { title: "Lernmodus — Terma Glossar Studio" },
      {
        name: "description",
        content:
          "Karteikarten Deutsch / Rumänisch mit Notizen, Richtungswechsel und einfacher Wiederholungslogik.",
      },
      { property: "og:title", content: "Lernmodus — Terma Glossar Studio" },
      {
        property: "og:description",
        content: "Begriffe unterwegs lernen, auch offline.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LernModus,
});

type Card = {
  id: string;
  de: string;
  ro: string;
  notes: string;
  progress: Record<Direction, { level: number; due_at: string }>;
};

type QueueItem = {
  term_id: string;
  user_id: string;
  direction: Direction;
  level: number;
  due_at: string;
};

const cacheKey = (id: string) => `terma:cards:${id}`;
const QUEUE_KEY = "terma:queue";

function readQueue(): QueueItem[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]") as QueueItem[];
  } catch {
    return [];
  }
}

async function flushQueue() {
  const queue = readQueue();
  if (queue.length === 0) return;
  const { error } = await supabase
    .from("card_progress")
    .upsert(queue, { onConflict: "term_id,direction" });
  if (!error) localStorage.removeItem(QUEUE_KEY);
}

function LernModus() {
  const { id } = Route.useParams();
  const { user, loading: authLoading } = useAuth();
  const [glossaryName, setGlossaryName] = useState("");
  const [cards, setCards] = useState<Card[] | null>(null);
  const [direction, setDirection] = useState<Direction>("de_ro");
  const [revealed, setRevealed] = useState(false);
  const [index, setIndex] = useState(0);
  const [offline, setOffline] = useState(false);
  const [done, setDone] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        await flushQueue();
        const [g, t, p] = await Promise.all([
          supabase.from("glossaries").select("name").eq("id", id).single(),
          supabase
            .from("terms")
            .select("id, de, ro, notes")
            .eq("glossary_id", id)
            .order("de", { ascending: true }),
          supabase.from("card_progress").select("term_id, direction, level, due_at"),
        ]);
        if (t.error) throw t.error;
        const progressByTerm = new Map<string, Record<string, { level: number; due_at: string }>>();
        for (const row of p.data ?? []) {
          const entry = progressByTerm.get(row.term_id) ?? {};
          entry[row.direction] = { level: row.level, due_at: row.due_at };
          progressByTerm.set(row.term_id, entry);
        }
        const built: Card[] = (t.data ?? []).map((term) => ({
          ...term,
          progress: {
            de_ro: progressByTerm.get(term.id)?.["de_ro"] ?? {
              level: 0,
              due_at: new Date(0).toISOString(),
            },
            ro_de: progressByTerm.get(term.id)?.["ro_de"] ?? {
              level: 0,
              due_at: new Date(0).toISOString(),
            },
          },
        }));
        if (cancelled) return;
        setGlossaryName(g.data?.name ?? "");
        setCards(built);
        setOffline(false);
        localStorage.setItem(
          cacheKey(id),
          JSON.stringify({ name: g.data?.name ?? "", cards: built }),
        );
      } catch {
        const cached = localStorage.getItem(cacheKey(id));
        if (cached && !cancelled) {
          const parsed = JSON.parse(cached) as { name: string; cards: Card[] };
          setGlossaryName(parsed.name);
          setCards(parsed.cards);
        } else if (!cancelled) {
          setCards([]);
        }
        if (!cancelled) setOffline(true);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const queue = useMemo(() => {
    if (!cards) return [];
    const now = Date.now();
    const due = cards.filter((c) => new Date(c.progress[direction].due_at).getTime() <= now);
    return due.sort(
      (a, b) =>
        a.progress[direction].level - b.progress[direction].level ||
        new Date(a.progress[direction].due_at).getTime() -
          new Date(b.progress[direction].due_at).getTime(),
    );
  }, [cards, direction]);

  const card = queue[index];

  useEffect(() => {
    setIndex(0);
    setRevealed(false);
    setDone(0);
  }, [direction]);

  async function rate(known: boolean) {
    if (!card || !user) return;
    const current = card.progress[direction];
    const { level, dueAt } = nextSchedule(current.level, known);
    const payload: QueueItem = {
      term_id: card.id,
      user_id: user.id,
      direction,
      level,
      due_at: dueAt,
    };

    setCards((prev) =>
      (prev ?? []).map((c) =>
        c.id === card.id
          ? { ...c, progress: { ...c.progress, [direction]: { level, due_at: dueAt } } }
          : c,
      ),
    );
    setRevealed(false);
    setIndex((i) => i + 1);
    setDone((d) => d + 1);

    const { error } = await supabase
      .from("card_progress")
      .upsert(payload, { onConflict: "term_id,direction" });
    if (error) {
      localStorage.setItem(QUEUE_KEY, JSON.stringify([...readQueue(), payload]));
      setOffline(true);
    }
  }

  const total = queue.length + done;
  const front = card ? (direction === "de_ro" ? card.de : card.ro) : "";
  const back = card ? (direction === "de_ro" ? card.ro : card.de) : "";

  // Lange Begriffe (z. B. „Abwasseraufbereitung") kleiner darstellen,
  // damit sie nicht aus der Karte herausragen.
  const sizeClass = (text: string) => {
    if (text.length > 16) return "text-3xl sm:text-4xl";
    if (text.length > 10) return "text-4xl sm:text-5xl";
    return "text-5xl sm:text-6xl";
  };

  return (
    <PageBackground>
      <div className="relative mx-auto flex min-h-screen max-w-xl flex-col px-4 py-5">
        <header className="flex items-center justify-between gap-3">
          <Link to="/" className="text-xs font-medium text-muted-foreground hover:text-primary">
            ← Glossare
          </Link>
          <div className="glass-soft inline-flex rounded-xl p-1">
            {(["de_ro", "ro_de"] as Direction[]).map((d) => (
              <button
                key={d}
                onClick={() => setDirection(d)}
                aria-label={d === "de_ro" ? "Deutsch nach Rumänisch" : "Rumänisch nach Deutsch"}
                className={
                  direction === d
                    ? "rounded-lg bg-card/80 px-3 py-1.5 text-xs font-semibold text-primary shadow-sm ring-1 ring-black/5"
                    : "rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground"
                }
              >
                {d === "de_ro" ? "DE → RO" : "RO → DE"}
              </button>
            ))}
          </div>
        </header>

        <div className="mt-4 flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <span className="size-2 rounded-full bg-accent" />
          Lernmodus · {glossaryName}
          {offline && <span className="ml-auto">Offline-Modus</span>}
        </div>

        <div className="mt-3 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-card/60">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-[width]"
              style={{ width: total === 0 ? "0%" : `${(done / total) * 100}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-muted-foreground">
            {done} / {total}
          </span>
        </div>

        {authLoading || cards === null ? (
          <p className="mt-10 text-sm text-muted-foreground">Wird geladen …</p>
        ) : !card ? (
          <section className="glass mt-6 rounded-3xl p-8 text-center">
            <p className="font-display text-lg font-semibold">Alles wiederholt</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {cards.length === 0
                ? "Dieses Glossar enthält noch keine Begriffe."
                : "Für diese Richtung ist aktuell keine Karte fällig."}
            </p>
            <Link to="/glossar/$id" params={{ id }} className="btn-ghost mt-5 inline-block">
              Begriffe bearbeiten
            </Link>
          </section>
        ) : (
          <>
            <section className="glass-soft mt-5 flex min-h-[24rem] flex-1 flex-col items-center justify-center rounded-3xl p-6 text-center sm:min-h-[30rem]">
              <div className="w-full">
                <p className="text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">
                  {direction === "de_ro" ? "Deutsch" : "Rumänisch"}
                </p>
                <p
                  className={`mt-3 hyphens-auto font-display font-semibold leading-tight [overflow-wrap:anywhere] ${sizeClass(front)}`}
                >
                  {front}
                </p>

                {!revealed ? (
                  <button
                    onClick={() => setRevealed(true)}
                    className="mt-8 inline-flex items-center gap-2 rounded-xl bg-card/80 px-4 py-2 text-sm font-medium text-primary shadow-sm ring-1 ring-primary/10"
                  >
                    Karte anzeigen
                  </button>
                ) : (
                  <>
                    <div className="mx-auto my-7 max-w-sm border-t border-dashed border-foreground/10" />
                    <p className="text-xs font-medium uppercase tracking-[0.15em] text-accent">
                      {direction === "de_ro" ? "Rumänisch" : "Deutsch"}
                    </p>
                    <p
                      className={`mt-3 hyphens-auto font-display font-semibold leading-tight [overflow-wrap:anywhere] ${sizeClass(back)}`}
                    >
                      {back}
                    </p>
                    {card.notes && (
                      <div className="mx-auto mt-6 max-w-md rounded-xl bg-primary/5 p-3.5 ring-1 ring-primary/10">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                          Notizen
                        </p>
                        <p className="mt-1 text-base leading-relaxed text-foreground/80">
                          {card.notes}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </section>

            <div className="mt-4 flex items-center gap-3">
              <button
                aria-label="Nicht gewusst"
                disabled={!revealed}
                onClick={() => rate(false)}
                className="grid flex-1 place-items-center rounded-2xl bg-destructive/10 py-4 text-destructive ring-1 ring-destructive/20 disabled:opacity-40"
              >
                <ThumbsDown className="size-6" aria-hidden="true" />
              </button>
              <button
                aria-label="Gewusst"
                disabled={!revealed}
                onClick={() => rate(true)}
                className="grid flex-[1.6] place-items-center rounded-2xl bg-gradient-to-r from-primary to-accent py-4 text-primary-foreground shadow-lg shadow-primary/25 disabled:opacity-40"
              >
                <ThumbsUp className="size-6" aria-hidden="true" />
              </button>
            </div>
            <div className="mt-3 flex items-center justify-between pb-4 text-[11px] text-muted-foreground">
              <span>Nächste Wiederholung: {intervalLabel(card.progress[direction].level + 1)}</span>
              <span className="font-medium text-primary">
                Stufe {card.progress[direction].level}
              </span>
            </div>
          </>
        )}
      </div>
    </PageBackground>
  );
}
