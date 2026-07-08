import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PostCard, FeedPost, PostProfile, PostTripInfo } from "@/components/post-card";
import { ImagePlus, Plus } from "lucide-react";

// No section title here by design — content carries itself, Instagram-
// style. This renders directly inline (e.g. on Home), not behind a
// click-to-open page.
export function PostsFeed() {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<PostProfile | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id ?? null;
      if (!cancelled) setCurrentUserId(uid);
      if (uid) {
        const { data: myProfile } = await supabase.from("profiles").select("id, full_name, avatar_url").eq("id", uid).maybeSingle();
        if (!cancelled) setCurrentUserProfile(myProfile as PostProfile | null);
      }

      const { data: rows } = await supabase.from("posts").select("*").order("created_at", { ascending: false }).limit(50);
      const enriched = await enrichPosts((rows ?? []) as any[], uid);
      if (!cancelled) {
        setPosts(enriched);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Instant feed for everyone — the entire point of a live, shared feed.
  useEffect(() => {
    const channel = supabase
      .channel("posts-feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "posts" }, async (payload) => {
        const row = payload.new as any;
        const [enriched] = await enrichPosts([row], currentUserId);
        setPosts((prev) => (prev.some((p) => p.id === row.id) ? prev : [enriched, ...prev]));
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "post_likes" }, (payload) => {
        const row = payload.new as any;
        // Supabase echoes the actor's own write back through this same
        // subscription — the actor's own click already applied its +1
        // optimistically, so only apply the delta here for other users'
        // likes, or this would double-count the actor's own like.
        if (row.user_id === currentUserId) return;
        setPosts((prev) => prev.map((p) => (p.id === row.post_id ? { ...p, likeCount: p.likeCount + 1 } : p)));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "post_likes" }, (payload) => {
        const row = payload.old as any;
        if (row.user_id === currentUserId) return;
        setPosts((prev) => prev.map((p) => (p.id === row.post_id ? { ...p, likeCount: Math.max(0, p.likeCount - 1) } : p)));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId]);

  async function toggleLike(postId: string) {
    if (!currentUserId) return;
    const post = posts.find((p) => p.id === postId);
    if (!post) return;
    const wasLiked = post.likedByMe;
    // Optimistic — real insert/delete either way, just not waiting on the
    // realtime echo for the actor's own click. The updater derives the
    // toggle from `p` itself (not this outer `wasLiked`) so it stays a
    // pure function of `prev` — React 18/StrictMode double-invokes
    // functional setState updaters in dev, and an updater that instead
    // closed over `wasLiked` would apply the same +1/-1 delta twice,
    // silently double-counting likes in dev (caught via a real click test).
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, likedByMe: !p.likedByMe, likeCount: p.likeCount + (p.likedByMe ? -1 : 1) } : p)),
    );
    if (wasLiked) {
      const { error } = await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", currentUserId);
      if (error) toast.error(error.message);
    } else {
      const { error } = await supabase.from("post_likes").insert({ post_id: postId, user_id: currentUserId });
      if (error && error.code !== "23505") toast.error(error.message);
    }
  }

  return (
    <div>
      {loading ? (
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => <div key={i} className="skeleton-fomo h-64 rounded-3xl" />)}
        </div>
      ) : posts.length === 0 ? (
        <div className="warm-card rounded-3xl p-8 text-center">
          <ImagePlus className="text-ink/30 mx-auto h-8 w-8" />
          <p className="mt-3 text-sm text-ink/60">No posts yet — share the first travel story.</p>
          <Link to="/post" className="bg-primary text-cream mt-4 inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold">
            <Plus className="h-4 w-4" /> Share a story
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={currentUserId}
              currentUserProfile={currentUserProfile}
              onToggleLike={toggleLike}
            />
          ))}
        </div>
      )}
    </div>
  );
}

async function enrichPosts(rows: any[], currentUserId: string | null): Promise<FeedPost[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
  const tripIds = Array.from(new Set(rows.map((r) => r.trip_id).filter(Boolean)));
  const [{ data: profiles }, { data: trips }, { data: likeRows }, { data: commentRows }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, avatar_url").in("id", userIds),
    tripIds.length
      ? supabase.from("trips").select("id, destination, start_date, end_date, cover_image").in("id", tripIds)
      : Promise.resolve({ data: [] as any[] }),
    supabase.from("post_likes").select("post_id, user_id").in("post_id", ids),
    supabase.from("post_comments").select("post_id").in("post_id", ids),
  ]);
  const profileById = new Map<string, PostProfile>((profiles ?? []).map((p: any) => [p.id, p]));
  const tripById = new Map<string, PostTripInfo>((trips ?? []).map((t: any) => [t.id, t]));

  const likeCountByPost = new Map<string, number>();
  const likedByMeSet = new Set<string>();
  (likeRows ?? []).forEach((r: any) => {
    likeCountByPost.set(r.post_id, (likeCountByPost.get(r.post_id) ?? 0) + 1);
    if (currentUserId && r.user_id === currentUserId) likedByMeSet.add(r.post_id);
  });
  const commentCountByPost = new Map<string, number>();
  (commentRows ?? []).forEach((r: any) => {
    commentCountByPost.set(r.post_id, (commentCountByPost.get(r.post_id) ?? 0) + 1);
  });

  return rows.map((r) => ({
    ...r,
    images: r.images ?? [],
    poster: profileById.get(r.user_id) ?? null,
    trip: r.trip_id ? (tripById.get(r.trip_id) ?? null) : null,
    likeCount: likeCountByPost.get(r.id) ?? 0,
    likedByMe: likedByMeSet.has(r.id),
    commentCount: commentCountByPost.get(r.id) ?? 0,
  }));
}
