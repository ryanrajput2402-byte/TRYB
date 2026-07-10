import { Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles } from "lucide-react";

// Fix 2 (post-Phase-2 review) — replaces the "You + 0.01%" framing, which
// required decoding a metaphor before knowing what a Project even is. This
// says what it is in one plain sentence. Links to the real Projects page
// (list + creation form + founder's note), not a stub.
export function ProjectsEntryCard() {
  return (
    <Link
      to="/projects"
      className="warm-card shadow-warm group block rounded-3xl p-6 transition hover:-translate-y-0.5 sm:p-7"
    >
      <div className="bg-pine/15 grid h-10 w-10 place-items-center rounded-full">
        <Sparkles className="text-pine h-4.5 w-4.5" />
      </div>
      <h2 className="fomo-heading text-ink mt-3 text-xl font-bold sm:text-2xl">TRYB's Projects</h2>
      <p className="mt-1.5 max-w-md text-sm text-ink/60">
        Real community projects — started by people here, open for anyone to join or support.
      </p>
      <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">
        Browse Projects <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
