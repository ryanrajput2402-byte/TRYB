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
import {
  ArrowLeft,
  Send,
  Wallet,
  BarChart3,
  Check,
  Plus,
  X,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { format } from "date-fns";
import { formatCompactRange } from "@/lib/format-date";
import { trackEvent } from "@/lib/analytics";

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

type ExpenseRow = {
  id: string;
  payer_id: string;
  amount: number;
  currency: string;
  split_user_ids: string[];
  settled_by: string[];
  category: string | null;
};

// Group E, item 1 — a real, informal running-spend line a member added,
// deliberately separate from the settled `expenses` above.
type SpendEstimateRow = {
  id: string;
  user_id: string;
  amount: number;
  note: string | null;
};

const REACTION_EMOJI = ["❤️", "😂", "👍", "😮", "🙌"];

// Group E, item 2 — optional expense category, matches the DB check
// constraint (stay/travel/food/other).
const EXPENSE_CATEGORIES: { id: string; label: string; emoji: string }[] = [
  { id: "stay", label: "Stay", emoji: "🏠" },
  { id: "travel", label: "Travel", emoji: "✈️" },
  { id: "food", label: "Food", emoji: "🍜" },
  { id: "other", label: "Other", emoji: "📦" },
];

// Keyo is the only element in this screen allowed a gradient/glow treatment —
// deliberately soft (low alpha, tight blur) so it reads as a quiet accent
// rather than a neon sign. Everything else uses flat solid pine/clay.
const KEYO_BORDER_GRADIENT = "var(--gradient-earth-soft)";
const KEYO_GLOW_SHADOW = "var(--keyo-glow-shadow)";


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

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === now.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return format(d, "MMM d");
}

function scrollToMessage(id: string) {
  document.getElementById(`msg-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
}

export function GroupChat({ tripId }: { tripId: string }) {
  // Chat has moved onto the TRYB visual identity — same scoped-class
  // mechanism the season themes used (this literal replaces what used to be
  // a seasonThemeClassName() lookup), so nothing else in this file changes.
  const themeClassName = "tryb-theme";
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [spendEstimates, setSpendEstimates] = useState<SpendEstimateRow[]>([]);
  const [composerText, setComposerText] = useState("");
  const [sending, setSending] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [estimateOpen, setEstimateOpen] = useState(false);
  const [pollOpen, setPollOpen] = useState(false);
  const [creatingExpense, setCreatingExpense] = useState(false);
  const [addingEstimate, setAddingEstimate] = useState(false);
  const [creatingPoll, setCreatingPoll] = useState(false);
  const [tripCurrency, setTripCurrency] = useState("USD");
  const [tripBudgetMax, setTripBudgetMax] = useState<number | null>(null);
  const [tripName, setTripName] = useState("");
  const [tripPhoto, setTripPhoto] = useState<string | null>(null);
  const [tripStart, setTripStart] = useState<string | null>(null);
  const [tripEnd, setTripEnd] = useState<string | null>(null);

  const membersById = useMemo(() => {
    const map = new Map<string, Member>();
    members.forEach((m) => map.set(m.user_id, m));
    return map;
  }, [members]);

  const pollMessageIdByPollId = useRef(new Map<string, string>());
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const composerInputRef = useRef<HTMLInputElement | null>(null);

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
        .select("currency, destination, cover_image, start_date, end_date, budget_max")
        .eq("id", tripId)
        .maybeSingle();
      if (!cancelled && trip?.currency) setTripCurrency(trip.currency);
      if (!cancelled && trip) {
        setTripName(trip.destination ?? "");
        setTripPhoto(trip.cover_image ?? null);
        setTripStart(trip.start_date ?? null);
        setTripEnd(trip.end_date ?? null);
        setTripBudgetMax(trip.budget_max ?? null);
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

      const { data: expenseRows } = await supabase
        .from("expenses")
        .select("id, payer_id, amount, currency, split_user_ids, settled_by, category")
        .eq("trip_id", tripId);
      if (!cancelled) setExpenses((expenseRows ?? []) as ExpenseRow[]);

      const { data: estimateRows } = await supabase
        .from("trip_spend_estimates")
        .select("id, user_id, amount, note")
        .eq("trip_id", tripId);
      if (!cancelled) setSpendEstimates((estimateRows ?? []) as SpendEstimateRow[]);

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
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "expenses", filter: `trip_id=eq.${tripId}` },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const old = payload.old as any;
            setExpenses((prev) => prev.filter((e) => e.id !== old.id));
            return;
          }
          const row = payload.new as ExpenseRow;
          setExpenses((prev) => {
            const exists = prev.some((e) => e.id === row.id);
            return exists ? prev.map((e) => (e.id === row.id ? row : e)) : [...prev, row];
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "trip_spend_estimates", filter: `trip_id=eq.${tripId}` },
        (payload) => {
          const row = payload.new as SpendEstimateRow;
          setSpendEstimates((prev) => (prev.some((e) => e.id === row.id) ? prev : [...prev, row]));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Item 7: pinned balance strip data — derived entirely from real expenses
  // rows (payer, split, settled_by), no fabricated numbers.
  const balance = useMemo(() => {
    if (!currentUserId) return { owe: 0, owed: 0 };
    let owe = 0;
    let owed = 0;
    expenses.forEach((e) => {
      const split = e.split_user_ids?.length || 0;
      if (!split) return;
      const share = e.amount / split;
      const settled = new Set(e.settled_by ?? []);
      if (e.payer_id === currentUserId) {
        e.split_user_ids.forEach((uid) => {
          if (uid !== currentUserId && !settled.has(uid)) owed += share;
        });
      } else if (e.split_user_ids.includes(currentUserId) && !settled.has(currentUserId)) {
        owe += share;
      }
    });
    return { owe, owed };
  }, [expenses, currentUserId]);

  // Group E, item 1 — sum of real, informal estimate entries (never the
  // settled `expenses` above). Item 4 — real logged expenses total, for the
  // budget bar. Item 2 — per-category-per-person breakdown, only computed
  // once real expenses exist to categorize.
  const estimateSum = useMemo(
    () => spendEstimates.reduce((sum, e) => sum + Number(e.amount), 0),
    [spendEstimates],
  );
  const expensesTotal = useMemo(
    () => expenses.reduce((sum, e) => sum + Number(e.amount), 0),
    [expenses],
  );
  const categoryBreakdown = useMemo(() => {
    if (expenses.length === 0) return null;
    const sums = new Map<string, number>();
    expenses.forEach((e) => {
      const cat = e.category ?? "other";
      sums.set(cat, (sums.get(cat) ?? 0) + Number(e.amount));
    });
    const headcount = members.length || 1;
    return Array.from(sums.entries()).map(([category, total]) => ({
      category,
      perPerson: total / headcount,
    }));
  }, [expenses, members]);

  const activePollMessage = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.message_type === "poll" && m.poll && !m.poll.locked) return m;
    }
    return null;
  }, [messages]);

  // Item 5: day dividers + consecutive-sender grouping, computed once per
  // messages change instead of per-row so grouping stays consistent.
  type ListItem =
    | { kind: "divider"; key: string; label: string }
    | { kind: "message"; key: string; message: ChatMessage; showMeta: boolean };

  const listItems = useMemo<ListItem[]>(() => {
    const items: ListItem[] = [];
    let lastDay: string | null = null;
    let lastGroupKey: string | null = null;
    for (const m of messages) {
      const day = new Date(m.created_at).toDateString();
      if (day !== lastDay) {
        items.push({ kind: "divider", key: `d-${day}`, label: dayLabel(m.created_at) });
        lastDay = day;
        lastGroupKey = null;
      }
      const groupKey =
        m.message_type === "system" ? null : m.message_type === "keyo" ? "keyo" : (m.sender_id ?? "unknown");
      const showMeta = m.message_type !== "system" && groupKey !== lastGroupKey;
      items.push({ kind: "message", key: m.id, message: m, showMeta });
      lastGroupKey = groupKey;
    }
    return items;
  }, [messages]);

  function askKeyo() {
    setComposerText((t) => {
      const trimmed = t.trim();
      if (/^\/keyo\b/i.test(trimmed)) return t;
      return trimmed ? `/keyo ${trimmed}` : "/keyo ";
    });
    requestAnimationFrame(() => composerInputRef.current?.focus());
  }

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
    category: string;
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
          category: input.category,
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
          category: input.category,
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

  // Group E, item 1 — adds one real, informal estimate line. Never touches
  // the settled `expenses` table.
  async function addSpendEstimate(input: { amount: number; note: string }) {
    if (!currentUserId || addingEstimate) return;
    setAddingEstimate(true);
    try {
      const { error } = await supabase.from("trip_spend_estimates").insert({
        trip_id: tripId,
        user_id: currentUserId,
        amount: input.amount,
        note: input.note.trim() || null,
      });
      if (error) throw error;
      trackEvent({ name: "spend_estimate_added", tripId, amount: input.amount });
      setEstimateOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't add estimate");
    } finally {
      setAddingEstimate(false);
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
      <div className={`${themeClassName} -mb-24 flex min-h-screen items-center justify-center bg-sand text-sm text-ink/50`}>
        Loading chat…
      </div>
    );
  }

  return (
    // -mb-24 cancels the shared `_authenticated` layout's `pb-24` (reserved
    // for the BottomNav, which chat doesn't use — it has its own fixed
    // input bar). Scoped to this component only; the shared layout file is
    // untouched. That reserved gap always existed, it just blended into the
    // old dark background — it becomes visible against a light theme.
    <div className={`${themeClassName} -mb-24 flex min-h-screen flex-col bg-sand`}>
      <div className="sticky top-0 z-20">
        <ChatHeader
          tripId={tripId}
          members={members}
          tripName={tripName}
          tripPhoto={tripPhoto}
          tripStart={tripStart}
          tripEnd={tripEnd}
        />
        <PinnedStrip
          activePollMessage={activePollMessage}
          balance={balance}
          onScrollToPoll={() => activePollMessage && scrollToMessage(activePollMessage.id)}
          estimateSum={estimateSum}
          expensesTotal={expensesTotal}
          budgetMax={tripBudgetMax}
          categoryBreakdown={categoryBreakdown}
          onAddEstimate={() => setEstimateOpen(true)}
          onAddExpense={() => setExpenseOpen(true)}
        />
      </div>

      <main className="flex-1 overflow-y-auto px-4 pb-40 pt-4">
        {messages.length === 0 && (
          <div className="warm-card shadow-warm mx-auto mt-10 max-w-sm rounded-3xl p-7 text-center">
            <div className="bg-pine mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full">
              <Sparkles className="h-5 w-5 text-cream" />
            </div>
            <h2 className="fomo-heading text-lg font-bold text-ink">
              This is the start of {tripName || "your trip"}'s planning
            </h2>
            <p className="mt-2 text-sm text-ink/60">
              Say hi to the group, ask Keyo for ideas, or kick off a poll to get things moving.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={askKeyo}
                className="warm-card rounded-full px-3.5 py-1.5 text-xs font-medium text-ink/90 hover:bg-ink/5"
              >
                ✨ Ask Keyo something
              </button>
              <button
                type="button"
                onClick={() => setPollOpen(true)}
                className="warm-card rounded-full px-3.5 py-1.5 text-xs font-medium text-ink/90 hover:bg-ink/5"
              >
                🗳️ Start a poll
              </button>
            </div>
          </div>
        )}
        {listItems.map((item) =>
          item.kind === "divider" ? (
            <DayDivider key={item.key} label={item.label} />
          ) : (
            <div
              key={item.key}
              id={`msg-${item.message.id}`}
              className={item.showMeta ? "mt-4" : "mt-1"}
            >
              <MessageRow
                message={item.message}
                showMeta={item.showMeta}
                isMine={item.message.sender_id === currentUserId}
                sender={
                  item.message.sender_id
                    ? (membersById.get(item.message.sender_id)?.profile ?? null)
                    : null
                }
                currentUserId={currentUserId}
                members={members}
                onToggleReaction={(emoji) => toggleReaction(item.message, emoji)}
                onVote={(optionId) => item.message.poll && vote(item.message.poll.id, optionId)}
                onToggleSettle={() => toggleSettle(item.message)}
              />
            </div>
          ),
        )}
        <div ref={bottomRef} />
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ink/10 bg-sand/90 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="flex-shrink-0 text-ink/60 hover:bg-ink/5 hover:text-ink"
            onClick={() => setExpenseOpen(true)}
            aria-label="Add expense"
          >
            <Wallet className="h-5 w-5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="flex-shrink-0 text-ink/60 hover:bg-ink/5 hover:text-ink"
            onClick={() => setPollOpen(true)}
            aria-label="Add poll"
          >
            <BarChart3 className="h-5 w-5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="flex-shrink-0 text-ink/60 hover:bg-ink/5 hover:text-ink"
            onClick={askKeyo}
            aria-label="Ask Keyo"
          >
            <Sparkles className="h-5 w-5" />
          </Button>
          <Input
            ref={composerInputRef}
            value={composerText}
            onChange={(e) => setComposerText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Message the group…"
            className="flex-1 rounded-full border-ink/15 bg-cream/70 text-ink placeholder:text-ink/35"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="bg-pine flex-shrink-0 rounded-full text-cream hover:opacity-90"
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
        onSubmit={createExpense}
        submitting={creatingExpense}
        themeClassName={themeClassName}
      />
      <PollDialog
        open={pollOpen}
        onOpenChange={setPollOpen}
        onSubmit={createPoll}
        submitting={creatingPoll}
        themeClassName={themeClassName}
      />
      <SpendEstimateDialog
        open={estimateOpen}
        onOpenChange={setEstimateOpen}
        onSubmit={addSpendEstimate}
        submitting={addingEstimate}
        themeClassName={themeClassName}
      />
    </div>
  );
}

function ChatHeader({
  tripId,
  members,
  tripName,
  tripPhoto,
  tripStart,
  tripEnd,
}: {
  tripId: string;
  members: Member[];
  tripName: string;
  tripPhoto: string | null;
  tripStart: string | null;
  tripEnd: string | null;
}) {
  return (
    <header className="warm-card flex items-center gap-3 border-0 border-b border-ink/8 px-4 pt-[calc(env(safe-area-inset-top)+12px)] pb-3 backdrop-blur-xl">
      <Link
        to="/trip/$tripId"
        params={{ tripId }}
        className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full bg-ink/5 text-ink hover:bg-ink/10"
        aria-label="Back to trip"
      >
        <ArrowLeft className="h-4 w-4" />
      </Link>
      <div className="bg-pine/15 h-10 w-10 flex-shrink-0 overflow-hidden rounded-full ring-1 ring-ink/10">
        {tripPhoto ? (
          <img src={tripPhoto} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center text-sm font-bold text-ink">
            {initials(tripName)}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h1 className="fomo-heading truncate text-lg font-bold text-ink">
          {tripName || "Group chat"}
        </h1>
        <p className="truncate text-xs text-ink/55">
          {members.length} member{members.length === 1 ? "" : "s"}
          {tripStart && tripEnd ? ` · ${formatCompactRange(tripStart, tripEnd)}` : ""}
        </p>
      </div>
      <div className="flex -space-x-2">
        {members.slice(0, 4).map((m) => (
          <div
            key={m.user_id}
            className="ring-sand h-8 w-8 flex-shrink-0 overflow-hidden rounded-full ring-2"
          >
            {m.profile?.avatar_url ? (
              <img src={m.profile.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="bg-pine/15 grid h-full w-full place-items-center text-xs font-bold text-ink">
                {initials(m.profile?.full_name)}
              </div>
            )}
          </div>
        ))}
      </div>
    </header>
  );
}

function PinnedStrip({
  activePollMessage,
  balance,
  onScrollToPoll,
  estimateSum,
  expensesTotal,
  budgetMax,
  categoryBreakdown,
  onAddEstimate,
  onAddExpense,
}: {
  activePollMessage: ChatMessage | null;
  balance: { owe: number; owed: number };
  onScrollToPoll: () => void;
  estimateSum: number;
  expensesTotal: number;
  budgetMax: number | null;
  categoryBreakdown: { category: string; perPerson: number }[] | null;
  onAddEstimate: () => void;
  onAddExpense: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const hasBalance = balance.owe > 0 || balance.owed > 0;
  const hasPoll = !!activePollMessage?.poll;
  // Group E's Budget row is always offered (even with nothing logged yet)
  // so the running-estimate tracker and "add first expense" nudge stay
  // discoverable — never hidden behind an empty strip.

  const totalVotes = activePollMessage?.poll
    ? activePollMessage.poll.options.reduce((s, o) => s + o.voterIds.length, 0)
    : 0;

  return (
    <div className="border-b border-ink/8 bg-pine/[0.05] px-4 py-2 backdrop-blur-md">
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="flex w-full items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-ink/45"
        aria-expanded={!collapsed}
      >
        Pinned
        {collapsed ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
      </button>
      {!collapsed && (
        <div className="mt-1.5 space-y-1.5">
          {hasPoll && (
            <button
              type="button"
              onClick={onScrollToPoll}
              className="flex w-full items-center gap-2 text-left"
            >
              <BarChart3 className="text-clay h-3.5 w-3.5 flex-shrink-0" />
              <span className="min-w-0 flex-1 truncate text-xs text-ink/75">
                <span className="font-semibold text-ink">Active poll</span> ·{" "}
                {activePollMessage!.poll!.question}
              </span>
              <span className="flex-shrink-0 text-ink/45">
                {totalVotes} vote{totalVotes === 1 ? "" : "s"}
              </span>
            </button>
          )}
          {hasBalance && (
            <div className="flex w-full items-center gap-2">
              <Wallet className="text-clay h-3.5 w-3.5 flex-shrink-0" />
              <span className="min-w-0 flex-1 truncate text-xs text-ink/75">
                {balance.owed > 0 && (
                  <>
                    You're owed{" "}
                    <span className="text-pine font-semibold">
                      ₹{balance.owed.toFixed(2)}
                    </span>
                  </>
                )}
                {balance.owed > 0 && balance.owe > 0 && " · "}
                {balance.owe > 0 && (
                  <>
                    You owe{" "}
                    <span className="font-semibold text-clay">
                      ₹{balance.owe.toFixed(2)}
                    </span>
                  </>
                )}
              </span>
            </div>
          )}
          {/* Group E — items 1, 2, 4, 7: informal running estimate, real
              per-category breakdown (once expenses exist), and a real
              logged-vs-budget bar, all from real data, never fabricated. */}
          <div className={`space-y-1.5 ${hasPoll || hasBalance ? "border-t border-ink/8 pt-1.5" : ""}`}>
            <div className="flex w-full items-center gap-2">
              <Wallet className="text-clay h-3.5 w-3.5 flex-shrink-0" />
              <span className="min-w-0 flex-1 truncate text-xs text-ink/75">
                {estimateSum > 0 ? (
                  <>
                    ~
                    <span className="font-semibold text-ink">
                      ₹{estimateSum.toFixed(0)}
                    </span>{" "}
                    estimated so far
                  </>
                ) : (
                  "No spend estimate yet"
                )}
              </span>
              <button
                type="button"
                onClick={onAddEstimate}
                className="text-pine flex-shrink-0 text-[11px] font-semibold"
              >
                + Add
              </button>
            </div>

            {categoryBreakdown ? (
              <p className="pl-5 text-[11px] text-ink/55">
                {categoryBreakdown.map((c, i) => (
                  <span key={c.category}>
                    {i > 0 && " · "}
                    {EXPENSE_CATEGORIES.find((e) => e.id === c.category)?.label ?? "Other"}{" "}
                    ₹{c.perPerson.toFixed(0)}/person
                  </span>
                ))}
              </p>
            ) : (
              <button
                type="button"
                onClick={onAddExpense}
                className="pl-5 text-left text-[11px] text-ink/45 underline decoration-dotted"
              >
                No expenses logged yet — add the first one
              </button>
            )}

            {budgetMax != null && (
              <div className="pl-5">
                <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-ink/10">
                  <div
                    className="bg-pine absolute inset-y-0 left-0 rounded-full transition-all"
                    style={{ width: `${Math.min(100, (expensesTotal / budgetMax) * 100)}%` }}
                  />
                </div>
                <p className="mt-1 text-[10px] text-ink/45">
                  ₹{expensesTotal.toFixed(0)} logged of ₹{budgetMax} budget
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DayDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="h-px flex-1 bg-ink/10" />
      <span className="flex-shrink-0 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink/45">
        {label}
      </span>
      <div className="h-px flex-1 bg-ink/10" />
    </div>
  );
}

function MessageRow({
  message,
  isMine,
  sender,
  currentUserId,
  members,
  showMeta,
  onToggleReaction,
  onVote,
  onToggleSettle,
}: {
  message: ChatMessage;
  isMine: boolean;
  sender: Profile | null;
  currentUserId: string | null;
  members: Member[];
  showMeta: boolean;
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
    return (
      <p className="py-1 text-center text-[10px] font-semibold uppercase tracking-[0.15em] text-ink/40">
        {message.content}
      </p>
    );
  }

  const showAvatarName = !isMine && showMeta;

  return (
    <div className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}>
      <div
        className={`flex max-w-[85%] items-end gap-2 sm:max-w-[70%] ${isMine ? "flex-row-reverse" : ""}`}
      >
        {!isMine && (
          <div className="h-7 w-7 flex-shrink-0">
            {showAvatarName &&
              (isKeyo ? (
                <div
                  className="h-7 w-7 rounded-full p-[1.5px]"
                  style={{ background: KEYO_BORDER_GRADIENT }}
                >
                  <div className="bg-cream grid h-full w-full place-items-center rounded-full">
                    <Sparkles className="text-pine h-3.5 w-3.5" />
                  </div>
                </div>
              ) : sender?.avatar_url ? (
                <img
                  src={sender.avatar_url}
                  alt=""
                  className="h-7 w-7 rounded-full object-cover"
                />
              ) : (
                <div className="bg-pine/15 grid h-7 w-7 place-items-center rounded-full text-[11px] font-bold text-ink">
                  {initials(senderName)}
                </div>
              ))}
          </div>
        )}
        <div className="min-w-0">
          {showAvatarName && (
            <p
              className={`mb-0.5 flex items-center gap-1 px-1 text-[11px] ${
                isKeyo
                  ? "text-gradient-earth font-bold uppercase tracking-wide"
                  : "font-medium text-ink/55"
              }`}
            >
              {isKeyo && <Sparkles className="h-2.5 w-2.5" />}
              {senderName}
              {isKeyo && (
                <span className="font-normal normal-case tracking-normal text-ink/35">
                  · in this chat
                </span>
              )}
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
          ) : isKeyo ? (
            <div
              className="rounded-2xl p-[1px]"
              style={{ background: KEYO_BORDER_GRADIENT, boxShadow: KEYO_GLOW_SHADOW }}
            >
              <div className="bg-cream/95 rounded-2xl px-4 py-2.5 text-sm text-ink/90 backdrop-blur-xl">
                {message.content}
              </div>
            </div>
          ) : (
            <div
              className={`rounded-2xl px-4 py-2.5 text-sm ${
                isMine ? "bg-clay text-white" : "border border-ink/5 bg-cream shadow-warm-sm text-ink/90"
              }`}
            >
              {message.content}
            </div>
          )}

          <div className="mt-1 flex items-center gap-1 px-1">
            <p className="text-[10px] text-ink/40">
              {format(new Date(message.created_at), "h:mm a")}
            </p>
            <button
              type="button"
              onClick={() => setPickerOpen((v) => !v)}
              className="ml-1 rounded-full px-1.5 text-[11px] text-ink/40 hover:bg-ink/5"
              aria-label="React"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>

          {pickerOpen && (
            <div className="warm-card mt-1 flex gap-1 rounded-full p-1">
              {REACTION_EMOJI.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    onToggleReaction(emoji);
                    setPickerOpen(false);
                  }}
                  className="grid h-7 w-7 place-items-center rounded-full text-sm hover:bg-ink/5"
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
                      ? "bg-pine text-cream"
                      : "border border-ink/8 bg-ink/[0.04] text-ink/70"
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
    <div className="warm-card shadow-warm w-64 rounded-2xl p-4">
      <div className="text-clay flex items-center gap-1.5">
        <Wallet className="h-3.5 w-3.5" />
        <p className="text-[10px] font-bold uppercase tracking-[0.15em]">Expense</p>
        {meta.category && (
          <span className="ml-auto rounded-full bg-ink/5 px-2 py-0.5 text-[9px] font-semibold text-ink/60">
            {EXPENSE_CATEGORIES.find((c) => c.id === meta.category)?.emoji ?? "📦"}{" "}
            {EXPENSE_CATEGORIES.find((c) => c.id === meta.category)?.label ?? "Other"}
          </span>
        )}
      </div>
      <p className="fomo-heading mt-2 text-lg font-bold text-ink">
        ₹{meta.amount}
      </p>
      <p className="text-sm text-ink/65">{meta.description}</p>
      <p className="mt-2 text-xs text-ink/45">
        {payerName} paid · split {splitAmong.length} way{splitAmong.length === 1 ? "" : "s"} (~
        ₹{perPerson} each)
      </p>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className={`mt-3 w-full border ${
          iSettled
            ? "border-pine/30 bg-pine/15 text-pine hover:bg-pine/20"
            : "border-ink/20 bg-transparent text-ink hover:bg-ink/5"
        }`}
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
    <div className="warm-card shadow-warm w-64 rounded-2xl p-4">
      <div className="text-clay flex items-center gap-1.5">
        <BarChart3 className="h-3.5 w-3.5" />
        <p className="text-[10px] font-bold uppercase tracking-[0.15em]">
          {poll.locked ? "Poll · closed" : "Poll"}
        </p>
      </div>
      <p className="mt-2 text-sm font-semibold text-ink">{poll.question}</p>
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
              className="relative block w-full overflow-hidden rounded-xl bg-ink/5 px-3 py-2 text-left text-xs disabled:opacity-60"
            >
              <div
                className="bg-pine absolute inset-y-0 left-0 opacity-15 transition-all"
                style={{ width: `${pct}%` }}
              />
              <div className="relative flex items-center justify-between text-ink/90">
                <span className="flex items-center gap-1 font-medium">
                  {mine && <Check className="text-pine h-3 w-3" />}
                  {option.text}
                </span>
                <span className="text-ink/45">{pct}%</span>
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
  onSubmit,
  submitting,
  themeClassName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: Member[];
  onSubmit: (input: { description: string; amount: number; splitAmong: string[]; category: string }) => void;
  submitting: boolean;
  themeClassName: string;
}) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("other");
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
    onSubmit({ description: description.trim(), amount: value, splitAmong, category });
    setDescription("");
    setAmount("");
    setCategory("other");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${themeClassName} border-ink/10 bg-sand sm:rounded-3xl`}>
        <DialogHeader>
          <DialogTitle className="fomo-heading text-ink">Add an expense</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            placeholder="What was it for?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="border-ink/15 bg-white/50 text-ink placeholder:text-ink/35"
          />
          <Input
            type="number"
            placeholder="Amount (₹)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="border-ink/15 bg-white/50 text-ink placeholder:text-ink/35"
          />
          <div>
            <p className="mb-2 text-xs font-medium text-ink/55">Category</p>
            <div className="flex flex-wrap gap-2">
              {EXPENSE_CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                    category === c.id ? "bg-pine text-cream" : "bg-ink/5 text-ink/60"
                  }`}
                >
                  {c.emoji} {c.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-medium text-ink/55">Split among</p>
            <div className="flex flex-wrap gap-2">
              {members.map((m) => (
                <button
                  key={m.user_id}
                  type="button"
                  onClick={() => toggleMember(m.user_id)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                    splitAmong.includes(m.user_id)
                      ? "bg-pine text-cream"
                      : "bg-ink/5 text-ink/60"
                  }`}
                >
                  {m.profile?.full_name ?? "Member"}
                </button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="ghost"
            className="bg-pine text-cream hover:opacity-90"
            onClick={submit}
            disabled={submitting}
          >
            {submitting ? "Adding…" : "Add expense"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Group E, item 1 — a quick, informal line ("flights ~₹15,000"), never a
// settled/split expense. Any approved member can add one.
function SpendEstimateDialog({
  open,
  onOpenChange,
  onSubmit,
  submitting,
  themeClassName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: { amount: number; note: string }) => void;
  submitting: boolean;
  themeClassName: string;
}) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  function submit() {
    if (submitting) return;
    const value = parseFloat(amount);
    if (!value || value <= 0) {
      toast.error("Add a rough amount first");
      return;
    }
    onSubmit({ amount: value, note });
    setAmount("");
    setNote("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${themeClassName} border-ink/10 bg-sand sm:rounded-3xl`}>
        <DialogHeader>
          <DialogTitle className="fomo-heading text-ink">Add a rough estimate</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-ink/50">
          Informal only — this isn't a settled expense, just a running number the group can track together.
        </p>
        <div className="space-y-3">
          <Input
            type="number"
            placeholder="Amount (₹)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="border-ink/15 bg-white/50 text-ink placeholder:text-ink/35"
          />
          <Input
            placeholder="What's it for? (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="border-ink/15 bg-white/50 text-ink placeholder:text-ink/35"
          />
        </div>
        <DialogFooter>
          <Button
            variant="ghost"
            className="bg-pine text-cream hover:opacity-90"
            onClick={submit}
            disabled={submitting}
          >
            {submitting ? "Adding…" : "Add estimate"}
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
  themeClassName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: { question: string; options: string[] }) => void;
  submitting: boolean;
  themeClassName: string;
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
      <DialogContent className={`${themeClassName} border-ink/10 bg-sand sm:rounded-3xl`}>
        <DialogHeader>
          <DialogTitle className="fomo-heading text-ink">Create a poll</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            placeholder="Ask the group something…"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="border-ink/15 bg-white/50 text-ink placeholder:text-ink/35"
          />
          {options.map((option, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                placeholder={`Option ${i + 1}`}
                value={option}
                onChange={(e) => updateOption(i, e.target.value)}
                className="border-ink/15 bg-white/50 text-ink placeholder:text-ink/35"
              />
              {options.length > 2 && (
                <button
                  type="button"
                  onClick={() => setOptions((prev) => prev.filter((_, idx) => idx !== i))}
                  aria-label="Remove option"
                >
                  <X className="h-4 w-4 text-ink/50" />
                </button>
              )}
            </div>
          ))}
          {options.length < 6 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-ink/60 hover:bg-ink/5 hover:text-ink"
              onClick={() => setOptions((prev) => [...prev, ""])}
            >
              <Plus className="h-3.5 w-3.5" /> Add option
            </Button>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="ghost"
            className="bg-pine text-cream hover:opacity-90"
            onClick={submit}
            disabled={submitting}
          >
            {submitting ? "Creating…" : "Create poll"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
