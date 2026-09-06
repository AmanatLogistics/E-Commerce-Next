import { SiteFooter } from "@/components/layout/site-footer";
import { TrustStrip } from "@/components/layout/trust-strip";
import { SiteHeader } from "@/components/layout/site-header";
import { WhatsAppButton } from "@/components/layout/whatsapp-button";

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="skip-link">
        Skip to main content
      </a>
      <SiteHeader />
      <main id="main" className="enter flex-1">
        {children}
      </main>
      <TrustStrip />
      <SiteFooter />
      <WhatsAppButton />
    </div>
  );
}
