// The part of the page that changes between routes. PageSwitch plays the
// change itself (DOM veil or content fade), so this is just the wrapper.
export function PageFade({ children }: { children: React.ReactNode }) {
  return <div className="page-body">{children}</div>;
}
