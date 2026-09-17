import { useMemo } from "react";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  type DbNotification,
} from "@/hooks/use-notifications";

const toneFor: Record<DbNotification["type"], "gain" | "warn" | "info"> = {
  payment: "gain",
  rate_alert: "warn",
  order_update: "info",
  kyc: "info",
  referral: "info",
  system: "info",
};

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
  }).format(new Date(iso));
}

export function NotificationCenter() {
  const { data: notifications, isLoading, isError } = useNotifications();
  const markAllRead = useMarkAllNotificationsRead();
  const markRead = useMarkNotificationRead();

  const unread = useMemo(
    () => (notifications ?? []).filter((n) => !n.is_read).length,
    [notifications],
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="relative grid h-9 w-9 place-items-center rounded-lg border border-border/60 bg-[var(--surface-2)]"
          aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 grid min-h-4 min-w-4 place-items-center rounded-full bg-[var(--warn)] px-1 font-mono text-[9px] text-black">
              {unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[360px] border-border bg-[var(--surface-1)] p-0 shadow-2xl"
      >
        <div className="flex items-center gap-2 border-b border-border/60 p-4">
          <div>
            <div className="text-sm font-medium">Notifications</div>
            <div className="text-[11px] text-muted-foreground">
              {unread ? `${unread} unread` : "All caught up"}
            </div>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={() => markAllRead.mutate()}
              disabled={!unread || markAllRead.isPending}
              title="Mark all as read"
              className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-[var(--surface-2)] disabled:opacity-40"
            >
              <CheckCheck className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="max-h-[420px] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : isError ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Could not load notifications.
            </div>
          ) : (notifications ?? []).length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No notifications to show.
            </div>
          ) : (
            notifications!.map((notification) => {
              const tone = toneFor[notification.type] ?? "info";
              return (
                <button
                  key={notification.id}
                  onClick={() => {
                    if (!notification.is_read) markRead.mutate(notification.id);
                  }}
                  className="flex w-full gap-3 border-b border-border/40 p-4 text-left last:border-0 hover:bg-[var(--surface-2)]/60"
                >
                  <span
                    className={
                      "mt-1.5 h-2 w-2 shrink-0 rounded-full " +
                      (tone === "gain"
                        ? "bg-[var(--gain)]"
                        : tone === "warn"
                          ? "bg-[var(--warn)]"
                          : "bg-[var(--platinum)]")
                    }
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span
                        className={
                          "truncate text-sm " + (notification.is_read ? "" : "font-medium")
                        }
                      >
                        {notification.title}
                      </span>
                      <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
                        {timeAgo(notification.created_at)}
                      </span>
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {notification.body}
                    </span>
                  </span>
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}