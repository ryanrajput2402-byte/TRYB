import { AnimatePresence, motion } from "motion/react";
import { Heart, MapPin, MessageCircle, Share2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { spring } from "@/lib/motion";
import { Avatar } from "@/components/tryb/ui-kit";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/format-date";

type Author = { id: string; full_name: string; avatar_url: string | null; location: string | null };

type FeedPost = {
  id: string;
  author: Author;
  createdAt: string;
  caption: string;
  destination: string | null;
  images: string[];
  likes: number;
  comments: number;
  liked: boolean;
};

export function Feed() {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [meId, setMeId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      setMeId(u.user?.id ?? null);

      const { data: rawPosts } = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(8);
      const list = rawPosts ?? [];
      const postIds = list.map((p) => p.id);
      const authorIds = Array.from(new Set(list.map((p) => p.user_id)));

      const [{ data: authors }, { data: likeRows }, { data: commentRows }] = await Promise.all([
        authorIds.length
          ? supabase.from("profiles").select("id, full_name, avatar_url, location").in("id", authorIds)
          : Promise.resolve({ data: [] as Author[] }),
        postIds.length
          ? supabase.from("post_likes").select("post_id, user_id").in("post_id", postIds)
          : Promise.resolve({ data: [] as { post_id: string; user_id: string }[] }),
        postIds.length
          ? supabase.from("post_comments").select("post_id").in("post_id", postIds)
          : Promise.resolve({ data: [] as { post_id: string }[] }),
      ]);

      const authorById = new Map((authors ?? []).map((a) => [a.id, a as Author]));
      const likeCountByPost = new Map<string, number>();
      const likedByMe = new Set<string>();
      (likeRows ?? []).forEach((r) => {
        likeCountByPost.set(r.post_id, (likeCountByPost.get(r.post_id) ?? 0) + 1);
        if (u.user && r.user_id === u.user.id) likedByMe.add(r.post_id);
      });
      const commentCountByPost = new Map<string, number>();
      (commentRows ?? []).forEach((r) => {
        commentCountByPost.set(r.post_id, (commentCountByPost.get(r.post_id) ?? 0) + 1);
      });

      setPosts(
        list.map((p) => ({
          id: p.id,
          author: authorById.get(p.user_id) ?? { id: p.user_id, full_name: "Someone", avatar_url: null, location: null },
          createdAt: p.created_at,
          caption: p.caption,
          destination: p.destination,
          images: p.images ?? [],
          likes: likeCountByPost.get(p.id) ?? 0,
          comments: commentCountByPost.get(p.id) ?? 0,
          liked: likedByMe.has(p.id),
        })),
      );
      setLoading(false);
    })();
  }, []);

  const toggleLike = useCallback(
    async (postId: string) => {
      if (!meId) return;
      const wasLiked = posts.find((p) => p.id === postId)?.liked ?? false;
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, liked: !wasLiked, likes: p.likes + (wasLiked ? -1 : 1) } : p)),
      );
      if (wasLiked) {
        await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", meId);
      } else {
        await supabase.from("post_likes").insert({ post_id: postId, user_id: meId });
      }
    },
    [meId, posts],
  );

  if (loading) {
    return (
      <div className="flex flex-col gap-5">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="skeleton h-64 rounded-3xl border border-border/60" />
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-border bg-card/50 px-6 py-10 text-center text-sm text-muted-foreground">
        No stories yet — be the first to share a moment from the road.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {posts.map((post, i) => (
        <StoryCard key={post.id} post={post} index={i} onToggleLike={() => toggleLike(post.id)} />
      ))}
    </div>
  );
}

function StoryCard({ post, index, onToggleLike }: { post: FeedPost; index: number; onToggleLike: () => void }) {
  const [burst, setBurst] = useState(0);

  const handleLike = () => {
    if (!post.liked) setBurst((b) => b + 1);
    onToggleLike();
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: Math.min(index * 0.05, 0.2) }}
      className="overflow-hidden rounded-3xl border border-border/60 bg-card shadow-soft"
    >
      <header className="flex items-center gap-3 px-5 pt-5">
        <Avatar person={{ id: post.author.id, name: post.author.full_name, avatar: post.author.avatar_url }} size={44} />
        <div className="min-w-0 flex-1">
          <p className="font-medium leading-tight text-foreground">{post.author.full_name}</p>
          <p className="text-xs text-muted-foreground">
            {post.author.location ? `${post.author.location} · ` : ""}
            {formatRelativeTime(post.createdAt)}
          </p>
        </div>
      </header>

      <div className="px-5 pt-3">
        <p className="text-[15px] leading-relaxed text-foreground/90">{post.caption}</p>
        {post.destination && (
          <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <MapPin className="size-3.5" />
            {post.destination}
          </div>
        )}
      </div>

      {post.images.length > 0 && (
        <div className="mt-4 px-5">
          <div
            className={cn(
              "grid gap-1.5 overflow-hidden rounded-2xl",
              post.images.length > 1 ? "grid-cols-2" : "grid-cols-1",
            )}
          >
            {post.images.map((src, i) => (
              <motion.button
                key={src + i}
                onDoubleClick={handleLike}
                whileTap={{ scale: 0.99 }}
                className={cn(
                  "relative overflow-hidden bg-muted",
                  post.images.length === 1 ? "aspect-[16/11]" : "aspect-square",
                )}
              >
                <img src={src} alt={post.destination ?? "Travel story"} className="h-full w-full object-cover" />
              </motion.button>
            ))}
          </div>
        </div>
      )}

      <footer className="mt-2 flex items-center gap-1 px-3 py-2">
        <button
          onClick={handleLike}
          className={cn(
            "relative flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
            post.liked ? "text-primary" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <span className="relative">
            <motion.span
              key={post.liked ? "on" : "off"}
              initial={{ scale: 0.6 }}
              animate={{ scale: 1 }}
              transition={spring.press}
              className="block"
            >
              <Heart className={cn("size-[18px]", post.liked && "fill-current")} />
            </motion.span>
            <AnimatePresence>
              {burst > 0 && post.liked && (
                <motion.span
                  key={burst}
                  className="pointer-events-none absolute inset-0 grid place-items-center"
                  initial={{ opacity: 1 }}
                  animate={{ opacity: 0 }}
                  transition={{ duration: 0.6 }}
                >
                  {[...Array(6)].map((_, i) => (
                    <motion.span
                      key={i}
                      className="absolute size-1 rounded-full bg-primary"
                      initial={{ x: 0, y: 0, opacity: 1 }}
                      animate={{
                        x: Math.cos((i / 6) * Math.PI * 2) * 16,
                        y: Math.sin((i / 6) * Math.PI * 2) * 16,
                        opacity: 0,
                      }}
                      transition={{ duration: 0.55, ease: "easeOut" }}
                    />
                  ))}
                </motion.span>
              )}
            </AnimatePresence>
          </span>
          <motion.span key={post.likes} initial={{ y: -6, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
            {post.likes}
          </motion.span>
        </button>

        <button className="flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
          <MessageCircle className="size-[18px]" />
          {post.comments}
        </button>
        <button className="ml-auto flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
          <Share2 className="size-[18px]" />
          Share
        </button>
      </footer>
    </motion.article>
  );
}
