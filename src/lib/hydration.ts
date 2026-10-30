// Whether React has hydrated the page's content yet: nothing may write to
// that DOM before, or hydration breaks. <PageFade> marks it.
let hydrated = false;

export const markHydrated = () => void (hydrated = true);
export const isHydrated = () => hydrated;
