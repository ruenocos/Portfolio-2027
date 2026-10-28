"use client";

import { useRef, useState } from "react";
import { announce, getMotion } from "@/lib/motion";
import { isBusy, select, wessel } from "@/lib/wessel";

/**
 * The email is its own copy button: click it and it's on your clipboard.
 * Wessel comes over, selects it and hits ⌘C with you; your tag says
 * "Copied". Feedback lines are in Wessel's voice (from the prototype). If
 * the clipboard is blocked, the address gets selected instead.
 */
export function CopyEmail({ email }: { email: string }) {
  const el = useRef<HTMLAnchorElement>(null);
  const [copied, setCopied] = useState(false);
  const timer = useRef(0);

  const you = (text: string) => dispatchEvent(new CustomEvent("wsl:you", { detail: text }));

  const wes = async (a: HTMLElement) => {
    // Mid-beat (his footer moment, say) he finishes that job instead.
    if (getMotion().calm || isBusy()) return;
    await wessel.go(wessel.at(a, 1, 0.55, 14, 0), { k: 320, timeout: 600 });
    select(a, { label: false, ms: 1100 });
    wessel.press(true);
    wessel.chip("⌘C");
    setTimeout(() => wessel.press(false), 120);
    setTimeout(() => wessel.free(), 1100);
  };

  const copy = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const a = el.current!;
    try {
      await navigator.clipboard.writeText(email);
      announce("Copied. Talk soon.");
      you("Copied");
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 1400);
      void wes(a);
    } catch {
      getSelection()?.selectAllChildren(a);
      announce("Couldn’t copy. Select it instead.");
    }
  };

  return (
    <a
      ref={el}
      id="mail"
      className="mail"
      href={`mailto:${email}`}
      data-you="Copy"
      data-copied={copied || undefined}
      onClick={copy}
    >
      {email}
      <span className="sr-only"> (copies the address)</span>
      <span className="copied opill text-micro-caps" aria-hidden="true">
        Copied
      </span>
    </a>
  );
}
