import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatRelativeTime, formatCompactRange } from "@/lib/format-date";
import { DESTINATIONS } from "@/lib/destinations";
import { ShareToGroupDialog } from "@/components/share-to-group-dialog";
import { Heart, MapPin, MessageCircle, Send, Loader as Loader2 } from "lucide-react";

export type PostProfile = { id: string; full_name: string; avatar_url: string | null };
export type PostTripInfo = { destination: string; start_date: string; end_date: string; cover_image: string | null };

export type FeedPost = {
  id: string;
  user_id: string;
  trip_id: string | null;
  post_type: string;
  images: string[];
  caption: string;
  destination: string | null;
  created_at: string;
  poster?: PostProfile | null;
  trip?: PostTripInfo | null;
  likeCount: number;
  likedByMe: boolean;
  commentCount: number;
};

export type CommentRow = { id: string; content: string; created_at: string; commenter?: PostProfile | null };

// Content carries itself, Instagram-style — no section title, no separate
// per-post headline. Caption + real social actions (like/comment/share),
// counts always real from post_likes/post_comments, never fabricated.
export function PostCard({
  post,
  currentUserId,
  currentUserProfile,
  onToggleLike,
}: {
  post: FeedPost;
  currentUserId: string | null;
  currentUserProfile?: PostProfile | null;
  onToggleLike: (postId: string) => void;
}) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<CommentRow[] | null>(null);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [commentCount, setCommentCount] = useState(post.commentCount);

  const posterName = post.poster?.full_name ?? "Someone";
  const cover = post.trip?.cover_image ?? (post.destination ? DESTINATIONS.find((d) => d.name === post.destination)?.image : null);

  async function toggleComments() {
    const next = !commentsOpen;
    setCommentsOpen(next);
    if (next && comments === null) {
      setLoadingComments(true);
      const { data: rows } = await supabase.from("post_comments").select("*").eq("post_id", post.id).order("created_at", { ascending: true });
      const userIds = Array.from(new Set((rows ?? []).map((r: any) => r.user_id)));
      const { data: profiles } = userIds.length
        ? await supabase.from("profiles").select("id, full_name, avatar_url").in("id", userIds)
        : { data: [] as PostProfile[] };
      const profileById = new Map((profiles ?? []).map((p: any) => [p.id, p]));
      setComments((rows ?? []).map((r: any) => ({ ...r, commenter: profileById.get(r.user_id) ?? null })));
      setLoadingComments(false);
    }
  }

  async function submitComment() {
    const content = commentText.trim();
    if (!content || !currentUserId || postingComment) return;
    setPostingComment(true);
    try {
      const { data, error } = await supabase
        .from("post_comments")
        .insert({ post_id: post.id, user_id: currentUserId, content })
        .select()
        .single();
      if (error) throw error;
      setComments((prev) => [...(prev ?? []), { ...data, commenter: currentUserProfile ?? null }]);
      setCommentCount((c) => c + 1);
      setCommentText("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't add comment");
    } finally {
      setPostingComment(false);
    }
  }

  const header = (
    <div className="flex items-center gap-2.5 p-4 pb-0">
      <div className="bg-pine/15 grid h-8 w-8 flex-shrink-0 place-items-center overflow-hidden rounded-full">
        {post.poster?.avatar_url ? (
          <img src={post.poster.avatar_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-xs font-bold text-ink">{posterName.slice(0, 1).toUpperCase()}</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink">{posterName}</p>
        <p className="text-[11px] text-ink/45">{formatRelativeTime(post.created_at)}</p>
      </div>
      {post.post_type === "trip_announcement" && (
        <span className="flex-shrink-0 rounded-full bg-ink/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-ink/50">
          Planning a trip
        </span>
      )}
    </div>
  );

  const body =
    post.post_type === "trip_announcement" && post.trip_id ? (
      <Link to="/trip/$tripId" params={{ tripId: post.trip_id }} className="block">
        {header}
        {cover && (
          <div className="relative mt-3 h-40 w-full">
            <img src={cover} alt={post.destination ?? ""} className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
            {post.destination && (
              <p className="absolute bottom-3 left-4 flex items-center gap-1 text-lg font-bold text-white drop-shadow">
                <MapPin className="h-4 w-4" /> {post.destination}
              </p>
            )}
          </div>
        )}
        <div className="p-4 pt-3">
          {post.caption && <p className="text-sm text-ink/80">{post.caption}</p>}
          {post.trip && (
            <p className="mt-1 text-xs text-ink/45">{formatCompactRange(post.trip.start_date, post.trip.end_date)} · tap to see the trip</p>
          )}
        </div>
      </Link>
    ) : (
      <>
        {header}
        <div className="p-4 pt-3">
          {post.caption && <p className="text-sm text-ink/80">{post.caption}</p>}
          {post.destination && (
            <p className="mt-1 flex items-center gap-1 text-xs text-ink/45">
              <MapPin className="h-3 w-3" /> {post.destination}
            </p>
          )}
          {post.images.length > 0 && (
            <div className={`mt-3 grid gap-1.5 ${post.images.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
              {post.images.slice(0, 5).map((url, i) => (
                <img
                  key={url}
                  src={url}
                  alt=""
                  className={`h-40 w-full rounded-2xl object-cover ${post.images.length === 3 && i === 0 ? "col-span-2" : ""}`}
                />
              ))}
            </div>
          )}
        </div>
      </>
    );

  return (
    <div className="warm-card shadow-warm overflow-hidden rounded-3xl">
      {body}

      <div className="flex items-center gap-1 border-t border-ink/8 px-2 py-1">
        <button
          type="button"
          onClick={() => onToggleLike(post.id)}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
            post.likedByMe ? "text-clay" : "text-ink/60 hover:bg-ink/5"
          }`}
        >
          <Heart className={`h-4 w-4 ${post.likedByMe ? "fill-clay" : ""}`} />
          {post.likeCount > 0 ? post.likeCount : "Like"}
        </button>
        <button
          type="button"
          onClick={toggleComments}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-medium text-ink/60 transition hover:bg-ink/5"
        >
          <MessageCircle className="h-4 w-4" />
          {commentCount > 0 ? commentCount : "Comment"}
        </button>
        <button
          type="button"
          onClick={() => setShareOpen(true)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-medium text-ink/60 transition hover:bg-ink/5"
        >
          <Send className="h-4 w-4" />
          Share
        </button>
      </div>

      {commentsOpen && (
        <div className="border-t border-ink/8 p-4 pt-3">
          {loadingComments ? (
            <div className="skeleton-fomo h-10 rounded-xl" />
          ) : comments && comments.length > 0 ? (
            <div className="space-y-2.5">
              {comments.map((c) => (
                <div key={c.id} className="flex items-start gap-2">
                  <div className="bg-pine/15 grid h-6 w-6 flex-shrink-0 place-items-center overflow-hidden rounded-full">
                    <span className="text-[10px] font-bold text-ink">{(c.commenter?.full_name ?? "?").slice(0, 1).toUpperCase()}</span>
                  </div>
                  <p className="text-xs text-ink/80">
                    <span className="font-semibold text-ink">{c.commenter?.full_name ?? "Someone"}</span> {c.content}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-ink/45">No comments yet — be the first.</p>
          )}
          {currentUserId && (
            <div className="mt-3 flex items-center gap-2">
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitComment()}
                placeholder="Add a comment…"
                className="ipt flex-1 py-2 text-xs"
              />
              <button
                type="button"
                onClick={submitComment}
                disabled={!commentText.trim() || postingComment}
                className="bg-primary text-cream grid h-8 w-8 flex-shrink-0 place-items-center rounded-full disabled:opacity-50"
                aria-label="Post comment"
              >
                {postingComment ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              </button>
            </div>
          )}
        </div>
      )}

      <ShareToGroupDialog open={shareOpen} onOpenChange={setShareOpen} post={post} />
    </div>
  );
}
