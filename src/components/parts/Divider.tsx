import { SectionLabel } from "./SectionLabel";

// The dotted band between sections: 128px (72 on phones) or 168 tall (96),
// with the section label bottom-left. Without a label it's
// just air (the footer's spacer is one).
export function Divider({
  label,
  tall = false,
  id,
}: {
  label?: { name: string };
  tall?: boolean;
  id?: string;
}) {
  return (
    <div
      id={id}
      className={`frame divider${tall ? " divider-tall" : ""}`}
      data-row
      aria-hidden={label ? undefined : true}
    >
      <div className="side" />
      <div className="cell bg-dots">{label && <SectionLabel {...label} />}</div>
      <div className="side" />
    </div>
  );
}
