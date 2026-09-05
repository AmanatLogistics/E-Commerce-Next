import { getSiteSettings } from "@/lib/settings";

/**
 * The thin promise bar every jewellery storefront runs above the header. It carries the
 * things a buyer needs to know before they will enquire on a stone they cannot hold.
 */
export async function AnnouncementBar() {
  const site = await getSiteSettings();
  return (
    <div className="bg-brand text-brand-ink">
      <ul className="mx-auto flex max-w-7xl items-center justify-center gap-8 px-4 py-2.5">
        {site.promises.slice(0, 3).map((promise, index) => (
          <li
            key={promise.title}
            className={
              // One promise on a phone, three from the small breakpoint up.
              index === 0
                ? "label-caps !text-brand-ink !tracking-[0.14em]"
                : "label-caps !text-brand-ink !tracking-[0.14em] hidden sm:block"
            }
          >
            {promise.title}
          </li>
        ))}
      </ul>
    </div>
  );
}
