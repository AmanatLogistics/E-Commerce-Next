/**
 * The demo catalogue.
 *
 * Varieties, mining localities and typical treatments are drawn from published sources on
 * Afghan gem deposits (see docs/RESEARCH.md): Panjshir emerald, Jegdalek ruby, Badakhshan
 * spinel, Nuristan and Kunar aquamarine and tourmaline, Laghman topaz, Pech valley peridot.
 * The individual stones — weights, dimensions, references and prices — are invented
 * demonstration stock and are not real inventory or real valuations.
 *
 * Prices are whole dollars here and converted to cents by the seed script.
 * `price: null` means "price on request", which is normal for higher-value stones.
 */

export interface SeedCategory {
  slug: string;
  name: string;
  description: string;
  sortOrder: number;
}

export interface SeedGem {
  slug: string;
  reference: string;
  title: string;
  category: string;
  carat: number;
  shape: string;
  cut: string;
  colour: string;
  clarity: string;
  dims: [number, number, number];
  origin: string;
  treatment: string;
  certificate: string;
  price: number | null;
  status: "available" | "reserved" | "sold";
  featured: boolean;
  description: string;
}

export const CATEGORIES: SeedCategory[] = [
  {
    slug: "emerald",
    name: "Emerald",
    description:
      "Beryl coloured green by chromium. Afghanistan's emeralds come from the talc-carbonate schists of the Panjshir valley — Khenj, Mikeni and Buzmal — mined in earnest since the 1970s.",
    sortOrder: 1,
  },
  {
    slug: "ruby",
    name: "Ruby",
    description:
      "Red corundum. Jegdalek, east of Kabul, produces gem corundum in marble beds, typically in smaller sizes with a distinctive pinkish red.",
    sortOrder: 2,
  },
  {
    slug: "spinel",
    name: "Spinel",
    description:
      "Long mistaken for ruby, now collected in its own right. The Badakhshan and Jegdalek marbles yield clean pink and red spinel that is almost always untreated.",
    sortOrder: 3,
  },
  {
    slug: "aquamarine",
    name: "Aquamarine",
    description:
      "Blue beryl from the Nuristan and Kunar pegmatites — Paprok, Chapa Dara and the Pech valley — among the finest documented material anywhere.",
    sortOrder: 4,
  },
  {
    slug: "topaz",
    name: "Topaz",
    description:
      "The Laghman and Nuristan pegmatites yield topaz in sherry, pale blue and water-clear, often as large and exceptionally clean crystals.",
    sortOrder: 5,
  },
  {
    slug: "tourmaline",
    name: "Tourmaline",
    description:
      "Pegmatite tourmaline from Paprok, Mawi and Nilaw, in greens, pinks and bicolour combinations.",
    sortOrder: 6,
  },
  {
    slug: "peridot",
    name: "Peridot",
    description:
      "Gem olivine from the Pech valley in Kunar, at altitude — known for large, clean crystals with a strong green.",
    sortOrder: 7,
  },
];

export const GEMS: SeedGem[] = [
  // ---------------- Emerald ----------------
  {
    slug: "panjshir-emerald-emerald-cut-2-14ct",
    reference: "AEC-EM-0101",
    title: "Panjshir Emerald, Emerald Cut, 2.14 ct",
    category: "emerald",
    carat: 2.14,
    shape: "Rectangular",
    cut: "Emerald cut",
    colour: "Medium-strong bluish green",
    clarity: "Slightly included (typical of the species)",
    dims: [8.42, 6.18, 4.55],
    origin: "Panjshir Valley, Afghanistan",
    treatment: "Minor clear oil (standard for the species, fully disclosed)",
    certificate: "Independent lab report available on request",
    price: null,
    status: "available",
    featured: true,
    description:
      "A classic Panjshir colour: green with a distinct blue secondary rather than the yellower tone of some other deposits. Cut as a step-cut rectangle to hold weight and show the colour evenly across the table. Inclusions are visible under a loupe and are characteristic of emerald from this source; they are not treated as a fault at this quality level.",
  },
  {
    slug: "panjshir-emerald-oval-1-05ct",
    reference: "AEC-EM-0102",
    title: "Panjshir Emerald, Oval, 1.05 ct",
    category: "emerald",
    carat: 1.05,
    shape: "Oval",
    cut: "Mixed brilliant",
    colour: "Medium green",
    clarity: "Moderately included",
    dims: [6.90, 5.05, 3.60],
    origin: "Khenj, Panjshir Valley, Afghanistan",
    treatment: "Minor clear oil",
    certificate: "",
    price: 2600,
    status: "available",
    featured: false,
    description:
      "A well-proportioned one-carat oval in a lively medium green. A practical size for a ring centre stone, and cut deep enough to keep colour when set. Eye-visible inclusions on close inspection.",
  },
  {
    slug: "panjshir-emerald-pair-cushion-1-88ct",
    reference: "AEC-EM-0103",
    title: "Matched Panjshir Emerald Pair, Cushion, 1.88 ct total",
    category: "emerald",
    carat: 1.88,
    shape: "Cushion",
    cut: "Mixed",
    colour: "Medium green, well matched",
    clarity: "Slightly included",
    dims: [5.60, 5.40, 3.40],
    origin: "Panjshir Valley, Afghanistan",
    treatment: "Minor clear oil",
    certificate: "",
    price: 3400,
    status: "reserved",
    featured: false,
    description:
      "A matched pair intended for earrings — matched for hue, tone and outline, which is considerably harder to find than a single stone of the same quality. Total weight for the two stones; individual weights are 0.95 ct and 0.93 ct.",
  },
  {
    slug: "panjshir-emerald-crystal-specimen-8-4ct",
    reference: "AEC-EM-0104",
    title: "Panjshir Emerald Crystal on Matrix, 8.40 ct",
    category: "emerald",
    carat: 8.4,
    shape: "Natural hexagonal prism",
    cut: "Uncut crystal",
    colour: "Deep green",
    clarity: "Included, as expected in a specimen",
    dims: [14.20, 9.10, 8.80],
    origin: "Panjshir Valley, Afghanistan",
    treatment: "None (untreated)",
    certificate: "",
    price: 4500,
    status: "available",
    featured: true,
    description:
      "An uncut hexagonal crystal still seated in its talc schist matrix, which is the rock type the Panjshir emeralds form in. Collected as a mineral specimen rather than as cutting rough — the termination is intact and the crystal has not been trimmed.",
  },

  // ---------------- Ruby ----------------
  {
    slug: "jegdalek-ruby-oval-1-32ct",
    reference: "AEC-RB-0201",
    title: "Jegdalek Ruby, Oval, 1.32 ct",
    category: "ruby",
    carat: 1.32,
    shape: "Oval",
    cut: "Mixed brilliant",
    colour: "Pinkish red, medium tone",
    clarity: "Slightly included",
    dims: [7.05, 5.30, 3.85],
    origin: "Jegdalek, Kabul Province, Afghanistan",
    treatment: "None (unheated)",
    certificate: "Independent lab report available on request",
    price: null,
    status: "available",
    featured: true,
    description:
      "Unheated Jegdalek ruby with the pinkish red the marble-hosted deposits are known for. Untreated corundum of this size is uncommon from this source; the colour is entirely natural and there is no evidence of heat.",
  },
  {
    slug: "jegdalek-ruby-round-0-61ct",
    reference: "AEC-RB-0202",
    title: "Jegdalek Ruby, Round, 0.61 ct",
    category: "ruby",
    carat: 0.61,
    shape: "Round",
    cut: "Brilliant",
    colour: "Pinkish red",
    clarity: "Slightly included",
    dims: [5.10, 5.08, 3.20],
    origin: "Jegdalek, Kabul Province, Afghanistan",
    treatment: "None (unheated)",
    certificate: "",
    price: 1350,
    status: "available",
    featured: false,
    description:
      "A bright unheated round in a size that suits a side stone or a small solitaire. Cut to standard brilliant proportions with good return of light through the table.",
  },
  {
    slug: "jegdalek-ruby-cabochon-3-05ct",
    reference: "AEC-RB-0203",
    title: "Jegdalek Ruby Cabochon, 3.05 ct",
    category: "ruby",
    carat: 3.05,
    shape: "Oval",
    cut: "Cabochon",
    colour: "Deep red, slightly purplish",
    clarity: "Translucent",
    dims: [9.60, 7.40, 5.10],
    origin: "Jegdalek, Kabul Province, Afghanistan",
    treatment: "None (unheated)",
    certificate: "",
    price: 2000,
    status: "sold",
    featured: false,
    description:
      "Cut as a cabochon because the material is translucent rather than transparent, which is the honest treatment for this rough — faceting it would have produced a dull stone. Rich colour with a smooth, even dome.",
  },

  // ---------------- Spinel ----------------
  {
    slug: "badakhshan-red-spinel-octagon-1-74ct",
    reference: "AEC-SP-0301",
    title: "Badakhshan Red Spinel, Octagon, 1.74 ct",
    category: "spinel",
    carat: 1.74,
    shape: "Octagon",
    cut: "Step cut",
    colour: "Vivid red",
    clarity: "Eye clean",
    dims: [7.80, 6.05, 4.20],
    origin: "Badakhshan, Afghanistan",
    treatment: "None (untreated)",
    certificate: "Independent lab report available on request",
    price: null,
    status: "available",
    featured: true,
    description:
      "Spinel is almost never treated, and this stone is no exception — the colour is exactly as it came out of the ground. Eye clean, with the bright, slightly glassy lustre that distinguishes fine spinel from ruby at a glance.",
  },
  {
    slug: "badakhshan-pink-spinel-cushion-2-31ct",
    reference: "AEC-SP-0302",
    title: "Badakhshan Pink Spinel, Cushion, 2.31 ct",
    category: "spinel",
    carat: 2.31,
    shape: "Cushion",
    cut: "Mixed brilliant",
    colour: "Soft pink",
    clarity: "Eye clean",
    dims: [8.05, 7.60, 4.95],
    origin: "Badakhshan, Afghanistan",
    treatment: "None (untreated)",
    certificate: "",
    price: 2400,
    status: "available",
    featured: false,
    description:
      "A soft, even pink with no windowing — the cushion is cut deep enough to keep colour across the whole face. Untreated, as spinel from this locality generally is.",
  },
  {
    slug: "badakhshan-lavender-spinel-round-0-92ct",
    reference: "AEC-SP-0303",
    title: "Lavender Spinel, Round, 0.92 ct",
    category: "spinel",
    carat: 0.92,
    shape: "Round",
    cut: "Brilliant",
    colour: "Pale lavender",
    clarity: "Eye clean",
    dims: [5.85, 5.82, 3.70],
    origin: "Badakhshan, Afghanistan",
    treatment: "None (untreated)",
    certificate: "",
    price: 1050,
    status: "available",
    featured: false,
    description:
      "An unusual pale lavender, a colour spinel produces and few other species do at this price. Clean, bright and well cut for its size.",
  },

  // ---------------- Aquamarine ----------------
  {
    slug: "nuristan-aquamarine-emerald-cut-12-6ct",
    reference: "AEC-AQ-0401",
    title: "Nuristan Aquamarine, Emerald Cut, 12.60 ct",
    category: "aquamarine",
    carat: 12.6,
    shape: "Rectangular",
    cut: "Emerald cut",
    colour: "Medium blue, slight green secondary",
    clarity: "Eye clean",
    dims: [16.40, 12.10, 8.05],
    origin: "Paprok, Nuristan, Afghanistan",
    treatment: "None (unheated)",
    certificate: "Independent lab report available on request",
    price: null,
    status: "available",
    featured: true,
    description:
      "A large, completely clean step cut. Much of the aquamarine on the market is heated to remove a green secondary hue; this stone has not been, and retains a slight green that many collectors specifically prefer. The size and clarity together are what make it notable.",
  },
  {
    slug: "kunar-aquamarine-oval-4-85ct",
    reference: "AEC-AQ-0402",
    title: "Kunar Aquamarine, Oval, 4.85 ct",
    category: "aquamarine",
    carat: 4.85,
    shape: "Oval",
    cut: "Brilliant",
    colour: "Light to medium blue",
    clarity: "Eye clean",
    dims: [12.05, 9.40, 6.20],
    origin: "Chapa Dara, Kunar, Afghanistan",
    treatment: "None (unheated)",
    certificate: "",
    price: 1800,
    status: "available",
    featured: false,
    description:
      "A bright, clean oval in a wearable size. Unheated, with even colour distribution and no visible zoning through the table.",
  },
  {
    slug: "kunar-aquamarine-crystal-46ct",
    reference: "AEC-AQ-0403",
    title: "Aquamarine Crystal, Terminated, 46.00 ct",
    category: "aquamarine",
    carat: 46,
    shape: "Natural hexagonal prism",
    cut: "Uncut crystal",
    colour: "Pale blue",
    clarity: "Transparent with internal veils",
    dims: [38.50, 14.20, 13.60],
    origin: "Chapa Dara, Kunar, Afghanistan",
    treatment: "None (untreated)",
    certificate: "",
    price: 1250,
    status: "available",
    featured: false,
    description:
      "A fully terminated single crystal with clean prism faces and undamaged edges — a specimen rather than cutting rough. Internal veils are visible when backlit and are part of the crystal's natural growth.",
  },
  {
    slug: "nuristan-aquamarine-pair-trillion-6-2ct",
    reference: "AEC-AQ-0404",
    title: "Matched Aquamarine Pair, Trillion, 6.20 ct total",
    category: "aquamarine",
    carat: 6.2,
    shape: "Trillion",
    cut: "Brilliant",
    colour: "Medium blue, matched",
    clarity: "Eye clean",
    dims: [10.10, 10.05, 6.40],
    origin: "Paprok, Nuristan, Afghanistan",
    treatment: "None (unheated)",
    certificate: "",
    price: 2200,
    status: "available",
    featured: false,
    description:
      "Two trillions cut from the same piece of rough, so hue and tone match closely. Total weight for the pair; individual weights are 3.12 ct and 3.08 ct.",
  },

  // ---------------- Topaz ----------------
  {
    slug: "laghman-sherry-topaz-oval-3-42ct",
    reference: "AEC-TZ-0501",
    title: "Laghman Sherry Topaz, Oval, 3.42 ct",
    category: "topaz",
    carat: 3.42,
    shape: "Oval",
    cut: "Brilliant",
    colour: "Warm sherry, with a golden secondary",
    clarity: "Eye clean",
    dims: [10.20, 8.05, 5.60],
    origin: "Mawi, Laghman, Afghanistan",
    treatment: "None (untreated)",
    certificate: "Independent lab report available on request",
    price: null,
    status: "available",
    featured: true,
    description:
      "Natural sherry topaz from the Laghman pegmatites. The colour is entirely natural — no irradiation and no heat, which matters because a great deal of coloured topaz on the market is treated. Eye clean, with an even warmth right across the table.",
  },
  {
    slug: "laghman-blue-topaz-cushion-1-96ct",
    reference: "AEC-TZ-0502",
    title: "Laghman Blue Topaz, Cushion, 1.96 ct",
    category: "topaz",
    carat: 1.96,
    shape: "Cushion",
    cut: "Mixed brilliant",
    colour: "Pale sky blue",
    clarity: "Eye clean",
    dims: [7.60, 7.20, 4.85],
    origin: "Mawi, Laghman, Afghanistan",
    treatment: "None (untreated)",
    certificate: "",
    price: 1650,
    status: "available",
    featured: false,
    description:
      "Natural pale blue, not the irradiated blue that dominates the topaz market — a quieter colour, and correspondingly gentler in a setting. Untreated, clean, and cut with a small culet that keeps the stone lively at this tone.",
  },
  {
    slug: "laghman-sherry-topaz-crystal-22ct",
    reference: "AEC-TZ-0503",
    title: "Sherry Topaz Crystal, 22.00 ct",
    category: "topaz",
    carat: 22,
    shape: "Natural prism",
    cut: "Uncut crystal",
    colour: "Sherry, colour zoned",
    clarity: "Transparent to translucent",
    dims: [24.80, 15.30, 12.10],
    origin: "Mawi, Laghman, Afghanistan",
    treatment: "None (untreated)",
    certificate: "",
    price: 900,
    status: "available",
    featured: false,
    description:
      "An uncut crystal showing clear colour zoning from near-colourless at the base to sherry at the termination, which is how the colour actually occurs in these pegmatites. Kept whole as a specimen.",
  },

  // ---------------- Tourmaline ----------------
  {
    slug: "paprok-bicolour-tourmaline-5-12ct",
    reference: "AEC-TM-0601",
    title: "Bicolour Tourmaline, Emerald Cut, 5.12 ct",
    category: "tourmaline",
    carat: 5.12,
    shape: "Rectangular",
    cut: "Emerald cut",
    colour: "Green to pink, sharp division",
    clarity: "Eye clean",
    dims: [13.10, 8.40, 6.05],
    origin: "Paprok, Nuristan, Afghanistan",
    treatment: "None (untreated)",
    certificate: "",
    price: 1300,
    status: "available",
    featured: true,
    description:
      "A bicolour with an unusually sharp boundary between the green and pink zones, oriented so the division runs across the length of the stone rather than being hidden in the pavilion. Cutting a bicolour to show both colours cleanly costs weight, and this one has been cut for the colour rather than the carat.",
  },
  {
    slug: "nilaw-green-tourmaline-oval-3-68ct",
    reference: "AEC-TM-0602",
    title: "Green Tourmaline, Oval, 3.68 ct",
    category: "tourmaline",
    carat: 3.68,
    shape: "Oval",
    cut: "Brilliant",
    colour: "Medium green",
    clarity: "Eye clean",
    dims: [10.60, 8.10, 5.70],
    origin: "Nilaw, Laghman, Afghanistan",
    treatment: "None (untreated)",
    certificate: "",
    price: 800,
    status: "available",
    featured: false,
    description:
      "A clean medium green with good brightness. Tourmaline is strongly pleochroic, and this stone has been oriented so the face-up colour is the more attractive of the two directions.",
  },
  {
    slug: "paprok-pink-tourmaline-pear-2-44ct",
    reference: "AEC-TM-0603",
    title: "Pink Tourmaline, Pear, 2.44 ct",
    category: "tourmaline",
    carat: 2.44,
    shape: "Pear",
    cut: "Brilliant",
    colour: "Medium pink",
    clarity: "Slightly included",
    dims: [10.20, 6.80, 4.40],
    origin: "Paprok, Nuristan, Afghanistan",
    treatment: "None (untreated)",
    certificate: "",
    price: 600,
    status: "available",
    featured: false,
    description:
      "A pear with a well-defined point and no bow-tie across the centre, which is the usual weakness in this shape. Minor inclusions under the loupe.",
  },

  // ---------------- Peridot ----------------
  {
    slug: "pech-peridot-oval-9-15ct",
    reference: "AEC-PD-0701",
    title: "Pech Valley Peridot, Oval, 9.15 ct",
    category: "peridot",
    carat: 9.15,
    shape: "Oval",
    cut: "Brilliant",
    colour: "Strong yellowish green",
    clarity: "Eye clean",
    dims: [15.20, 11.40, 7.60],
    origin: "Pech Valley, Kunar, Afghanistan",
    treatment: "None (untreated)",
    certificate: "Independent lab report available on request",
    price: null,
    status: "available",
    featured: true,
    description:
      "Pech valley peridot is mined at high altitude and is known for producing large, clean crystals with a stronger green than most other sources. This is a substantial stone, eye clean, with the vivid colour the deposit is sought out for. Peridot is never treated.",
  },
  {
    slug: "pech-peridot-cushion-4-70ct",
    reference: "AEC-PD-0702",
    title: "Pech Valley Peridot, Cushion, 4.70 ct",
    category: "peridot",
    carat: 4.7,
    shape: "Cushion",
    cut: "Mixed brilliant",
    colour: "Yellowish green",
    clarity: "Eye clean",
    dims: [10.40, 9.80, 6.40],
    origin: "Pech Valley, Kunar, Afghanistan",
    treatment: "None (untreated)",
    certificate: "",
    price: 650,
    status: "available",
    featured: false,
    description:
      "A clean cushion in a very wearable size. Peridot is soft enough to want a protective setting; a bezel or a halo suits it better than exposed claws.",
  },
  {
    slug: "pech-peridot-round-2-05ct",
    reference: "AEC-PD-0703",
    title: "Pech Valley Peridot, Round, 2.05 ct",
    category: "peridot",
    carat: 2.05,
    shape: "Round",
    cut: "Brilliant",
    colour: "Green",
    clarity: "Eye clean",
    dims: [8.05, 8.02, 5.10],
    origin: "Pech Valley, Kunar, Afghanistan",
    treatment: "None (untreated)",
    certificate: "",
    price: 300,
    status: "available",
    featured: false,
    description:
      "A straightforward, well-cut round. Bright, clean and an easy entry point into gem-quality Afghan peridot.",
  },
];
