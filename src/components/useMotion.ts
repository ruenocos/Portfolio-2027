"use client";

import { useSyncExternalStore } from "react";
import { useMode } from "@/components/ModeProvider";
import { getMotion, getServerMotion, subscribeMotion } from "@/lib/motion";

// Everything that moves asks this first: Pause motion and the system's
// reduced-motion setting. The mode rides along for what needs it.
export function useMotion() {
  const motion = useSyncExternalStore(subscribeMotion, getMotion, getServerMotion);
  const mode = useMode();
  return { ...motion, mode };
}
