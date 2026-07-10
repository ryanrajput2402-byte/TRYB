import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/top-bar";
import { BottomNav } from "@/components/bottom-nav";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAppTheme } from "@/lib/theme-context";
import { DEFAULT_SEASON_THEME, seasonThemeClassName } from "@/lib/seasonal-themes";
import { formatMemberSince } from "@/lib/format-date";
import { Plus, Sparkles } from "lucide-react";

type ProjectRow = {
  id: string;
  creator_id: string;
  title: string;
  face_image: string;
  images: string[];
  description: string;
  what_solving: string;
  needs: string;
  how_to_contribute: string;
  created_at: string;
  creator?: { full_name: string; avatar_url: string | null } | null;
};

export const Route = createFileRoute("/_authenticated/projects")({
  head: () => ({ meta: [{ title: "Projects — TRYB" }] }),
  component: ProjectsPage,
});

function ProjectsPage() {
  const { preference: themePreference } = useAppTheme();
  const themeClassName = seasonThemeClassName(themePreference ?? DEFAULT_SEASON_THEME);

  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openProject, setOpenProject] = useState<ProjectRow | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: rows } = await supabase.from("projects").select("*").order("created_at", { ascending: false });
      const creatorIds = Array.from(new Set((rows ?? []).map((r: any) => r.creator_id)));
      const { data: creators } = creatorIds.length
        ? await supabase.from("profiles").select("id, full_name, avatar_url").in("id", creatorIds)
        : { data: [] as any[] };
      const byId = new Map((creators ?? []).map((c: any) => [c.id, c]));
      if (!cancelled) {
        setProjects((rows ?? []).map((r: any) => ({ ...r, creator: byId.get(r.creator_id) ?? null })));
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className={`${themeClassName} relative min-h-screen`}>
      <div className="warm-aurora" aria-hidden />
      <div className="fomo-grain" aria-hidden />
      <div className="relative" style={{ zIndex: 2 }}>
        <TopBar />
        <main className="mx-auto max-w-3xl px-4 pb-10 pt-3 sm:px-6">
          <h1 className="fomo-heading text-ink text-3xl font-bold">TRYB's Projects</h1>
          <p className="text-sm text-ink/60">Real community projects — started by people here, open for anyone to join or support.</p>

          <Link
            to="/projects/new"
            className="bg-primary text-cream mt-5 flex items-center justify-center gap-2 rounded-full py-3.5 text-center font-semibold"
          >
            <Plus className="h-4 w-4" /> Start a Project
          </Link>

          <section className="mt-8">
            {loading ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="skeleton-fomo aspect-square rounded-3xl" />
                ))}
              </div>
            ) : projects.length === 0 ? (
              <div className="warm-card rounded-2xl p-6 text-center text-sm text-ink/50">
                No Projects yet — be the first to start one.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {projects.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setOpenProject(p)}
                    className="warm-card shadow-warm group rounded-3xl p-4 text-left transition hover:-translate-y-0.5"
                  >
                    <img src={p.face_image} alt={p.title} className="h-14 w-14 rounded-full object-cover" />
                    <p className="fomo-heading mt-3 text-sm font-bold text-ink">{p.title}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-ink/55">{p.what_solving}</p>
                  </button>
                ))}
              </div>
            )}
          </section>

          <FounderNote />
        </main>
        <BottomNav />
      </div>

      <Dialog open={!!openProject} onOpenChange={(open) => !open && setOpenProject(null)}>
        <DialogContent className={`${themeClassName} border-ink/10 bg-sand max-h-[85vh] overflow-y-auto sm:rounded-3xl`}>
          {openProject && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <img src={openProject.face_image} alt={openProject.title} className="h-14 w-14 rounded-full object-cover" />
                  <div>
                    <DialogTitle className="fomo-heading text-ink text-lg">{openProject.title}</DialogTitle>
                    <p className="text-xs text-ink/50">
                      Started by {openProject.creator?.full_name ?? "someone"} · {formatMemberSince(openProject.created_at)}
                    </p>
                  </div>
                </div>
              </DialogHeader>

              {openProject.images.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {openProject.images.map((img) => (
                    <img key={img} src={img} alt="" className="h-24 w-24 flex-shrink-0 rounded-2xl object-cover" />
                  ))}
                </div>
              )}

              {openProject.description && (
                <p className="text-sm text-ink/70">{openProject.description}</p>
              )}

              <ProjectDetailBlock label="What it's solving" text={openProject.what_solving} />
              <ProjectDetailBlock label="What it needs" text={openProject.needs} />
              <ProjectDetailBlock label="How to contribute" text={openProject.how_to_contribute} />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProjectDetailBlock({ label, text }: { label: string; text: string }) {
  if (!text) return null;
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-ink/40">{label}</p>
      <p className="mt-1 text-sm text-ink/70">{text}</p>
    </div>
  );
}

// Fix 2 — a permanent, distinctly-styled founder's note (not a system
// message). Framing approved verbatim: early, still growing, an open
// invitation to start rather than wait.
function FounderNote() {
  return (
    <div className="relative mt-10 overflow-hidden rounded-3xl p-6 sm:p-7" style={{ background: "var(--gradient-earth-soft)" }}>
      <div className="bg-cream/90 rounded-[20px] p-5 backdrop-blur-xl sm:p-6">
        <div className="flex items-center gap-2 text-ink/50">
          <Sparkles className="h-3.5 w-3.5" />
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em]">A note from the founder</p>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-ink/75">
          Projects is brand new, and it's still growing — that's on purpose. I'd rather get it in front of
          real people now and build the rest of the tooling around it — better ways to update, verify, and
          support a project — while it's actually being used, than wait for it to feel finished.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-ink/75">
          So don't wait for permission. If there's something worth starting, however small, start it. I'm
          heads-down on making this platform better for contributing to projects like yours — the best thing
          you can do right now is be one of the first.
        </p>
        <p className="mt-4 text-sm font-semibold text-ink">— Ryan</p>
      </div>
    </div>
  );
}
