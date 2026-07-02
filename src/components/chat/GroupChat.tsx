import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowLeft, Send, Wallet, BarChart3, Check, Plus, X, Sparkles } from "lucide-react";
import { format } from "date-fns";

type Profile = {
  id: string;
  full_name: string;
  avatar_url: string | null;
};

type Member = {
  user_id: string;
  role: string;
  status: string;
  profile: Profile | null;
};

type PollOptionState = {
  id: string;
  text: string;
  voterIds: string[];
};

type PollState = {
  id: string;
  question: string;
  locked: boolean;
  options: PollOptionState[];
};

type ChatMessage = {
  id: string;
  trip_id: string;
  sender_id: string | null;
  message_type: string;
  content: string;
  metadata: Record<string, any>;
  created_at: string;
  reactions: { id: string; user_id: string; emoji: string }[];
  poll?: PollState | null;
};

const REACTION_EMOJI = ["❤️", "😂", "👍", "😮", "🙌"];

// Placeholder for a real Keyo AI backend — swap for an edge function call later.
function getKeyoResponse(query: string): string {
  const q = query.trim().toLowerCase();
  if (!q) {
    return "Ask me about packing, weather, food, hotels, itinerary ideas, or splitting costs — I'll do my best to help!";
  }
  if (q.includes("pack") || q.includes("bring") || q.includes("luggage") || q.includes("bag")) {
    return "Pack light and layer-friendly: 2-3 versatile outfits you can mix and match, a light rain shell, comfortable walking shoes, a reusable water bottle, a portable charger, and any adapters you'll need locally. Check the forecast a few days out and swap in warmer or cooler layers as needed. Roll clothes instead of folding to save space, and leave a little room for souvenirs on the way back.";
  }
  if (q.includes("weather") || q.includes("temperature") || q.includes("rain") || q.includes("climate")) {
    return "I can't pull live weather yet, but as a rule of thumb pack layers — many destinations swing 10°+ between day and night. Check a forecast app 3-5 days before you leave so you can adjust what you're bringing, and throw in a compact rain jacket just in case.";
  }
  if (
    q.includes("food") ||
    q.includes("eat") ||
    q.includes("restaurant") ||
    q.includes("cuisine") ||
    q.includes("dinner") ||
    q.includes("lunch")
  ) {
    return "For food, look up 2-3 highly-rated local spots near where you're staying and book anything popular a day ahead — walk-ins can mean long waits at peak times. Ask locals or your host for their go-to spot too, it's usually better than anything in a guidebook. Budget extra for one \"special\" meal on the trip — it's always worth it.";
  }
  if (
    q.includes("hotel") ||
    q.includes("stay") ||
    q.includes("accommodation") ||
    q.includes("airbnb") ||
    q.includes("hostel")
  ) {
    return "For where to stay, prioritize location over luxury — being walkable to the things you actually want to do saves more time and money than a fancier room further out. Read the most recent reviews (not just the star rating), and double check that check-in/check-out times line up with your flights so you're not stuck killing hours with luggage.";
  }
  if (
    q.includes("budget") ||
    q.includes("cost") ||
    q.includes("split") ||
    q.includes("expense") ||
    q.includes("money") ||
    q.includes("price")
  ) {
    return "Tap the 💸 button below to log an expense and I'll help split it evenly across the group — everyone can mark it as paid once they've settled up. As a rule of thumb, set a rough daily budget per person up front (food + activities + transport) so nobody's surprised later.";
  }
  if (
    q.includes("itinerary") ||
    q.includes("plan") ||
    q.includes("schedule") ||
    q.includes("activities") ||
    q.includes("things to do")
  ) {
    return "For planning, pick 1-2 \"anchor\" activities per day and leave the rest open — an overpacked schedule is the #1 way trips get stressful. Group activities that are near each other on the same day to cut down on travel time, and build in at least one buffer day for rest or spontaneous plans. Full AI-generated itineraries are coming soon — for now, drop ideas here and create a poll to vote on them!";
  }
  return `Got it — "${query.trim()}". I'm still learning, but the group can jump in below! Try asking me about packing, weather, food, hotels, itinerary ideas, or splitting costs.`;
}

function initials(name?: string | null) {
  return (name ?? "?").trim().slice(0, 1).toUpperCase();
}

export function GroupChat({ tripId }: { tripId: string }) {
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [composerText, setComposerText] = useState("");
  const [sending, setSending] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [pollOpen, setPollOpen] = useState(false);
  const [creatingExpense, setCreatingExpense] = useState(false);
  const [creatingPoll, setCreatingPoll] = useState(false);
  const [tripCurrency, setTripCurrency] = useState("USD");
  const [tripName, setTripName] = useState("");
  const [tripPhoto, setTripPhoto] = useState<string | null>(null);

  const membersById = useMemo(() => {
    const map = new Map<string, Member>();
    members.forEach((m) => map.set(m.user_id, m));
    return map;
  }, [members]);

  const pollMessageIdByPollId = useRef(new Map<string, string>());
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);

      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user || cancelled) return;
      setCurrentUserId(user.id);

      const { data: trip } = await supabase
        .from("trips")
        .select("currency, destination, cover_image")
        .eq("id", tripId)
        .maybeSingle();
      if (!cancelled && trip?.currency) setTripCurrency(trip.currency);
      if (!cancelled && trip) {
        setTripName(trip.destination ?? "");
        setTripPhoto(trip.cover_image ?? null);
      }

      const { data: memberRows } = await supabase
        .from("trip_members")
        .select("user_id, role, status")
        .eq("trip_id", tripId)
        .eq("status", "approved");
      const memberIds = (memberRows ?? []).map((m) => m.user_id);
      const { data: profileRows } = memberIds.length
        ? await supabase.from("profiles").select("id, full_name, avatar_url").in("id", memberIds)
        : { data: [] as Profile[] };
      const profileById = new Map((profileRows ?? []).map((p) => [p.id, p]));
      if (!cancelled) {
        setMembers(
          (memberRows ?? []).map((m) => ({ ...m, profile: profileById.get(m.user_id) ?? null })),
        );
      }

      const { data: messageRows } = await supabase
        .from("messages")
        .select("*")
        .eq("trip_id", tripId)
        .is("deleted_at", null)
        .order("created_at", { ascending: true });

      const messageIds = (messageRows ?? []).map((m) => m.id);
      const [{ data: reactionRows }, { data: pollRows }] = await Promise.all([
        messageIds.length
          ? supabase.from("message_reactions").select("*").in("message_id", messageIds)
          : Promise.resolve({ data: [] as any[] }),
        messageIds.length
          ? supabase.from("polls").select("*").in("message_id", messageIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const pollIds = (pollRows ?? []).map((p) => p.id);
      const [{ data: optionRows }, { data: voteRows }] = await Promise.all([
        pollIds.length
          ? supabase.from("poll_options").select("*").in("poll_id", pollIds)
          : Promise.resolve({ data: [] as any[] }),
        pollIds.length
          ? supabase.from("poll_votes").select("*").in("poll_id", pollIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const optionsByPoll = new Map<string, PollOptionState[]>();
      (optionRows ?? []).forEach((o: any) => {
        const list = optionsByPoll.get(o.poll_id) ?? [];
        list.push({ id: o.id, text: o.text, voterIds: [] });
        optionsByPoll.set(o.poll_id, list);
      });
      (voteRows ?? []).forEach((v: any) => {
        const list = optionsByPoll.get(v.poll_id);
        const opt = list?.find((o) => o.id === v.option_id);
        if (opt) opt.voterIds.push(v.user_id);
      });

      const pollByMessageId = new Map<string, PollState>();
      (pollRows ?? []).forEach((p: any) => {
        pollMessageIdByPollId.current.set(p.id, p.message_id);
        pollByMessageId.set(p.message_id, {
          id: p.id,
          question: p.question,
          locked: p.locked,
          options: optionsByPoll.get(p.id) ?? [],
        });
      });

      const reactionsByMessage = new Map<string, ChatMessage["reactions"]>();
      (reactionRows ?? []).forEach((r: any) => {
        const list = reactionsByMessage.get(r.message_id) ?? [];
        list.push({ id: r.id, user_id: r.user_id, emoji: r.emoji });
        reactionsByMessage.set(r.message_id, list);
      });

      if (!cancelled) {
        setMessages(
          (messageRows ?? []).map((m: any) => ({
            ...m,
            metadata: m.metadata ?? {},
            reactions: reactionsByMessage.get(m.id) ?? [],
            poll: pollByMessageId.get(m.id) ?? null,
          })),
        );
        setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [tripId]);

  useEffect(() => {
    const channel = supabase
      .channel(`trip-chat-${tripId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `trip_id=eq.${tripId}` },
        (payload) => {
          const row = payload.new as any;
          setMessages((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev;
            return [
              ...prev,
              { ...row, metadata: row.metadata ?? {}, reactions: [], poll: null } as ChatMessage,
            ];
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "message_reactions" },
        (payload) => {
          const row = payload.new as any;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === row.message_id
                ? {
                    ...m,
                    reactions: [
                      ...m.reactions,
                      { id: row.id, user_id: row.user_id, emoji: row.emoji },
                    ],
                  }
                : m,
            ),
          );
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "message_reactions" },
        (payload) => {
          const row = payload.old as any;
          setMessages((prev) =>
            prev.map((m) =>
              m.reactions.some((r) => r.id === row.id)
                ? { ...m, reactions: m.reactions.filter((r) => r.id !== row.id) }
                : m,
            ),
          );
        },
      )
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "polls" }, (payload) => {
        const row = payload.new as any;
        pollMessageIdByPollId.current.set(row.id, row.message_id);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === row.message_id
              ? {
                  // Don't clobber a poll that createPoll's own optimistic update already
                  // populated with full options — only fill in a skeleton if none exists yet.
                  ...m,
                  poll: m.poll ?? {
                    id: row.id,
                    question: row.question,
                    locked: row.locked,
                    options: [],
                  },
                }
              : m,
          ),
        );
      })
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "poll_options" },
        (payload) => {
          const row = payload.new as any;
          const messageId = pollMessageIdByPollId.current.get(row.poll_id);
          if (!messageId) return;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === messageId && m.poll
                ? {
                    ...m,
                    poll: {
                      ...m.poll,
                      options: m.poll.options.some((o) => o.id === row.id)
                        ? m.poll.options
                        : [...m.poll.options, { id: row.id, text: row.text, voterIds: [] }],
                    },
                  }
                : m,
            ),
          );
        },
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "poll_votes" }, (payload) => {
        const row = (payload.new ?? payload.old) as any;
        const messageId = pollMessageIdByPollId.current.get(row.poll_id);
        if (!messageId) return;
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== messageId || !m.poll) return m;
            const options = m.poll.options.map((o) => ({
              ...o,
              voterIds: o.voterIds.filter((id) => id !== row.user_id),
            }));
            if (payload.eventType !== "DELETE") {
              const target = options.find((o) => o.id === (payload.new as any).option_id);
              if (target) target.voterIds.push(row.user_id);
            }
            return { ...m, poll: { ...m.poll, options } };
          }),
        );
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleSend() {
    const text = composerText.trim();
    if (!text || !currentUserId || sending) return;
    setSending(true);
    setComposerText("");
    try {
      const { error } = await supabase
        .from("messages")
        .insert({ trip_id: tripId, sender_id: currentUserId, message_type: "text", content: text });
      if (error) throw error;

      const keyoMatch = text.match(/^\/keyo\s*(.*)$/i);
      if (keyoMatch) {
        const reply = getKeyoResponse(keyoMatch[1]);
        const { error: keyoError } = await supabase
          .from("messages")
          .insert({ trip_id: tripId, sender_id: null, message_type: "keyo", content: reply });
        if (keyoError) throw keyoError;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't send message");
      setComposerText(text);
    } finally {
      setSending(false);
    }
  }

  async function toggleReaction(message: ChatMessage, emoji: string) {
    if (!currentUserId) return;
    const existing = message.reactions.find(
      (r) => r.user_id === currentUserId && r.emoji === emoji,
    );
    if (existing) {
      const { error } = await supabase.from("message_reactions").delete().eq("id", existing.id);
      if (error) toast.error(error.message);
      return;
    }
    const { error } = await supabase
      .from("message_reactions")
      .insert({ message_id: message.id, user_id: currentUserId, emoji });
    if (error && error.code !== "23505") toast.error(error.message);
  }

  async function createExpense(input: {
    description: string;
    amount: number;
    splitAmong: string[];
  }) {
    if (!currentUserId || creatingExpense) return;
    setCreatingExpense(true);
    try {
      const { data: expense, error } = await supabase
        .from("expenses")
        .insert({
          trip_id: tripId,
          payer_id: currentUserId,
          description: input.description,
          amount: input.amount,
          currency: tripCurrency,
          split_user_ids: input.splitAmong,
        })
        .select()
        .single();
      if (error) throw error;

      const { error: msgError } = await supabase.from("messages").insert({
        trip_id: tripId,
        sender_id: currentUserId,
        message_type: "expense",
        content: input.description,
        metadata: {
          expense_id: expense.id,
          description: input.description,
          amount: input.amount,
          currency: tripCurrency,
          paid_by: currentUserId,
          split_among: input.splitAmong,
        },
      });
      if (msgError) throw msgError;
      setExpenseOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't add expense");
    } finally {
      setCreatingExpense(false);
    }
  }

  async function toggleSettle(message: ChatMessage) {
    const expenseId = message.metadata.expense_id;
    if (!expenseId || !currentUserId) return;
    const { data: expense, error: fetchError } = await supabase
      .from("expenses")
      .select("settled_by")
      .eq("id", expenseId)
      .maybeSingle();
    if (fetchError || !expense) return;
    const already = (expense.settled_by ?? []).includes(currentUserId);
    const nextSettledBy = already
      ? expense.settled_by.filter((id: string) => id !== currentUserId)
      : [...expense.settled_by, currentUserId];
    const { error } = await supabase
      .from("expenses")
      .update({ settled_by: nextSettledBy })
      .eq("id", expenseId);
    if (error) toast.error(error.message);
    else
      setMessages((prev) =>
        prev.map((m) =>
          m.id === message.id
            ? { ...m, metadata: { ...m.metadata, settled_by: nextSettledBy } }
            : m,
        ),
      );
  }

  async function createPoll(input: { question: string; options: string[] }) {
    if (!currentUserId || creatingPoll) return;
    setCreatingPoll(true);
    try {
      const { data: message, error: msgError } = await supabase
        .from("messages")
        .insert({
          trip_id: tripId,
          sender_id: currentUserId,
          message_type: "poll",
          content: input.question,
        })
        .select()
        .single();
      if (msgError) throw msgError;

      const { data: poll, error: pollError } = await supabase
        .from("polls")
        .insert({ message_id: message.id, question: input.question })
        .select()
        .single();
      if (pollError) throw pollError;
      // Set this as soon as we know it, so realtime poll_options events arriving
      // mid-flight (before this function finishes) can still find their message.
      pollMessageIdByPollId.current.set(poll.id, message.id);

      const { data: options, error: optError } = await supabase
        .from("poll_options")
        .insert(input.options.map((text) => ({ poll_id: poll.id, text })))
        .select();
      if (optError) throw optError;

      const fullPoll: PollState = {
        id: poll.id,
        question: poll.question,
        locked: poll.locked,
        options: (options ?? []).map((o) => ({ id: o.id, text: o.text, voterIds: [] })),
      };

      // The realtime "messages" INSERT handler may have already added this same
      // row (Supabase echoes your own writes back to you) while these awaits were
      // in flight. Merge into it instead of blindly appending a second copy.
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) {
          return prev.map((m) => (m.id === message.id ? { ...m, poll: fullPoll } : m));
        }
        return [
          ...prev,
          {
            ...message,
            metadata: (message.metadata ?? {}) as Record<string, any>,
            reactions: [],
            poll: fullPoll,
          },
        ];
      });
      setPollOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't create poll");
    } finally {
      setCreatingPoll(false);
    }
  }

  async function vote(pollId: string, optionId: string) {
    if (!currentUserId) return;
    const { error } = await supabase
      .from("poll_votes")
      .upsert(
        { poll_id: pollId, option_id: optionId, user_id: currentUserId },
        { onConflict: "poll_id,user_id" },
      );
    if (error) {
      toast.error(error.message);
      return;
    }
    setMessages((prev) =>
      prev.map((m) => {
        if (!m.poll || m.poll.id !== pollId) return m;
        const options = m.poll.options.map((o) => ({
          ...o,
          voterIds: o.voterIds.filter((id) => id !== currentUserId),
        }));
        const target = options.find((o) => o.id === optionId);
        if (target) target.voterIds.push(currentUserId);
        return { ...m, poll: { ...m.poll, options } };
      }),
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Loading chat…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <ChatHeader tripId={tripId} members={members} tripName={tripName} tripPhoto={tripPhoto} />

      <main className="flex-1 space-y-4 overflow-y-auto px-4 pb-40 pt-4">
        {messages.length === 0 && (
          <div className="glass-card mx-auto mt-8 max-w-sm rounded-3xl p-6 text-center">
            <Sparkles className="mx-auto h-8 w-8 text-primary" />
            <p className="mt-2 text-sm text-muted-foreground">
              No messages yet — say hi, or type <span className="font-semibold">/keyo</span> to ask
              the trip assistant something.
            </p>
          </div>
        )}
        {messages.map((message) => (
          <MessageRow
            key={message.id}
            message={message}
            isMine={message.sender_id === currentUserId}
            sender={
              message.sender_id ? (membersById.get(message.sender_id)?.profile ?? null) : null
            }
            currentUserId={currentUserId}
            members={members}
            onToggleReaction={(emoji) => toggleReaction(message, emoji)}
            onVote={(optionId) => message.poll && vote(message.poll.id, optionId)}
            onToggleSettle={() => toggleSettle(message)}
          />
        ))}
        <div ref={bottomRef} />
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border/50 bg-background/90 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setExpenseOpen(true)}
            aria-label="Add expense"
          >
            <Wallet className="h-5 w-5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setPollOpen(true)}
            aria-label="Add poll"
          >
            <BarChart3 className="h-5 w-5" />
          </Button>
          <Input
            value={composerText}
            onChange={(e) => setComposerText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Message the group, or /keyo ask a question…"
            className="flex-1 rounded-full"
          />
          <Button
            type="button"
            size="icon"
            className="rounded-full"
            onClick={handleSend}
            disabled={sending || !composerText.trim()}
            aria-label="Send"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ExpenseDialog
        open={expenseOpen}
        onOpenChange={setExpenseOpen}
        members={members}
        currency={tripCurrency}
        onSubmit={createExpense}
        submitting={creatingExpense}
      />
      <PollDialog
        open={pollOpen}
        onOpenChange={setPollOpen}
        onSubmit={createPoll}
        submitting={creatingPoll}
      />
    </div>
  );
}

function ChatHeader({
  tripId,
  members,
  tripName,
  tripPhoto,
}: {
  tripId: string;
  members: Member[];
  tripName: string;
  tripPhoto: string | null;
}) {
  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 bg-background/80 px-4 pt-[calc(env(safe-area-inset-top)+12px)] pb-3 backdrop-blur-xl">
      <Link
        to="/trip/$tripId"
        params={{ tripId }}
        className="glass-card grid h-10 w-10 flex-shrink-0 place-items-center rounded-full"
        aria-label="Back to trip"
      >
        <ArrowLeft className="h-4 w-4" />
      </Link>
      <div className="h-9 w-9 flex-shrink-0 overflow-hidden rounded-full bg-primary/20">
        {tripPhoto ? (
          <img src={tripPhoto} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center text-sm font-bold text-primary">
            {initials(tripName)}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h1 className="truncate font-display text-lg font-bold">{tripName || "Group chat"}</h1>
        <p className="truncate text-xs text-muted-foreground">
          {members.length} member{members.length === 1 ? "" : "s"}
        </p>
      </div>
      <div className="flex -space-x-2">
        {members.slice(0, 4).map((m) => (
          <div
            key={m.user_id}
            className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-full ring-2 ring-background"
          >
            {m.profile?.avatar_url ? (
              <img src={m.profile.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center bg-primary/20 text-xs font-bold text-primary">
                {initials(m.profile?.full_name)}
              </div>
            )}
          </div>
        ))}
      </div>
    </header>
  );
}

function MessageRow({
  message,
  isMine,
  sender,
  currentUserId,
  members,
  onToggleReaction,
  onVote,
  onToggleSettle,
}: {
  message: ChatMessage;
  isMine: boolean;
  sender: Profile | null;
  currentUserId: string | null;
  members: Member[];
  onToggleReaction: (emoji: string) => void;
  onVote: (optionId: string) => void;
  onToggleSettle: () => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const isKeyo = message.message_type === "keyo";
  const isSystem = message.message_type === "system";
  const senderName = isKeyo ? "Keyo" : (sender?.full_name ?? "Member");

  const reactionGroups = useMemo(() => {
    const groups = new Map<string, string[]>();
    message.reactions.forEach((r) => {
      const list = groups.get(r.emoji) ?? [];
      list.push(r.user_id);
      groups.set(r.emoji, list);
    });
    return Array.from(groups.entries());
  }, [message.reactions]);

  if (isSystem) {
    return <p className="text-center text-xs text-muted-foreground">{message.content}</p>;
  }

  return (
    <div className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}>
      <div className={`flex max-w-[85%] items-end gap-2 ${isMine ? "flex-row-reverse" : ""}`}>
        {!isMine && (
          <div className="grid h-7 w-7 flex-shrink-0 place-items-center overflow-hidden rounded-full bg-primary/20 text-[11px] font-bold text-primary">
            {isKeyo ? (
              <Sparkles className="h-3.5 w-3.5" />
            ) : sender?.avatar_url ? (
              <img src={sender.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              initials(senderName)
            )}
          </div>
        )}
        <div>
          {!isMine && (
            <p className="mb-0.5 px-1 text-[11px] font-medium text-muted-foreground">
              {senderName}
            </p>
          )}

          {message.message_type === "expense" ? (
            <ExpenseCard
              message={message}
              currentUserId={currentUserId}
              members={members}
              onToggleSettle={onToggleSettle}
            />
          ) : message.message_type === "poll" && message.poll ? (
            <PollCard poll={message.poll} currentUserId={currentUserId} onVote={onVote} />
          ) : (
            <div
              className={`rounded-2xl px-4 py-2.5 text-sm ${
                isKeyo
                  ? "glass-card border border-primary/30"
                  : isMine
                    ? "bg-primary text-primary-foreground"
                    : "bg-surface"
              }`}
            >
              {message.content}
            </div>
          )}

          <div className="mt-1 flex items-center gap-1 px-1">
            <p className="text-[10px] text-muted-foreground">
              {format(new Date(message.created_at), "h:mm a")}
            </p>
            <button
              type="button"
              onClick={() => setPickerOpen((v) => !v)}
              className="ml-1 rounded-full px-1.5 text-[11px] text-muted-foreground hover:bg-surface"
              aria-label="React"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>

          {pickerOpen && (
            <div className="glass-card mt-1 flex gap-1 rounded-full p-1">
              {REACTION_EMOJI.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    onToggleReaction(emoji);
                    setPickerOpen(false);
                  }}
                  className="grid h-7 w-7 place-items-center rounded-full text-sm hover:bg-surface-elevated"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {reactionGroups.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1 px-1">
              {reactionGroups.map(([emoji, userIds]) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => onToggleReaction(emoji)}
                  className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
                    currentUserId && userIds.includes(currentUserId)
                      ? "bg-primary/20 text-primary"
                      : "bg-surface"
                  }`}
                >
                  <span>{emoji}</span>
                  <span>{userIds.length}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ExpenseCard({
  message,
  currentUserId,
  members,
  onToggleSettle,
}: {
  message: ChatMessage;
  currentUserId: string | null;
  members: Member[];
  onToggleSettle: () => void;
}) {
  const meta = message.metadata;
  const settledBy: string[] = meta.settled_by ?? [];
  const splitAmong: string[] = meta.split_among ?? [];
  const iSettled = currentUserId ? settledBy.includes(currentUserId) : false;
  const perPerson = splitAmong.length ? (meta.amount / splitAmong.length).toFixed(2) : meta.amount;
  const payerName =
    members.find((m) => m.user_id === meta.paid_by)?.profile?.full_name ?? "Someone";

  return (
    <div className="glass-card w-64 rounded-2xl p-4">
      <div className="flex items-center gap-2 text-primary">
        <Wallet className="h-4 w-4" />
        <p className="text-xs font-semibold uppercase tracking-wide">Expense</p>
      </div>
      <p className="mt-2 font-display text-lg font-bold">
        {meta.currency} {meta.amount}
      </p>
      <p className="text-sm text-muted-foreground">{meta.description}</p>
      <p className="mt-2 text-xs text-muted-foreground">
        {payerName} paid · split {splitAmong.length} way{splitAmong.length === 1 ? "" : "s"} (~
        {meta.currency} {perPerson} each)
      </p>
      <Button
        type="button"
        size="sm"
        variant={iSettled ? "secondary" : "outline"}
        className="mt-3 w-full"
        onClick={onToggleSettle}
      >
        {iSettled ? <Check className="h-3.5 w-3.5" /> : null}
        {iSettled ? "You've settled" : "Mark as paid"}
      </Button>
    </div>
  );
}

function PollCard({
  poll,
  currentUserId,
  onVote,
}: {
  poll: PollState;
  currentUserId: string | null;
  onVote: (optionId: string) => void;
}) {
  const totalVotes = poll.options.reduce((sum, o) => sum + o.voterIds.length, 0);
  return (
    <div className="glass-card w-64 rounded-2xl p-4">
      <div className="flex items-center gap-2 text-primary">
        <BarChart3 className="h-4 w-4" />
        <p className="text-xs font-semibold uppercase tracking-wide">Poll</p>
      </div>
      <p className="mt-2 text-sm font-semibold">{poll.question}</p>
      <div className="mt-3 space-y-2">
        {poll.options.map((option) => {
          const pct = totalVotes ? Math.round((option.voterIds.length / totalVotes) * 100) : 0;
          const mine = currentUserId ? option.voterIds.includes(currentUserId) : false;
          return (
            <button
              key={option.id}
              type="button"
              disabled={poll.locked}
              onClick={() => onVote(option.id)}
              className="relative block w-full overflow-hidden rounded-xl bg-surface px-3 py-2 text-left text-xs disabled:opacity-60"
            >
              <div
                className="absolute inset-y-0 left-0 bg-primary/20 transition-all"
                style={{ width: `${pct}%` }}
              />
              <div className="relative flex items-center justify-between">
                <span className="flex items-center gap-1 font-medium">
                  {mine && <Check className="h-3 w-3 text-primary" />}
                  {option.text}
                </span>
                <span className="text-muted-foreground">{pct}%</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ExpenseDialog({
  open,
  onOpenChange,
  members,
  currency,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: Member[];
  currency: string;
  onSubmit: (input: { description: string; amount: number; splitAmong: string[] }) => void;
  submitting: boolean;
}) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [splitAmong, setSplitAmong] = useState<string[]>(members.map((m) => m.user_id));

  useEffect(() => {
    if (open) setSplitAmong(members.map((m) => m.user_id));
  }, [open, members]);

  function toggleMember(userId: string) {
    setSplitAmong((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  }

  function submit() {
    if (submitting) return;
    const value = parseFloat(amount);
    if (!description.trim() || !value || value <= 0 || splitAmong.length === 0) {
      toast.error("Add a description, amount, and at least one person to split with");
      return;
    }
    onSubmit({ description: description.trim(), amount: value, splitAmong });
    setDescription("");
    setAmount("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add an expense</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            placeholder="What was it for?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Input
            type="number"
            placeholder={`Amount (${currency})`}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">Split among</p>
            <div className="flex flex-wrap gap-2">
              {members.map((m) => (
                <button
                  key={m.user_id}
                  type="button"
                  onClick={() => toggleMember(m.user_id)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                    splitAmong.includes(m.user_id)
                      ? "bg-primary text-primary-foreground"
                      : "bg-surface text-muted-foreground"
                  }`}
                >
                  {m.profile?.full_name ?? "Member"}
                </button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? "Adding…" : "Add expense"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PollDialog({
  open,
  onOpenChange,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: { question: string; options: string[] }) => void;
  submitting: boolean;
}) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);

  useEffect(() => {
    if (open) {
      setQuestion("");
      setOptions(["", ""]);
    }
  }, [open]);

  function updateOption(index: number, value: string) {
    setOptions((prev) => prev.map((o, i) => (i === index ? value : o)));
  }

  function submit() {
    if (submitting) return;
    const cleanOptions = options.map((o) => o.trim()).filter(Boolean);
    if (!question.trim() || cleanOptions.length < 2) {
      toast.error("Add a question and at least 2 options");
      return;
    }
    onSubmit({ question: question.trim(), options: cleanOptions });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a poll</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            placeholder="Ask the group something…"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
          {options.map((option, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                placeholder={`Option ${i + 1}`}
                value={option}
                onChange={(e) => updateOption(i, e.target.value)}
              />
              {options.length > 2 && (
                <button
                  type="button"
                  onClick={() => setOptions((prev) => prev.filter((_, idx) => idx !== i))}
                  aria-label="Remove option"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
            </div>
          ))}
          {options.length < 6 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setOptions((prev) => [...prev, ""])}
            >
              <Plus className="h-3.5 w-3.5" /> Add option
            </Button>
          )}
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? "Creating…" : "Create poll"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
