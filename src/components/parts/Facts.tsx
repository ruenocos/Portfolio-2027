import { MockTag, Slot } from "./Pills";

// Facts row: three ruled cells, label on top, value in Accent 36 (Wons
// picked Accent everywhere, 2026-10-27). An optional sub line sits under the
// value in mute. A missing value shows a slot instead of an invented one.
export type Fact = { label: string; value?: string; sub?: string; mock?: boolean };

export function Facts({ items, label = "Facts" }: { items: Fact[]; label?: string }) {
  return (
    <section className="frame" data-row aria-label={label}>
      <div className="side" />
      <dl className="facts">
        {items.map((f) => (
          <div key={f.label} className="cell">
            <dt className="text-label">
              {f.label}
              {f.mock && <MockTag>mock</MockTag>}
            </dt>
            <dd className="text-accent">{f.value ?? <Slot>{f.label.toLowerCase()} to come</Slot>}</dd>
            {f.sub && <dd className="sub text-body">{f.sub}</dd>}
          </div>
        ))}
      </dl>
      <div className="side" />
    </section>
  );
}
