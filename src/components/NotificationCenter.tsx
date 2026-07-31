import { useMemo, useState } from "react";
import { Bell, CheckCheck, Trash2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type Notification = {
  id: string;
  title: string;
  body: string;
  time: string;
  unread: boolean;
  tone: "gain" | "warn" | "info";
};

const initialNotifications: Notification[] = [
  {
    id: "order-approved",
    title: "Order approved",
    body: "Order #BS-24091 has been approved.",
    time: "2m ago",
    unread: true,
    tone: "gain",
  },
  {
    id: "silver-rate",
    title: "Silver rate updated",
    body: "Silver 999 is now ₹89,420 per kg.",
    time: "18m ago",
    unread: true,
    tone: "warn",
  },
  {
    id: "ledger-payment",
    title: "Ledger payment received",
    body: "Payment of ₹18.42 L has been received.",
    time: "1h ago",
    unread: true,
    tone: "gain",
  },
  {
    id: "invoice",
    title: "Invoice generated",
    body: "Invoice INV-24-2841 is ready to download.",
    time: "3h ago",
    unread: false,
    tone: "info",
  },
  {
    id: "referral",
    title: "New referral joined",
    body: "Kotecha & Sons joined using your referral link.",
    time: "Yesterday",
    unread: false,
    tone: "info",
  },
];

export function NotificationCenter() {
  const [notifications, setNotifications] = useState(initialNotifications);
  const unread = useMemo(
    () => notifications.filter((notification) => notification.unread).length,
    [notifications],
  );
  const markAllRead = () =>
    setNotifications((current) =>
      current.map((notification) => ({ ...notification, unread: false })),
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
              onClick={markAllRead}
              disabled={!unread}
              title="Mark all as read"
              className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-[var(--surface-2)] disabled:opacity-40"
            >
              <CheckCheck className="h-4 w-4" />
            </button>
            <button
              onClick={() => setNotifications([])}
              disabled={!notifications.length}
              title="Clear all"
              className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-[var(--surface-2)] disabled:opacity-40"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="max-h-[420px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No notifications to show.
            </div>
          ) : (
            notifications.map((notification) => (
              <button
                key={notification.id}
                onClick={() =>
                  setNotifications((current) =>
                    current.map((item) =>
                      item.id === notification.id ? { ...item, unread: false } : item,
                    ),
                  )
                }
                className="flex w-full gap-3 border-b border-border/40 p-4 text-left last:border-0 hover:bg-[var(--surface-2)]/60"
              >
                <span
                  className={
                    "mt-1.5 h-2 w-2 shrink-0 rounded-full " +
                    (notification.tone === "gain"
                      ? "bg-[var(--gain)]"
                      : notification.tone === "warn"
                        ? "bg-[var(--warn)]"
                        : "bg-[var(--platinum)]")
                  }
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span
                      className={"truncate text-sm " + (notification.unread ? "font-medium" : "")}
                    >
                      {notification.title}
                    </span>
                    <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
                      {notification.time}
                    </span>
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {notification.body}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
