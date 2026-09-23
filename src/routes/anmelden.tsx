import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageBackground } from "@/components/AppShell";
import { useAuth } from "@/lib/useAuth";

export const Route = createFileRoute("/anmelden")({
  head: () => ({
    meta: [
      { title: "Anmelden — Terma Glossar Studio" },
      {
        name: "description",
        content: "Melde dich an, um deine Glossare und Karteikarten zu verwalten.",
      },
      { property: "og:title", content: "Anmelden — Terma Glossar Studio" },
      {
        property: "og:description",
        content: "Privater Zugang zu deinen Glossaren Deutsch / Rumänisch.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AnmeldenPage,
});

function AnmeldenPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && session) navigate({ to: "/" });
  }, [loading, session, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage("Anmeldung fehlgeschlagen: " + error.message);
      else navigate({ to: "/" });
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) setMessage("Registrierung fehlgeschlagen: " + error.message);
      else if (!data.session) setMessage("Bitte bestätige die E-Mail in deinem Postfach.");
      else navigate({ to: "/" });
    }
    setBusy(false);
  }


  return (
    <PageBackground>
      <div className="relative grid min-h-screen place-items-center px-4 py-10">
        <div className="glass w-full max-w-sm rounded-3xl p-6">
          <div className="flex items-center gap-2.5">
            <div className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-primary to-accent font-display text-sm font-semibold text-primary-foreground">
              TL
            </div>
            <div>
              <p className="font-display text-sm font-semibold leading-none">Terma</p>
              <p className="mt-1 text-[11px] text-muted-foreground">Glossar Studio</p>
            </div>
          </div>

          <h1 className="mt-6 font-display text-2xl font-semibold tracking-tight">
            {mode === "login" ? "Anmelden" : "Konto erstellen"}
          </h1>

          <form onSubmit={submit} className="mt-5 space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground" htmlFor="email">
                E-Mail
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="field mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground" htmlFor="pw">
                Passwort
              </label>
              <input
                id="pw"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="field mt-1"
              />
            </div>
            <button type="submit" disabled={busy} className="btn-primary w-full">
              {mode === "login" ? "Anmelden" : "Registrieren"}
            </button>
          </form>

  {message && <p className="mt-3 text-xs text-muted-foreground">{message}</p>}

          <button
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="mt-4 text-xs font-medium text-primary hover:underline"
          >
            {mode === "login" ? "Noch kein Konto? Registrieren" : "Schon registriert? Anmelden"}
          </button>
        </div>
      </div>
    </PageBackground>
  );
}
