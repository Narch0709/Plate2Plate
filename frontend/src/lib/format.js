export function timeLeft(iso) {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "Expired";
  const mins = Math.floor(ms / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m left` : `${m}m left`;
}

export const shortDate = (iso) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

export const STATUS = {
  available: { label: "Available", tone: "text-brand border-brand" },
  claimed: { label: "Claimed", tone: "text-ink border-ink" },
  in_transit: { label: "On the way", tone: "text-accent border-accent" },
  picked_up: { label: "Picked up", tone: "text-accent border-accent" },
  delivered: { label: "Delivered", tone: "text-brand border-brand" },
  cancelled: { label: "Cancelled", tone: "text-danger border-danger" },
  expired: { label: "Expired", tone: "text-muted border-line" },
};