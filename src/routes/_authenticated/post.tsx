import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ImagePlus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/post")({
  head: () => ({ meta: [{ title: "New post — TRYB" }] }),
  component: PostStub,
});

function PostStub() {
  const navigate = useNavigate();
  return (
    <div className="hero-glow flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <button
        onClick={() => navigate({ to: "/home" })}
        className="glass-card absolute left-4 top-[calc(env(safe-area-inset-top)+12px)] grid h-10 w-10 place-items-center rounded-full"
        aria-label="Back"
      >
        <ArrowLeft className="h-4 w-4" />
      </button>
      <div className="glass-card rounded-3xl p-8 max-w-md">
        <ImagePlus className="mx-auto h-10 w-10 text-primary" />
        <h1 className="mt-3 font-display text-2xl font-bold">Posts are coming soon</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Share photos and moments from your trips with the group. We're still building this one.
        </p>
      </div>
    </div>
  );
}
