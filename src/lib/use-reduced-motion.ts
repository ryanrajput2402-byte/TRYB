import { useEffect, useState } from "react";

// Always starts `false` (matching what the server rendered — SSR has no
// window/matchMedia) and corrects itself in an effect right after mount.
// The previous version read matchMedia synchronously in the lazy useState
// initializer, which also runs on the client's very first (hydration)
// render — for a reduced-motion visitor that returned `true` immediately,
// while the server-rendered HTML assumed `false`, a mismatch React can
// only recover from by discarding and re-rendering the whole subtree.
// Consumers that branch on this value into structurally different DOM
// (not just a style/class tweak) hit that as a loud hydration error.
export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = () => setReduced(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}
