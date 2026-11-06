import { STATUS } from "../lib/format";

export default function StatusChip({ status }) {
  const s = STATUS[status] || { label: status, tone: "text-muted border-line" };
  return (
    <span
      className={`inline-block shrink-0 rounded-[3px] border px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${s.tone}`}
    >
      {s.label}
    </span>
  );
}