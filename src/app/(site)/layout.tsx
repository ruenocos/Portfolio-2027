import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { WithContent } from "@/components/WithContent";
import { LiveEditing } from "@/components/LiveEditing";
import { getSite } from "@/content/get";

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="rails">
      <WithContent render={async (options) => <Header name={(await getSite(options)).name} />} />
      <main>{children}</main>
      <WithContent render={async (options) => <Footer site={await getSite(options)} />} />
      <LiveEditing />
    </div>
  );
}
