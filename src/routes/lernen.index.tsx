import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/lernen/")({
  head: () => ({
    meta: [
      { title: "Lernen — Terma Glossar Studio" },
      {
        name: "description",
        content: "Wähle ein Glossar und lerne deine Begriffe im Karteikartenmodus.",
      },
      { property: "og:title", content: "Lernen — Terma Glossar Studio" },
      {
        property: "og:description",
        content: "Karteikarten Deutsch / Rumänisch, auch unterwegs.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LernenIndex,
});

function LernenIndex() {
  const { data: glossaries = [], isLoading } = useQuery({
    queryKey: ["glossaries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("glossaries")
        .select("id, name, subject, terms(count)")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as unknown as {
        id: string;
        name: string;
        subject: string | null;
        terms: { count: number }[];
      }[];
    },
  });

  return (
    <AppShell>
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Karteikarten
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">Lernen</h1>
      </header>

      {isLoading ? (
        <p className="mt-6 text-sm text-muted-foreground">Wird geladen …</p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {glossaries.map((g) => (
            <Link
              key={g.id}
              to="/lernen/$id"
              params={{ id: g.id }}
              className="glass rounded-3xl p-5 transition-colors hover:text-primary"
            >
              <p className="font-display text-lg font-semibold">{g.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {g.terms?.[0]?.count ?? 0} Begriffe · DE / RO
              </p>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
