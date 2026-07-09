import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Loader as Loader2 } from "lucide-react";
import { DESTINATIONS, INTEREST_TAGS, findDestination } from "@/lib/destinations";
import { Dock } from "@/components/tryb/dock";
import { PressBtn } from "@/components/tryb/ui-kit";
import { FadeIn } from "@/components/tryb/motion-primitives";

// Discover Feature 1/2 — "Start a trip here" pre-fills this from an
// optional query param, still fully editable once here.
const searchSchema = z.object({
  destination: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/create")({
  head: () => ({ meta: [{ title: "Create a trip — TRYB" }] }),
  validateSearch: searchSchema,
  component: CreateTrip,
});

function CreateTrip() {
  const navigate = useNavigate();
  const { destination: prefilledDestination } = Route.useSearch();
  const [form, setForm] = useState({
    title: "",
    destination: prefilledDestination ?? "",
    start_date: "",
    end_date: "",
    max_members: 6,
    description: "",
    budget_min: 15000,
    budget_max: 40000,
    budget_flexibility: "flexible" as "flexible" | "strict",
    privacy: "public" as "public" | "private",
    solo_friendly: false,
    vibe_summary: "",
  });
  const [vibes, setVibes] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  function toggleVibe(id: string) {
    setVibes((v) => (v.includes(id) ? v.filter((x) => x !== id) : [...v, id]));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    if (!form.title || !form.destination || !form.start_date || !form.end_date) {
      toast.error("Fill in the basics first");
      return;
    }
    setSaving(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const dest = findDestination(form.destination);
      const cover = dest?.image ?? DESTINATIONS[0].image;
      const { data, error } = await supabase
        .from("trips")
        .insert({
          organizer_id: u.user.id,
          title: form.title,
          destination: dest?.name ?? form.destination,
          country: dest?.country ?? null,
          start_date: form.start_date,
          end_date: form.end_date,
          max_members: form.max_members,
          cover_image: cover,
          description: form.description,
          vibe_tags: vibes,
          budget_min: form.budget_min,
          budget_max: form.budget_max,
          budget_flexibility: form.budget_flexibility,
          privacy: form.privacy,
          solo_friendly: form.solo_friendly,
          vibe_summary: form.vibe_summary.trim() || null,
        })
        .select("id")
        .single();
      if (error) throw error;
      toast.success("Trip created! 🎉");
      navigate({ to: "/trip/$tripId", params: { tripId: data.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't create trip");
    } finally {
      setSaving(false);
    }
  }

  const dest = findDestination(form.destination);

  return (
    <div className="tryb-theme relative mx-auto min-h-screen w-full max-w-[620px] bg-background pb-32 shadow-[0_0_120px_oklch(0.2_0.02_60_/_0.06)] sm:border-x sm:border-border/60">
      <main className="mx-auto max-w-2xl px-5 pb-10 pt-6">
        <Link to="/home" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Back
        </Link>
        <FadeIn>
          <h1 className="display mt-4 text-3xl font-semibold text-foreground">Create a trip</h1>
          <p className="text-sm text-muted-foreground">Rally a tribe around your next adventure.</p>
        </FadeIn>

        {dest && (
          <div className="mt-5 overflow-hidden rounded-3xl shadow-lift">
            <img src={dest.image} alt={dest.name} className="h-44 w-full object-cover" />
          </div>
        )}

        <form onSubmit={submit} className="mt-5 space-y-4">
          <F label="Trip title">
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Sunrise hike at Mount Batur" required />
          </F>
          <F label="Destination">
            <Input
              value={form.destination}
              onChange={(e) => setForm({ ...form, destination: e.target.value })}
              placeholder="Bali, Tokyo, Lisbon…"
              list="destinations"
              required
            />
            <datalist id="destinations">
              {DESTINATIONS.map((d) => (
                <option key={d.slug} value={d.name} />
              ))}
            </datalist>
          </F>
          <div className="grid grid-cols-2 gap-3">
            <F label="Start">
              <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} required />
            </F>
            <F label="End">
              <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} required />
            </F>
          </div>
          <F label={`Max members: ${form.max_members}`}>
            <input
              type="range"
              min={2}
              max={20}
              value={form.max_members}
              onChange={(e) => setForm({ ...form, max_members: Number(e.target.value) })}
              className="w-full accent-primary"
            />
          </F>
          <F label={`This trip's vibe in 3 words (optional) · ${form.vibe_summary.length}/40`}>
            <Input
              value={form.vibe_summary}
              maxLength={40}
              onChange={(e) => setForm({ ...form, vibe_summary: e.target.value })}
              placeholder="Slow mornings, big views"
            />
          </F>
          <F label="Vibe tags">
            <div className="flex flex-wrap gap-2">
              {INTEREST_TAGS.map((t) => {
                const active = vibes.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleVibe(t.id)}
                    className={`rounded-full px-3 py-1.5 text-sm transition ${
                      active ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground"
                    }`}
                  >
                    {t.emoji} {t.label}
                  </button>
                );
              })}
            </div>
          </F>
          <div className="grid grid-cols-2 gap-3">
            <F label="Budget min (₹)">
              <Input type="number" value={form.budget_min} onChange={(e) => setForm({ ...form, budget_min: Number(e.target.value) })} />
            </F>
            <F label="Budget max (₹)">
              <Input type="number" value={form.budget_max} onChange={(e) => setForm({ ...form, budget_max: Number(e.target.value) })} />
            </F>
          </div>
          <F label="Budget flexibility">
            <div className="flex gap-2">
              {(["flexible", "strict"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setForm({ ...form, budget_flexibility: f })}
                  className={`flex-1 rounded-2xl px-4 py-3 text-sm font-medium capitalize transition ${
                    form.budget_flexibility === f ? "bg-primary/10 text-primary" : "border border-border bg-card text-muted-foreground"
                  }`}
                >
                  {f === "flexible" ? "🌊 Flexible" : "🎯 Strict"}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground/70">
              Strict means the budget range is close to final; flexible means there&apos;s room to adjust once the
              group&apos;s set.
            </p>
          </F>
          <F label="Description">
            <textarea
              className="min-h-24 w-full rounded-xl border border-border bg-muted px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="What's the plan? Who's it for?"
            />
          </F>
          <F label="Solo travelers">
            <button
              type="button"
              onClick={() => setForm({ ...form, solo_friendly: !form.solo_friendly })}
              className={`w-full rounded-2xl px-4 py-3 text-left text-sm font-medium transition ${
                form.solo_friendly ? "bg-primary/10 text-primary" : "border border-border bg-card text-muted-foreground"
              }`}
            >
              🧍 Solo friendly {form.solo_friendly ? "— flying solo? come along" : "(off)"}
            </button>
            <p className="mt-1.5 text-[11px] text-muted-foreground/70">
              Solo-friendly just means the organizer&apos;s expecting people traveling alone — you (and they) still
              choose who actually gets approved.
            </p>
          </F>
          <F label="Privacy">
            <div className="flex gap-2">
              {(["public", "private"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setForm({ ...form, privacy: p })}
                  className={`flex-1 rounded-2xl px-4 py-3 text-sm font-medium capitalize transition ${
                    form.privacy === p ? "bg-primary/10 text-primary" : "border border-border bg-card text-muted-foreground"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </F>

          <PressBtn type="submit" variant="primary" size="lg" className="w-full" disabled={saving}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            Launch trip
          </PressBtn>
        </form>
      </main>
      <Dock />
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full rounded-xl border border-border bg-muted px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary"
    />
  );
}
