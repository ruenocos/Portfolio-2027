import type { Metadata } from "next";
import tokens from "../../../../design/tokens.json";
import { Cursor } from "@/components/canvas/Cursor";
import { Pin } from "@/components/canvas/Pin";
import { Selection } from "@/components/canvas/Selection";
import { Arrow, Play } from "@/components/parts/Arrow";
import { Crumb } from "@/components/parts/Crumb";
import { Divider } from "@/components/parts/Divider";
import { Facts } from "@/components/parts/Facts";
import { Media, MediaFigure } from "@/components/parts/Media";
import { GrapePill, KeyChip, MockTag, OutlinePill, SizePill, Slot } from "@/components/parts/Pills";
import { ProjectRows } from "@/components/parts/ProjectRow";
import { FALLBACK_FEATURED as PROJECTS } from "@/content/projects";
import { SectionLabel } from "@/components/parts/SectionLabel";
import { Status } from "@/components/parts/Status";
import { TextLink } from "@/components/parts/TextLink";
import { ToolFilter } from "@/components/parts/ToolFilter";
import { EmptyTool, Tools } from "@/components/parts/Tools";
import { Row } from "@/components/shell/Row";
import type { ToolId } from "@/lib/tools";

// Build check for the system: every component in light and dark side by
// side, then the live ones on the page itself, then every token.
// Not a public page.
export const metadata: Metadata = { title: "System", robots: { index: false } };

const MODES = ["light", "dark"] as const;
type Style = { $value: Record<string, string | number>; $description?: string };
const types = Object.entries(tokens.type as Record<string, Style>);

function spec(s: Style["$value"]) {
  const family = String(s.fontFamily).replace(/[{}]|font\./g, "");
  return `${family} ${s.fontWeight} · ${s.fontSize} · lh ${s.lineHeight}`;
}

const ALL_TOOLS: ToolId[] = ["figma", "illustrator", "after-effects", "lottiefiles", "claude"];


function Specimen({ name, children, className = "" }: { name: string; children: React.ReactNode; className?: string }) {
  return (
    <div>
      <p className="text-micro-caps text-mute mb-4">{name}</p>
      <div className={`flex flex-wrap items-center gap-4 ${className}`}>{children}</div>
    </div>
  );
}

export default function SystemPage() {
  return (
    <>
      <Row className="p-inset">
        <SectionLabel as="p" name="System" />
        <h1 className="text-statement mt-4">Components v01</h1>
        <p className="text-body text-mute mt-4 max-w-[60ch]">
          Every part in light and dark side by side. Below that, the live ones on the page itself: Wessel works the
          project rows. Use the header switch and Pause motion to try them.
        </p>
      </Row>

      <Divider label={{ name: "Parts" }} />

      <Row as="section" className="ruled stack:grid-cols-3" aria-label="Parts in every mode">
        {MODES.map((mode) => (
          <div key={mode} data-mode={mode} className="bg-canvas text-ink p-inset flex flex-col gap-12 min-w-0">
            <SectionLabel as="p" name={mode} />
            <Specimen name="Section label">
              <SectionLabel as="p" name="Selected work" />
            </Specimen>
            <Specimen name="Pills">
              <SizePill>203 × 116</SizePill>
              <GrapePill>
                <Play /> Reel
              </GrapePill>
              <GrapePill size="tap">
                Contact <Arrow dir="down" />
              </GrapePill>
            </Specimen>
            <Specimen name="Outline pill · status line">
              <OutlinePill tap>Copy email</OutlinePill>
              <Status />
            </Specimen>
            <Specimen name="Ink chip · mock tag · slot">
              <KeyChip>⌘C</KeyChip>
              <KeyChip>⌘V</KeyChip>
              <MockTag />
              <span className="text-body">
                Since <Slot>year</Slot>
              </span>
            </Specimen>
            <Specimen name="Tool chips · 56 · 32 · empty">
              <Tools ids={ALL_TOOLS} size={56} />
              <Tools ids={ALL_TOOLS} />
              <EmptyTool />
            </Specimen>
            <Specimen name="Text links">
              <TextLink href="#top" label="More about me" arrow="right" />
              <TextLink href="https://www.linkedin.com/in/wesseloud/" label="LinkedIn" arrow="out" />
              <TextLink href="#contact" label="Contact" arrow="down" />
              <TextLink href="#top" label="All work" arrow="left" />
            </Specimen>
            <Specimen name="Cursors" className="gap-x-10 gap-y-8 items-start">
              <Cursor kind="wes" name="Wessel" staticDemo />
              <Cursor kind="you" name="You" staticDemo />
              <Cursor kind="you" name="View case" staticDemo />
            </Specimen>
            <Specimen name="Comment pin · note · dot" className="items-start">
              <Pin staticDemo>Every ease is hand-tuned.</Pin>
              <Pin staticDemo note>
                The menu took longest.
              </Pin>
              <Pin staticDemo dot>
                Read
              </Pin>
            </Specimen>
            <Specimen name="Selection" className="gap-10 pb-8">
              <Selection width={140} height={88} />
            </Specimen>
            <Specimen name="Media placeholder">
              <Media ratio="wide" className="w-full" placeholder="Header video to come" />
            </Specimen>
          </div>
        ))}
      </Row>

      <Divider label={{ name: "Live" }} />

      <Row className="p-inset flex flex-col gap-6">
        <p className="text-micro-caps text-mute">Tool filter (work page)</p>
        <ToolFilter ids={ALL_TOOLS} />
      </Row>

      <Divider label={{ name: "Project rows" }} />
      <ProjectRows projects={PROJECTS} id="project-rows" />

      <Divider label={{ name: "Case parts" }} />
      <Crumb count="Case 1/3" next={{ label: "UI motion study", href: "/work/ui-motion-study" }} />
      <Facts
        items={[
          { label: "Role", value: "Designer and developer", mock: true },
          { label: "Scope", value: "Design, dev, SEO" },
          { label: "Timeline", value: "2023–now" },
        ]}
      />
      <Row className="p-inset">
        <MediaFigure
          ratio="wide"
          squareSmall
          poster="/media/desaak-hero_poster_v01.jpg"
          video="/media/desaak-hero_web_v01.mp4"
          rate={1}
          alt="De Saak homepage header loop"
          caption="desaak.com, homepage header loop."
        />
      </Row>

      <Divider label={{ name: "Tokens" }} />

      <Row as="section" className="ruled stack:grid-cols-3" aria-label="Colour tokens">
        {MODES.map((mode) => (
          <div key={mode} data-mode={mode} className="bg-canvas text-ink p-inset">
            <SectionLabel as="p" name={mode} className="mb-6" />
            <ul className="ruled grid-cols-2">
              {Object.entries(tokens.color[mode]).map(([name, t]) => (
                <li key={name} className="bg-canvas p-3 flex items-center gap-3">
                  <span
                    className="size-8 shrink-0 rounded-pill border border-line"
                    style={{ background: `var(--${name})` }}
                  />
                  <span className="min-w-0">
                    <span className="text-micro block">{name}</span>
                    <span className="text-micro text-mute block">{t.$value}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </Row>

      <Row as="section" className="p-inset" aria-label="Type">
        <SectionLabel as="p" name="Type" className="mb-6" />
        <ul className="ruled">
          {types.map(([name, t]) => (
            <li key={name} className="bg-canvas py-6 grid gap-2 stack:grid-cols-[220px_1fr] stack:items-baseline">
              <span className="text-micro text-mute">
                {name}
                <br />
                {spec(t.$value)}
              </span>
              <span className={`text-${name} overflow-hidden text-ellipsis whitespace-nowrap`}>Wessel Oud</span>
            </li>
          ))}
        </ul>
      </Row>
    </>
  );
}
