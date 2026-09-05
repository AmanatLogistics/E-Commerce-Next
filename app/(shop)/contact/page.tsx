import type { Metadata } from "next";
import { ContactForm } from "@/components/enquiry/contact-form";
import { getSiteSettings } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteSettings();
  return {
    title: "Contact",
    description: `Ask ${site.name} about a stone, or tell us what you are looking for.`,
  };
}

export default async function ContactPage() {
  const site = await getSiteSettings();
  return (
    <div className="mx-auto max-w-7xl px-4 py-16">
      <div className="grid gap-12 lg:grid-cols-[1fr_20rem]">
        <div>
          <p className="label-caps">Enquiries</p>
          <h1 className="text-h1 mt-2 crest-rule">Get in touch</h1>
          <p className="mt-3 max-w-xl text-ink-muted">
            If a stone in the collection interests you, the enquiry form on its own page is the
            quickest route — it tells us which stone you mean. Use this form for anything else:
            a variety we are not currently listing, a particular size or colour, or a question
            about certification and shipping.
          </p>

          <div className="mt-8">
            <ContactForm />
          </div>
        </div>

        <aside className="lg:border-l lg:pl-8">
          <h2 className="label-caps">Direct</h2>
          <ul className="mt-3 flex flex-col gap-3 text-body">
            <li>
              <a href={`mailto:${site.contactEmail}`} className="hover:text-brand">
                {site.contactEmail}
              </a>
            </li>
            <li className="text-ink-muted">{site.contactPhone}</li>
            <li className="text-ink-muted">{site.address}</li>
          </ul>

          <h2 className="label-caps mt-8">How we work</h2>
          <ul className="mt-3 flex flex-col gap-3 text-sm text-ink-muted">
            <li>Every stone is photographed as it is, with no colour correction.</li>
            <li>Treatment is disclosed on every listing, including when there is none.</li>
            <li>Independent lab reports are available on request for higher-value stones.</li>
            <li>Nothing is charged through this website; we quote and invoice directly.</li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
