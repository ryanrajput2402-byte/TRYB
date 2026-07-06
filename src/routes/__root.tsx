import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
  useRouter,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { supabase } from "@/integrations/supabase/client";
import { Toaster } from "@/components/ui/sonner";
import { DEFAULT_SEASON_THEME, seasonThemeClassName } from "@/lib/seasonal-themes";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#0D0F14" },
      { title: "TRYB — Travel together. Discover more." },
      { name: "description", content: "TRYB is a social travel platform that helps you find travel companions, join real group trips, and split costs and plans right in the chat." },
      { property: "og:title", content: "TRYB — Travel together. Discover more." },
      { property: "og:description", content: "TRYB is a social travel platform that helps you find travel companions, join real group trips, and split costs and plans right in the chat." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "TRYB — Travel together. Discover more." },
      { name: "twitter:description", content: "TRYB is a social travel platform that helps you find travel companions, join real group trips, and split costs and plans right in the chat." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/97428b3f-9c9a-4b35-81bc-c8cb17e5ec48/id-preview-5f41fab6--9ca9ca99-cf71-4ccb-ac1b-a9ded8d74b81.lovable.app-1782547245169.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/97428b3f-9c9a-4b35-81bc-c8cb17e5ec48/id-preview-5f41fab6--9ca9ca99-cf71-4ccb-ac1b-a9ded8d74b81.lovable.app-1782547245169.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFound,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head><HeadContent /></head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => sub.subscription.unsubscribe();
  }, [router, queryClient]);
  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster theme="dark" position="top-center" />
    </QueryClientProvider>
  );
}

function NotFound() {
  return (
    <div className={`${seasonThemeClassName(DEFAULT_SEASON_THEME)} flex min-h-screen items-center justify-center bg-sand px-4`}>
      <div className="text-center">
        <h1 className="fomo-heading text-gradient-earth text-7xl font-bold">404</h1>
        <p className="text-ink/60 mt-2">This route doesn't exist yet.</p>
        <a href="/" className="bg-primary text-cream mt-6 inline-block rounded-full px-6 py-2 font-semibold">Go home</a>
      </div>
    </div>
  );
}
