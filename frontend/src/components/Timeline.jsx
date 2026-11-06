const STEPS = [
  { key: "claimed", label: "Claimed", hint: "Food reserved for the NGO" },
  { key: "in_transit", label: "On the way", hint: "Volunteer is heading to the donor" },
  { key: "picked_up", label: "Picked up", hint: "Handover code verified" },
  { key: "delivered", label: "Delivered", hint: "Distributed to people in need" },
];

export default function Timeline({ status }) {
  const current = STEPS.findIndex((s) => s.key === status);

  return (
    <ol>
      {STEPS.map((s, i) => {
        const done = i <= current;
        const last = i === STEPS.length - 1;
        return (
          <li key={s.key} className="relative flex gap-3 pb-4 last:pb-0">
            {!last && (
              <span
                className={`absolute left-[5px] top-3 h-full w-px ${i < current ? "bg-brand" : "bg-line"}`}
              />
            )}
            <span
              className={`relative mt-1 h-[11px] w-[11px] shrink-0 rounded-full border-2 ${
                done ? "border-brand bg-brand" : "border-line bg-white"
              }`}
            />
            <div>
              <p
                className={`text-sm ${
                  i === current ? "font-semibold" : done ? "font-medium" : "text-muted"
                }`}
              >
                {s.label}
              </p>
              {i === current && <p className="text-xs text-muted">{s.hint}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}