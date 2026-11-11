import { trpc } from "@/lib/trpc";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  httpBatchLink,
  httpLink,
  splitLink,
  TRPCClientError,
} from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { startLogin } from "./const";
import "./index.css";
import { registerServiceWorker } from "./lib/registerServiceWorker";

registerServiceWorker();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (attempt, error) => {
        if (
          error instanceof TRPCClientError &&
          [
            "UNAUTHORIZED",
            "FORBIDDEN",
            "NOT_FOUND",
            "BAD_REQUEST",
            "SERVICE_UNAVAILABLE",
          ].includes(error.data?.code)
        )
          return false;
        return attempt < 1;
      },
    },
  },
});
const redirectIfUnauthorized = (error: unknown) => {
  if (
    error instanceof TRPCClientError &&
    error.data?.code === "UNAUTHORIZED" &&
    !["/entrar", "/cadastro"].includes(window.location.pathname)
  )
    startLogin();
};
queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error")
    redirectIfUnauthorized(event.query.state.error);
});
queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error")
    redirectIfUnauthorized(event.mutation.state.error);
});
const linkOptions = {
  url: "/api/trpc",
  transformer: superjson,
  fetch: ((input, init) =>
    globalThis.fetch(input, {
      ...init,
      credentials: "include",
    })) as typeof fetch,
};
const trpcClient = trpc.createClient({
  links: [
    splitLink({
      condition: operation => operation.path.startsWith("auth."),
      true: httpLink(linkOptions),
      false: httpBatchLink(linkOptions),
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);
