import { MockTag, Slot } from "./Pills";

// Facts row: three ruled cells, label on top, value in Lead 20 (the serif
// moved to hero + accent words only, Wons 2026-10-27). An optional sub line
// sits under the value in mute. A missing value shows a slot instead of an invented one.
export type Fact = { label: string; value?: string; sub?: string; mock?: boolean };

export function Facts({ items, label = "Facts" }: { items: Fact[]; label?: string }) {
  return (
    // A fact without a value (and the row, when none has one) hides like a
    // mock tag: shown again with ?mocks.
    <section className="frame" data-row aria-label={label} data-mock-only={items.every((f) => !f.value) ? "" : undefined}>
      <div className="side" />
      <dl className="facts">
        {items.map((f) => (
          <div key={f.label} className="cell" data-mock-only={f.value ? undefined : ""}>
            <dt className="text-label">
              {f.label}
              {f.mock && <MockTag>mock</MockTag>}
            </dt>
            <dd className="text-lead">{f.value ?? <Slot>{f.label.toLowerCase()} to come</Slot>}</dd>
            {f.sub && <dd className="sub text-body">{f.sub}</dd>}
          </div>
        ))}
      </dl>
      <div className="side" />
    </section>
  );
}
