// The one viewer (components/viewer/Viewer.tsx): case media and the reel
// open in it. A page asks for it with openViewer(); the shell's Viewer
// listens. Plain module state, like lib/motion.

export type ViewerItem = {
  kind: "image" | "video";
  /** The picture, or the loop's poster. */
  src?: string;
  srcSet?: string;
  video?: string;
  alt: string;
  width: number;
  height: number;
  /** A reel with sound: it plays from the start, unmuted, with controls. */
  sound?: boolean;
};

export type ViewerRequest = {
  items: ViewerItem[];
  index: number;
  /** The tile it grows out of, and shrinks back into. */
  from?: HTMLElement | null;
  /** Finds the tile for another item, when you step through a gallery. */
  tileFor?: (index: number) => HTMLElement | null;
  onClose?: () => void;
};

type Listener = (r: ViewerRequest) => void;
let listener: Listener | null = null;

export function onViewer(l: Listener) {
  listener = l;
  return () => {
    if (listener === l) listener = null;
  };
}

/** Opens the viewer on items[index]. False if no viewer is mounted. */
export function openViewer(r: ViewerRequest) {
  if (!listener) return false;
  listener(r);
  return true;
}
