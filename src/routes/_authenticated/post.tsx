import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Loader as Loader2, Plus, X } from "lucide-react";
import { uploadImage } from "@/lib/upload-image";
import { DESTINATIONS } from "@/lib/destinations";
import { useAppTheme } from "@/lib/theme-context";
import { DEFAULT_SEASON_THEME, seasonThemeClassName } from "@/lib/seasonal-themes";

const MAX_IMAGES = 5;

export const Route = createFileRoute("/_authenticated/post")({
  head: () => ({ meta: [{ title: "Share a travel story — TRYB" }] }),
  component: NewPost,
});

function NewPost() {
  const navigate = useNavigate();
  const { preference: themePreference } = useAppTheme();
  const themeClassName = seasonThemeClassName(themePreference ?? DEFAULT_SEASON_THEME);

  const [images, setImages] = useState<string[]>([]);
  const [caption, setCaption] = useState("");
  const [destination, setDestination] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const imagesInputRef = useRef<HTMLInputElement | null>(null);

  async function handleImagesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;
    const room = MAX_IMAGES - images.length;
    if (room <= 0) {
      toast.error(`Up to ${MAX_IMAGES} photos`);
      return;
    }
    setUploading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const uploaded: string[] = [];
      for (const file of files.slice(0, room)) {
        uploaded.push(await uploadImage("post-images", u.user.id, file, "story"));
      }
      setImages((prev) => [...prev, ...uploaded]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't upload photo");
    } finally {
      setUploading(false);
    }
  }

  function removeImage(url: string) {
    setImages((prev) => prev.filter((i) => i !== url));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    if (!caption.trim() && images.length === 0) {
      toast.error("Add a caption or a photo first");
      return;
    }
    setSaving(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const { error } = await supabase.from("posts").insert({
        user_id: u.user.id,
        post_type: "story",
        images,
        caption: caption.trim(),
        destination: destination.trim() || null,
      });
      if (error) throw error;
      toast.success("Posted! 🌍");
      navigate({ to: "/home" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't post this");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={`${themeClassName} relative min-h-screen`}>
      <div className="warm-aurora" aria-hidden />
      <div className="fomo-grain" aria-hidden />
      <div className="relative" style={{ zIndex: 2 }}>
        <main className="mx-auto max-w-2xl px-4 pb-28 pt-3 sm:px-6">
          <Link to="/home" className="text-ink/60 hover:text-ink inline-flex items-center gap-1.5 text-sm">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <h1 className="fomo-heading text-ink mt-4 text-3xl font-bold">Share a travel story</h1>
          <p className="text-sm text-ink/60">A caption, photos if you've got them, and it's live for everyone.</p>

          <form onSubmit={submit} className="mt-5 space-y-4">
            <F label={`Photos (optional) · ${images.length}/${MAX_IMAGES}`}>
              <div className="flex flex-wrap gap-2">
                {images.map((url) => (
                  <div key={url} className="relative h-20 w-20 overflow-hidden rounded-xl">
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
                {images.length < MAX_IMAGES && (
                  <button
                    type="button"
                    onClick={() => imagesInputRef.current?.click()}
                    disabled={uploading}
                    className="warm-card grid h-20 w-20 place-items-center rounded-xl text-ink/40 disabled:opacity-60"
                  >
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  </button>
                )}
                <input ref={imagesInputRef} type="file" accept="image/*" multiple onChange={handleImagesChange} className="hidden" />
              </div>
            </F>

            <F label="Caption">
              <textarea
                className="ipt min-h-24"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="What happened, where, and how it felt"
              />
            </F>

            <F label="Destination (optional)">
              <input
                className="ipt"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="Bali, Tokyo, Lisbon…"
                list="post-destinations"
              />
              <datalist id="post-destinations">
                {DESTINATIONS.map((d) => <option key={d.slug} value={d.name} />)}
              </datalist>
            </F>

            <button
              type="submit"
              disabled={saving || (!caption.trim() && images.length === 0)}
              className="bg-primary text-cream mt-2 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 font-semibold shadow-[var(--shadow-glow)] disabled:opacity-60"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Post it
            </button>
          </form>
        </main>
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
