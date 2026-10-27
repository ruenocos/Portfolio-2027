import Link from "next/link";

// Placeholder until the home build. Shows the frame, dot grid and name style.
export default function Home() {
  return (
    <main className="frame min-h-svh">
      <div className="bg-dots bg-canvas" />
      <div className="bg-dots bg-canvas flex flex-col justify-between p-inset">
        <Link href="/system" className="text-label text-grape self-end">
          System →
        </Link>
        <h1 className="text-display text-ink uppercase">Wessel Oud</h1>
      </div>
      <div className="bg-dots bg-canvas" />
    </main>
  );
}
