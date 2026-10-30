const time = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Amsterdam" });
const zone = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Amsterdam", timeZoneName: "short" });

/** Wessel's local time with its zone, "14:32 CET", the same on Home and About. */
export const localTime = () =>
  `${time.format(new Date())} ${zone.formatToParts(new Date()).find((p) => p.type === "timeZoneName")?.value ?? ""}`.trim();
