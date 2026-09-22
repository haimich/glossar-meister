import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/useAuth";

function Backdrop() {
  return (
    <>
      <div className="pointer-events-none absolute -left-24 -top-32 h-96 w-96 rounded-full bg-primary/25 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-1/4 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 left-1/3 h-96 w-96 rounded-full bg-primary/15 blur-3xl" />
    </>
  );
}

export function PageBackground({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background font-sans text-foreground">
      <Backdrop />
      {children}
    </div>
  );
}

const nav = [
  { to: "/", label: "Glossare" },
  { to: "/lernen", label: "Lernen" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/anmelden" });
  }, [loading, session, navigate]);

  if (loading || !session) {
    return (
      <PageBackground>
        <div className="relative grid min-h-screen place-items-center text-sm text-muted-foreground">
          Wird geladen …
        </div>
      </PageBackground>
    );
  }

  return (
    <PageBackground>
      <div className="relative mx-auto flex max-w-[1400px] gap-5 px-4 py-5 sm:px-5 sm:py-6">
        <header className="glass mb-4 flex items-center justify-between rounded-2xl px-4 py-2.5 md:hidden">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-primary to-accent font-display text-xs font-semibold text-primary-foreground">
              TL
            </span>
            <span className="font-display text-sm font-semibold">Terma</span>
          </Link>
          <nav className="flex items-center gap-1.5">
            {nav.map((item) => {
              const active =
                item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={
                    active
                      ? "rounded-lg bg-card/70 px-3 py-1.5 text-xs font-semibold text-primary ring-1 ring-black/5"
                      : "rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground"
                  }
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </header>
        <aside className="glass sticky top-6 hidden h-[calc(100vh-3rem)] w-60 shrink-0 flex-col rounded-3xl p-5 md:flex">
          <div className="flex items-center gap-2.5">
            <div className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-primary to-accent font-display text-sm font-semibold text-primary-foreground">
              TL
            </div>
            <div>
              <p className="font-display text-sm font-semibold leading-none">Terma</p>
              <p className="mt-1 text-[11px] text-muted-foreground">Glossar Studio</p>
            </div>
          </div>
          <nav className="mt-7 flex flex-col gap-1">
            {nav.map((item) => {
              const active =
                item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={
                    active
                      ? "flex items-center gap-3 rounded-xl bg-card/70 px-3 py-2.5 text-sm font-semibold text-primary shadow-sm ring-1 ring-black/5"
                      : "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground"
                  }
                >
                  <span
                    className={
                      active
                        ? "size-1.5 rounded-full bg-primary"
                        : "size-1.5 rounded-full bg-muted-foreground/50"
                    }
                  />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 p-3.5 ring-1 ring-primary/10">
            <p className="font-display text-xs font-semibold">Angemeldet</p>
            <p className="mt-1 truncate text-[11px] leading-snug text-muted-foreground">
              {session.user.email}
            </p>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/anmelden" });
              }}
              className="mt-2 text-[11px] font-medium text-primary hover:underline"
            >
              Abmelden
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </PageBackground>
  );
}
