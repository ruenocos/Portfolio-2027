import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getSite } from "@/content/get";

export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const site = await getSite();

  return (
    <div className="rails">
      <Header name={site.name} />
      <main>{children}</main>
      <Footer site={site} />
    </div>
  );
}
