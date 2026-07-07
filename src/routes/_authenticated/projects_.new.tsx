import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/top-bar";
import { BottomNav } from "@/components/bottom-nav";
import { toast } from "sonner";
import { ArrowLeft, Camera, Loader as Loader2, Plus, X } from "lucide-react";
import { uploadImage } from "@/lib/upload-image";
import { useAppTheme } from "@/lib/theme-context";
import { DEFAULT_SEASON_THEME, seasonThemeClassName } from "@/lib/seasonal-themes";

const MAX_SUPPORTING_IMAGES = 5;

export const Route = createFileRoute("/_authenticated/projects_/new")({
  head: () => ({ meta: [{ title: "Start a Project — TRYB" }] }),
  component: NewProject,
});

function NewProject() {
  const navigate = useNavigate();
  const { preference: themePreference } = useAppTheme();
  const themeClassName = seasonThemeClassName(themePreference ?? DEFAULT_SEASON_THEME);

  const [faceImage, setFaceImage] = useState<string | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [whatSolving, setWhatSolving] = useState("");
  const [needs, setNeeds] = useState("");
  const [howToContribute, setHowToContribute] = useState("");
  const [uploadingFace, setUploadingFace] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving, setSaving] = useState(false);

  const faceInputRef = useRef<HTMLInputElement | null>(null);
  const imagesInputRef = useRef<HTMLInputElement | null>(null);

  async function handleFaceChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingFace(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const url = await uploadImage("project-images", u.user.id, file, "face");
      setFaceImage(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't upload photo");
    } finally {
      setUploadingFace(false);
    }
  }

  async function handleImagesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (images.length >= MAX_SUPPORTING_IMAGES) {
      toast.error(`Up to ${MAX_SUPPORTING_IMAGES} images`);
      return;
    }
    setUploadingImage(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const url = await uploadImage("project-images", u.user.id, file, "img");
      setImages((prev) => [...prev, url]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't upload photo");
    } finally {
      setUploadingImage(false);
    }
  }

  function removeImage(url: string) {
    setImages((prev) => prev.filter((i) => i !== url));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    if (!faceImage) {
      toast.error("Add a face photo first — it's what makes this feel real");
      return;
    }
    if (!title.trim() || !whatSolving.trim()) {
      toast.error("Give it a title and say what it's solving");
      return;
    }
    setSaving(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("projects")
        .insert({
          creator_id: u.user.id,
          title: title.trim(),
          face_image: faceImage,
          images,
          description: description.trim(),
          what_solving: whatSolving.trim(),
          needs: needs.trim(),
          how_to_contribute: howToContribute.trim(),
        })
        .select("id")
        .single();
      if (error) throw error;
      toast.success("Project started 🌱");
      navigate({ to: "/projects" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't start this project");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={`${themeClassName} relative min-h-screen`}>
      <div className="warm-aurora" aria-hidden />
      <div className="fomo-grain" aria-hidden />
      <div className="relative" style={{ zIndex: 2 }}>
        <TopBar />
        <main className="mx-auto max-w-2xl px-4 pb-28 pt-3 sm:px-6">
          <Link to="/projects" className="text-ink/60 hover:text-ink inline-flex items-center gap-1.5 text-sm">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <h1 className="fomo-heading text-ink mt-4 text-3xl font-bold">Start a Project</h1>
          <p className="text-sm text-ink/60">However small — if it's worth doing, it's worth starting.</p>

          <form onSubmit={submit} className="mt-5 space-y-4">
            <F label="Your face photo">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => faceInputRef.current?.click()}
                  disabled={uploadingFace}
                  className="group bg-ink/5 ring-ink/10 relative grid h-16 w-16 flex-shrink-0 place-items-center overflow-hidden rounded-full ring-1 disabled:opacity-60"
                >
                  {faceImage ? (
                    <img src={faceImage} alt="Face preview" className="h-full w-full object-cover" />
                  ) : (
                    <Camera className="text-ink/40 h-5 w-5" />
                  )}
                  <span className="absolute inset-0 grid place-items-center bg-black/40 opacity-0 transition group-hover:opacity-100">
                    {uploadingFace ? <Loader2 className="h-5 w-5 animate-spin text-white" /> : <Camera className="h-5 w-5 text-white" />}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => faceInputRef.current?.click()}
                  disabled={uploadingFace}
                  className="warm-card text-ink rounded-full px-4 py-2 text-xs font-medium transition hover:bg-ink/5 disabled:opacity-60"
                >
                  {uploadingFace ? "Uploading…" : faceImage ? "Change photo" : "Add photo"}
                </button>
                <input ref={faceInputRef} type="file" accept="image/*" onChange={handleFaceChange} className="hidden" />
              </div>
              <p className="mt-1.5 text-[11px] text-ink/40">
                A real photo of you — projects with a face behind them get trusted faster.
              </p>
            </F>

            <F label={`Supporting images (optional) · ${images.length}/${MAX_SUPPORTING_IMAGES}`}>
              <div className="flex flex-wrap gap-2">
                {images.map((url) => (
                  <div key={url} className="relative h-16 w-16 overflow-hidden rounded-xl">
                    <img src={url} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(url)}
                      aria-label="Remove image"
                      className="absolute right-0.5 top-0.5 grid h-5 w-5 place-items-center rounded-full bg-black/60 text-white"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {images.length < MAX_SUPPORTING_IMAGES && (
                  <button
                    type="button"
                    onClick={() => imagesInputRef.current?.click()}
                    disabled={uploadingImage}
                    className="warm-card grid h-16 w-16 place-items-center rounded-xl text-ink/40 disabled:opacity-60"
                  >
                    {uploadingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  </button>
                )}
                <input ref={imagesInputRef} type="file" accept="image/*" onChange={handleImagesChange} className="hidden" />
              </div>
            </F>

            <F label="Title">
              <input
                className="ipt"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Clean Beaches Collective"
                required
              />
            </F>
            <F label="Description">
              <textarea
                className="ipt min-h-20"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this, in a couple of sentences?"
              />
            </F>
            <F label="What's it solving?">
              <textarea
                className="ipt min-h-20"
                value={whatSolving}
                onChange={(e) => setWhatSolving(e.target.value)}
                placeholder="The real problem this is aimed at"
                required
              />
            </F>
            <F label="What does it need?">
              <textarea
                className="ipt min-h-20"
                value={needs}
                onChange={(e) => setNeeds(e.target.value)}
                placeholder="Volunteers, funding, supplies, time…"
              />
            </F>
            <F label="How can people contribute?">
              <textarea
                className="ipt min-h-20"
                value={howToContribute}
                onChange={(e) => setHowToContribute(e.target.value)}
                placeholder="What should someone reading this actually do?"
              />
            </F>

            <button
              type="submit"
              disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-semibold text-primary-foreground shadow-[var(--shadow-glow)] disabled:opacity-60"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Start this Project
            </button>
          </form>
        </main>
        <BottomNav />
      </div>
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-ink/60 mb-1.5 block text-xs font-medium">{label}</span>
      {children}
    </label>
  );
}
