import type Lenis from "lenis";

// The one Lenis instance (desktop mouse only, never while calm), so the
// phone menu and page changes can stop it or jump it.
let lenis: Lenis | null = null;

export const getLenis = () => lenis;
export const setLenis = (l: Lenis | null) => void (lenis = l);
