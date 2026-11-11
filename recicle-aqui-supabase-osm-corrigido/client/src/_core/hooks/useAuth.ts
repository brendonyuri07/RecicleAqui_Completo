import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";

export function useAuth(options?: {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
}) {
  const { redirectOnUnauthenticated = false, redirectPath } = options ?? {};
  const utils = trpc.useUtils();
  const queryClient = useQueryClient();
  const me = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });
  const logoutMutation = trpc.auth.logout.useMutation();
  const logout = useCallback(async () => {
    await logoutMutation.mutateAsync();
    await queryClient.cancelQueries();
    queryClient.clear();
    utils.auth.me.setData(undefined, null);
  }, [logoutMutation, queryClient, utils]);

  useEffect(() => {
    if (!redirectOnUnauthenticated || !me.isSuccess || me.data) return;
    if (redirectPath && window.location.pathname !== redirectPath)
      window.location.href = redirectPath;
    else if (!redirectPath) startLogin();
  }, [redirectOnUnauthenticated, redirectPath, me.isSuccess, me.data]);

  return {
    user: me.data ?? null,
    loading: me.isLoading,
    loggingOut: logoutMutation.isPending,
    error: me.error ?? logoutMutation.error ?? null,
    isAuthenticated: Boolean(me.data),
    refresh: () => me.refetch(),
    logout,
  };
}
