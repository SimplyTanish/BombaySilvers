import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export type DbNotification = {
  id: string;
  title: string;
  body: string | null;
  type: "rate_alert" | "order_update" | "payment" | "kyc" | "referral" | "system";
  is_read: boolean;
  created_at: string;
  metadata: unknown;
};

export const notificationKeys = {
  all: ["notifications"] as const,
  list: ["notifications", "list"] as const,
};

async function fetchNotifications(): Promise<DbNotification[]> {
  const session = await supabase.auth.getSession();
  if (!session.data.session) return [];
  const { data, error } = await supabase
    .from("notifications")
    .select("id, title, body, type, is_read, created_at, metadata")
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    console.error("[notifications] failed to load:", error.message);
    throw error;
  }

  return (data ?? []) as DbNotification[];
}

export function useNotifications() {
  return useQuery<DbNotification[], Error>({
    queryKey: notificationKeys.list,
    queryFn: fetchNotifications,
    refetchInterval: 60 * 1000,
    staleTime: 30 * 1000,
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("is_read", false);
      if (error) throw error;
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}
