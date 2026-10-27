"use client";

import { useRef, useState } from "react";
import { announce } from "@/lib/motion";
import { useMotion } from "@/components/useMotion";

// Copy feedback in Wessel's voice (from the prototype). If the clipboard
// is blocked, the address gets selected instead.
export function CopyEmail({ email }: { email: string }) {
  const { asleep } = useMotion();
  const [label, setLabel] = useState("Copy email");
  const timer = useRef(0);

  const done = (ok: boolean) => {
    announce(
      ok
        ? asleep
          ? "Copied. Morning me will answer."
          : "Copied. Talk soon."
        : "Couldn’t copy. Select it instead.",
    );
    setLabel(ok ? "Copied" : "Select it");
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setLabel("Copy email"), 2400);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(email);
      done(true);
    } catch {
      const mail = document.getElementById("mail");
      if (mail) getSelection()?.selectAllChildren(mail);
      done(false);
    }
  };

  return (
    <button type="button" className="copy text-label" onClick={copy}>
      {label}
    </button>
  );
}
