/**
 * The demo catalogue. Written out rather than generated so titles, specs and prices read
 * like a real shop rather than "Product 17". Prices are in whole rupees here and converted
 * to paisa by the seed script.
 */

export interface SeedCategory {
  slug: string;
  name: string;
  description: string;
  sortOrder: number;
}

export interface SeedProduct {
  slug: string;
  title: string;
  brand: string;
  category: string;
  price: number;
  compareAt?: number;
  stock: number;
  description: string;
  specs: [string, string][];
  rating: [number, number];
  imageCount?: number;
}

export const CATEGORIES: SeedCategory[] = [
  {
    slug: "mobiles-tablets",
    name: "Mobiles & Tablets",
    description: "Phones, tablets and the accessories that keep them running.",
    sortOrder: 1,
  },
  {
    slug: "audio",
    name: "Audio",
    description: "Earbuds, headphones and speakers for the desk, the commute and the room.",
    sortOrder: 2,
  },
  {
    slug: "computing",
    name: "Computing",
    description: "Laptops, monitors and the desk hardware around them.",
    sortOrder: 3,
  },
  {
    slug: "kitchen",
    name: "Kitchen",
    description: "Appliances that earn their counter space.",
    sortOrder: 4,
  },
  {
    slug: "home-comfort",
    name: "Home Comfort",
    description: "Fans, heaters, air treatment and everything that makes a room liveable.",
    sortOrder: 5,
  },
  {
    slug: "lighting-cleaning",
    name: "Lighting & Cleaning",
    description: "Lamps, bulbs, vacuums and the unglamorous things that keep a home working.",
    sortOrder: 6,
  },
];

export const PRODUCTS: SeedProduct[] = [
  // ---------- Mobiles & Tablets ----------
  {
    slug: "aurex-note-12-5g-128gb",
    title: "Aurex Note 12 5G, 128GB",
    brand: "Aurex",
    category: "mobiles-tablets",
    price: 62999,
    compareAt: 71999,
    stock: 24,
    description:
      "A mid-range 5G phone that spends its budget where it shows: a 120Hz AMOLED panel, a 5000mAh battery that comfortably clears a day, and 33W charging that fills it over a lunch break. The camera is a competent 50MP main sensor rather than a headline number attached to a small lens.",
    specs: [
      ["Display", "6.67\" AMOLED, 120Hz"],
      ["Processor", "Octa-core 2.2GHz"],
      ["RAM / Storage", "8GB / 128GB"],
      ["Battery", "5000mAh, 33W charging"],
      ["Rear camera", "50MP + 8MP ultrawide"],
      ["SIM", "Dual SIM, 5G"],
    ],
    rating: [4.3, 218],
  },
  {
    slug: "aurex-a9-lite-64gb",
    title: "Aurex A9 Lite, 64GB",
    brand: "Aurex",
    category: "mobiles-tablets",
    price: 24499,
    stock: 41,
    description:
      "An entry phone built for battery life over benchmarks. The 90Hz screen keeps scrolling smooth, and 64GB with a microSD slot means the storage is not a countdown timer.",
    specs: [
      ["Display", "6.5\" IPS, 90Hz"],
      ["RAM / Storage", "4GB / 64GB, microSD"],
      ["Battery", "5000mAh, 18W"],
      ["Rear camera", "13MP + 2MP depth"],
      ["SIM", "Dual SIM, 4G"],
    ],
    rating: [4.0, 512],
  },
  {
    slug: "helio-tab-11-wifi-128gb",
    title: "Helio Tab 11 Wi-Fi, 128GB",
    brand: "Helio",
    category: "mobiles-tablets",
    price: 48999,
    compareAt: 54999,
    stock: 12,
    description:
      "An 11-inch tablet aimed at reading, lectures and video rather than desktop-replacement claims it cannot meet. The 2K panel and quad speakers are the reason to buy it.",
    specs: [
      ["Display", "11\" 2000×1200 IPS"],
      ["RAM / Storage", "6GB / 128GB"],
      ["Battery", "7700mAh"],
      ["Audio", "Quad speakers"],
      ["Connectivity", "Wi-Fi 6, Bluetooth 5.2"],
    ],
    rating: [4.4, 96],
  },
  {
    slug: "voltcore-65w-gan-charger",
    title: "Voltcore 65W GaN Charger",
    brand: "Voltcore",
    category: "mobiles-tablets",
    price: 4299,
    compareAt: 5499,
    stock: 88,
    description:
      "One charger for the phone, the tablet and most thin laptops. GaN internals keep it roughly the size of a matchbox, and the two USB-C ports split sensibly when both are in use.",
    specs: [
      ["Output", "65W total"],
      ["Ports", "2× USB-C, 1× USB-A"],
      ["Standards", "USB-PD 3.0, PPS"],
      ["Warranty", "18 months"],
    ],
    rating: [4.6, 340],
  },
  {
    slug: "voltcore-20000mah-power-bank",
    title: "Voltcore 20,000mAh Power Bank",
    brand: "Voltcore",
    category: "mobiles-tablets",
    price: 6799,
    stock: 54,
    description:
      "Enough capacity for roughly four phone charges, with 22.5W output so it actually charges quickly rather than trickling. Includes a passthrough mode for overnight top-ups.",
    specs: [
      ["Capacity", "20,000mAh"],
      ["Output", "22.5W max"],
      ["Ports", "USB-C in/out, 2× USB-A"],
      ["Display", "Digital percentage readout"],
    ],
    rating: [4.2, 187],
  },
  {
    slug: "aurex-tempered-glass-pack",
    title: "Aurex Tempered Glass, 2-Pack",
    brand: "Aurex",
    category: "mobiles-tablets",
    price: 899,
    stock: 0,
    description:
      "9H tempered glass with an oleophobic coating and an alignment frame that makes a bubble-free fit achievable on the first try. Two in the box because the first one is not always the keeper.",
    specs: [
      ["Hardness", "9H"],
      ["Thickness", "0.33mm"],
      ["Included", "2 protectors, frame, wipes"],
    ],
    rating: [3.9, 74],
  },
  {
    slug: "helio-usb-c-braided-cable-2m",
    title: "Helio USB-C Braided Cable, 2m",
    brand: "Helio",
    category: "mobiles-tablets",
    price: 1299,
    stock: 132,
    description:
      "A 2-metre 100W cable with a braided jacket and moulded strain relief at both ends, which is where cheap cables die first.",
    specs: [
      ["Length", "2 metres"],
      ["Rating", "100W / 5A"],
      ["Data", "480Mbps"],
      ["Jacket", "Braided nylon"],
    ],
    rating: [4.5, 421],
  },

  // ---------- Audio ----------
  {
    slug: "tono-air-3-anc-earbuds",
    title: "Tono Air 3 ANC Earbuds",
    brand: "Tono",
    category: "audio",
    price: 11999,
    compareAt: 15999,
    stock: 37,
    description:
      "Active noise cancellation that meaningfully reduces engine and fan noise, plus a transparency mode good enough to hold a short conversation without taking them out. Six hours a charge, twenty-four with the case.",
    specs: [
      ["Driver", "11mm dynamic"],
      ["ANC", "Hybrid, up to 35dB"],
      ["Battery", "6h buds, 24h with case"],
      ["Water resistance", "IPX5"],
      ["Codecs", "SBC, AAC"],
    ],
    rating: [4.4, 289],
  },
  {
    slug: "tono-studio-40-headphones",
    title: "Tono Studio 40 Over-Ear Headphones",
    brand: "Tono",
    category: "audio",
    price: 18499,
    stock: 19,
    description:
      "Closed-back over-ears with memory-foam pads that stay comfortable past the two-hour mark. Tuned close to neutral with a modest low-end lift, and they fold flat for a bag.",
    specs: [
      ["Driver", "40mm dynamic"],
      ["Frequency response", "20Hz – 20kHz"],
      ["Battery", "40 hours"],
      ["Connection", "Bluetooth 5.3 + 3.5mm"],
      ["Weight", "255g"],
    ],
    rating: [4.5, 143],
  },
  {
    slug: "tono-bar-2-1-soundbar",
    title: "Tono Bar 2.1 Soundbar with Subwoofer",
    brand: "Tono",
    category: "audio",
    price: 27999,
    compareAt: 33999,
    stock: 8,
    description:
      "A soundbar and wireless subwoofer that fixes the thin, dialogue-swallowing sound of a flat television. HDMI ARC means one cable and the TV remote still controls the volume.",
    specs: [
      ["Configuration", "2.1 channel"],
      ["Power", "160W total"],
      ["Inputs", "HDMI ARC, optical, Bluetooth"],
      ["Subwoofer", "Wireless, 6.5\""],
    ],
    rating: [4.3, 67],
  },
  {
    slug: "riff-go-portable-speaker",
    title: "Riff Go Portable Speaker",
    brand: "Riff",
    category: "audio",
    price: 7499,
    stock: 45,
    description:
      "A palm-sized speaker that survives a kitchen counter and a rooftop equally. IPX7 means a full dunk is survivable, not just a splash.",
    specs: [
      ["Output", "20W"],
      ["Battery", "14 hours"],
      ["Water resistance", "IPX7"],
      ["Pairing", "Stereo pairing with a second unit"],
    ],
    rating: [4.1, 202],
  },
  {
    slug: "riff-desk-mic-usb",
    title: "Riff Desk USB Microphone",
    brand: "Riff",
    category: "audio",
    price: 9299,
    compareAt: 11499,
    stock: 22,
    description:
      "A cardioid USB condenser for calls, lectures and voice notes. The physical mute button and headphone monitoring jack are the two things that matter day to day.",
    specs: [
      ["Pattern", "Cardioid"],
      ["Sample rate", "24-bit / 96kHz"],
      ["Connection", "USB-C"],
      ["Controls", "Gain dial, mute, monitor jack"],
    ],
    rating: [4.6, 118],
  },
  {
    slug: "tono-clip-sport-earbuds",
    title: "Tono Clip Sport Earbuds",
    brand: "Tono",
    category: "audio",
    price: 5999,
    stock: 63,
    description:
      "Open-ear clip buds that leave the ear canal free, so traffic and conversation stay audible on a run. Secure enough that they do not need adjusting mid-kilometre.",
    specs: [
      ["Design", "Open-ear clip"],
      ["Battery", "8h buds, 28h with case"],
      ["Water resistance", "IPX4"],
      ["Weight", "5.6g per bud"],
    ],
    rating: [4.0, 91],
  },

  // ---------- Computing ----------
  {
    slug: "meridian-14-ultrabook-i5-16gb",
    title: "Meridian 14 Ultrabook, Core i5 / 16GB",
    brand: "Meridian",
    category: "computing",
    price: 189999,
    compareAt: 214999,
    stock: 6,
    description:
      "A 1.3kg 14-inch laptop for writing, spreadsheets and a browser with too many tabs. 16GB soldered RAM is the reason it stays usable in year three; the 512GB NVMe drive is user-replaceable.",
    specs: [
      ["Processor", "Core i5, 12 threads"],
      ["Memory", "16GB LPDDR5"],
      ["Storage", "512GB NVMe SSD"],
      ["Display", "14\" 1920×1200, 300 nits"],
      ["Battery", "63Wh, ~10 hours"],
      ["Weight", "1.3kg"],
    ],
    rating: [4.4, 58],
  },
  {
    slug: "meridian-27-qhd-monitor",
    title: "Meridian 27\" QHD Monitor",
    brand: "Meridian",
    category: "computing",
    price: 54999,
    stock: 14,
    description:
      "A 27-inch 1440p IPS panel at 75Hz — the resolution where text stops looking soft at this size. Height adjustment and a VESA mount come as standard rather than as an upsell.",
    specs: [
      ["Panel", "27\" IPS, 2560×1440"],
      ["Refresh rate", "75Hz"],
      ["Inputs", "HDMI 2.0, DisplayPort 1.4"],
      ["Stand", "Height, tilt, VESA 100"],
    ],
    rating: [4.5, 82],
  },
  {
    slug: "keyline-tkl-mechanical-keyboard",
    title: "Keyline TKL Mechanical Keyboard",
    brand: "Keyline",
    category: "computing",
    price: 13499,
    compareAt: 16999,
    stock: 27,
    description:
      "A tenkeyless board with hot-swap sockets, so switches can be changed without a soldering iron. Comes with tactile browns fitted and a PBT keycap set that will not go shiny.",
    specs: [
      ["Layout", "87-key TKL"],
      ["Switches", "Hot-swap, tactile brown"],
      ["Keycaps", "PBT double-shot"],
      ["Connection", "USB-C detachable"],
    ],
    rating: [4.7, 164],
  },
  {
    slug: "keyline-silent-wireless-mouse",
    title: "Keyline Silent Wireless Mouse",
    brand: "Keyline",
    category: "computing",
    price: 3299,
    stock: 71,
    description:
      "A quiet-click mouse for shared rooms and late nights, with a 4000 DPI sensor and a battery measured in months rather than days.",
    specs: [
      ["Sensor", "4000 DPI adjustable"],
      ["Connection", "2.4GHz + Bluetooth"],
      ["Battery", "AA, ~9 months"],
      ["Buttons", "6, silent switches"],
    ],
    rating: [4.2, 233],
  },
  {
    slug: "meridian-usb-c-dock-8-in-1",
    title: "Meridian 8-in-1 USB-C Dock",
    brand: "Meridian",
    category: "computing",
    price: 8999,
    stock: 33,
    description:
      "Turns one USB-C port into HDMI, ethernet, card readers and three USB-A ports, with 100W passthrough so the laptop still charges through the same cable.",
    specs: [
      ["Video", "HDMI 4K@60Hz"],
      ["Network", "Gigabit ethernet"],
      ["USB", "3× USB-A 3.0"],
      ["Card readers", "SD, microSD"],
      ["Power", "100W passthrough"],
    ],
    rating: [4.3, 129],
  },
  {
    slug: "meridian-1tb-nvme-ssd",
    title: "Meridian 1TB NVMe SSD",
    brand: "Meridian",
    category: "computing",
    price: 21999,
    compareAt: 25999,
    stock: 18,
    description:
      "A PCIe 3.0 drive at sequential speeds that saturate the interface. The sensible capacity upgrade for a laptop that shipped with 256GB.",
    specs: [
      ["Interface", "PCIe 3.0 ×4, NVMe"],
      ["Capacity", "1TB"],
      ["Sequential read", "3500 MB/s"],
      ["Endurance", "600 TBW"],
      ["Warranty", "5 years"],
    ],
    rating: [4.6, 97],
  },
  {
    slug: "keyline-laptop-riser-stand",
    title: "Keyline Aluminium Laptop Stand",
    brand: "Keyline",
    category: "computing",
    price: 4499,
    stock: 0,
    description:
      "An aluminium riser that puts a laptop screen at eye level and lets air reach the underside. Folds flat enough to travel.",
    specs: [
      ["Material", "Anodised aluminium"],
      ["Height", "6 positions, up to 155mm"],
      ["Supports", "Up to 16\", 8kg"],
      ["Folded", "23mm thick"],
    ],
    rating: [4.4, 76],
  },

  // ---------- Kitchen ----------
  {
    slug: "hearth-1-7l-electric-kettle",
    title: "Hearth 1.7L Stainless Electric Kettle",
    brand: "Hearth",
    category: "kitchen",
    price: 5499,
    compareAt: 6999,
    stock: 46,
    description:
      "A double-walled kettle that stays cool to the touch and boils 1.7 litres in a little over four minutes. The lid opens wide enough to actually clean inside.",
    specs: [
      ["Capacity", "1.7 litres"],
      ["Power", "1800W"],
      ["Body", "Double-wall stainless steel"],
      ["Safety", "Boil-dry and auto shut-off"],
    ],
    rating: [4.5, 311],
  },
  {
    slug: "hearth-5l-air-fryer",
    title: "Hearth 5L Digital Air Fryer",
    brand: "Hearth",
    category: "kitchen",
    price: 18999,
    compareAt: 23999,
    stock: 21,
    description:
      "A 5-litre basket that genuinely fits a family portion rather than one serving. Eight presets, a dishwasher-safe basket, and a drawer that pauses the timer when pulled out.",
    specs: [
      ["Capacity", "5 litres"],
      ["Power", "1500W"],
      ["Temperature", "80°C – 200°C"],
      ["Presets", "8"],
      ["Basket", "Non-stick, dishwasher safe"],
    ],
    rating: [4.4, 176],
  },
  {
    slug: "hearth-600w-blender-grinder",
    title: "Hearth 600W Blender & Grinder Set",
    brand: "Hearth",
    category: "kitchen",
    price: 8499,
    stock: 38,
    description:
      "A 600W motor with a glass jug and separate dry-grinding jar, which is the combination that handles both smoothies and masala without one ruining the other.",
    specs: [
      ["Power", "600W"],
      ["Jars", "1.5L glass jug, 300ml grinder"],
      ["Speeds", "3 + pulse"],
      ["Blades", "Stainless steel, detachable"],
    ],
    rating: [4.1, 254],
  },
  {
    slug: "hearth-4-slice-toaster",
    title: "Hearth 4-Slice Toaster",
    brand: "Hearth",
    category: "kitchen",
    price: 7299,
    stock: 29,
    description:
      "Four slots with independent controls, so two people can disagree about browning without negotiating. Wide slots take thick bread and the crumb tray slides out from the front.",
    specs: [
      ["Slots", "4, extra-wide"],
      ["Controls", "2 independent zones"],
      ["Settings", "7 browning levels"],
      ["Functions", "Defrost, reheat, cancel"],
    ],
    rating: [4.2, 88],
  },
  {
    slug: "hearth-12-cup-coffee-maker",
    title: "Hearth 12-Cup Filter Coffee Maker",
    brand: "Hearth",
    category: "kitchen",
    price: 11499,
    stock: 16,
    description:
      "A straightforward drip machine with a reusable gold-tone filter and a 30-minute keep-warm plate that switches itself off. No app, no pods.",
    specs: [
      ["Capacity", "12 cups / 1.8L"],
      ["Filter", "Reusable gold-tone"],
      ["Warming plate", "30 min auto-off"],
      ["Extras", "Pause-and-serve"],
    ],
    rating: [4.0, 61],
  },
  {
    slug: "hearth-induction-cooktop-2000w",
    title: "Hearth 2000W Induction Cooktop",
    brand: "Hearth",
    category: "kitchen",
    price: 9999,
    compareAt: 12499,
    stock: 24,
    description:
      "A single-zone induction plate that boils faster than a gas ring and stays cool around the pan. Ten power levels and a timer that shuts it off unattended.",
    specs: [
      ["Power", "2000W"],
      ["Levels", "10 power, 10 temperature"],
      ["Timer", "Up to 180 minutes"],
      ["Surface", "Tempered ceramic glass"],
    ],
    rating: [4.3, 142],
  },
  {
    slug: "hearth-3l-rice-cooker",
    title: "Hearth 3L Rice Cooker",
    brand: "Hearth",
    category: "kitchen",
    price: 6899,
    stock: 52,
    description:
      "Cooks up to eight cups and then holds them warm without drying the bottom layer. Includes a steamer tray that sits above the rice.",
    specs: [
      ["Capacity", "3 litres / 8 cups"],
      ["Power", "700W"],
      ["Modes", "Cook, keep warm, steam"],
      ["Inner pot", "Non-stick, removable"],
    ],
    rating: [4.4, 197],
  },

  // ---------- Home Comfort ----------
  {
    slug: "zephyr-tower-fan-remote",
    title: "Zephyr Tower Fan with Remote",
    brand: "Zephyr",
    category: "home-comfort",
    price: 14999,
    compareAt: 18499,
    stock: 17,
    description:
      "A bladeless-style tower that moves air across a room quietly enough to sleep through. Three speeds, an oscillation range wide enough to cover a bed, and a timer.",
    specs: [
      ["Height", "107cm"],
      ["Speeds", "3, plus night mode"],
      ["Oscillation", "80°"],
      ["Noise", "38dB on low"],
      ["Timer", "Up to 8 hours"],
    ],
    rating: [4.2, 113],
  },
  {
    slug: "zephyr-air-purifier-h13",
    title: "Zephyr H13 HEPA Air Purifier",
    brand: "Zephyr",
    category: "home-comfort",
    price: 32999,
    compareAt: 38999,
    stock: 9,
    description:
      "A true H13 HEPA and activated-carbon stack sized for a 40m² room, with a particulate sensor that drives the fan automatically. Filter replacement is a genuine annual cost, stated up front.",
    specs: [
      ["Filtration", "Pre-filter, H13 HEPA, carbon"],
      ["Room size", "Up to 40m²"],
      ["CADR", "330 m³/h"],
      ["Sensor", "PM2.5 with auto mode"],
      ["Filter life", "~12 months"],
    ],
    rating: [4.6, 74],
  },
  {
    slug: "zephyr-2000w-fan-heater",
    title: "Zephyr 2000W Ceramic Fan Heater",
    brand: "Zephyr",
    category: "home-comfort",
    price: 8999,
    stock: 31,
    description:
      "A ceramic heater with tip-over and overheat cut-offs, which is the specification that matters in a room with children. Warms a small room in a few minutes on the high setting.",
    specs: [
      ["Power", "1000W / 2000W"],
      ["Element", "PTC ceramic"],
      ["Safety", "Tip-over and overheat cut-off"],
      ["Thermostat", "Adjustable"],
    ],
    rating: [4.1, 156],
  },
  {
    slug: "zephyr-4l-humidifier",
    title: "Zephyr 4L Ultrasonic Humidifier",
    brand: "Zephyr",
    category: "home-comfort",
    price: 10499,
    stock: 23,
    description:
      "A 4-litre tank that runs through a night without a refill, with a top-fill opening so it can be filled from a jug rather than carried to a tap.",
    specs: [
      ["Tank", "4 litres"],
      ["Runtime", "Up to 30 hours"],
      ["Filling", "Top-fill"],
      ["Noise", "Under 32dB"],
      ["Auto shut-off", "Yes, when empty"],
    ],
    rating: [4.0, 89],
  },
  {
    slug: "zephyr-wall-mount-exhaust-fan",
    title: "Zephyr 8\" Wall Exhaust Fan",
    brand: "Zephyr",
    category: "home-comfort",
    price: 4999,
    stock: 44,
    description:
      "An 8-inch exhaust fan with a self-closing shutter that keeps outside air and insects out when it is off. Sized for a kitchen or a bathroom.",
    specs: [
      ["Blade size", "8 inches"],
      ["Airflow", "600 m³/h"],
      ["Shutter", "Automatic, self-closing"],
      ["Mounting", "Wall or window"],
    ],
    rating: [3.9, 118],
  },
  {
    slug: "zephyr-electric-blanket-double",
    title: "Zephyr Electric Blanket, Double",
    brand: "Zephyr",
    category: "home-comfort",
    price: 12999,
    stock: 11,
    description:
      "A double-size underblanket with separate controls for each side and a fleece surface. Machine washable once the controllers are detached.",
    specs: [
      ["Size", "Double, 190 × 137cm"],
      ["Controls", "2 independent, 6 heat levels"],
      ["Timer", "1–9 hours auto-off"],
      ["Care", "Machine washable"],
    ],
    rating: [4.3, 52],
  },

  // ---------- Lighting & Cleaning ----------
  {
    slug: "lumen-smart-bulb-4-pack",
    title: "Lumen Smart LED Bulb, 4-Pack",
    brand: "Lumen",
    category: "lighting-cleaning",
    price: 6499,
    compareAt: 8299,
    stock: 58,
    description:
      "Wi-Fi bulbs with tunable white and full colour, controllable from a phone or a voice assistant, and — importantly — still switchable from the wall switch like an ordinary bulb.",
    specs: [
      ["Fitting", "B22 bayonet"],
      ["Brightness", "800 lumens each"],
      ["Colour", "2700K – 6500K + RGB"],
      ["Connectivity", "Wi-Fi 2.4GHz"],
      ["Lifespan", "~25,000 hours"],
    ],
    rating: [4.2, 267],
  },
  {
    slug: "lumen-led-desk-lamp",
    title: "Lumen LED Desk Lamp",
    brand: "Lumen",
    category: "lighting-cleaning",
    price: 5799,
    stock: 36,
    description:
      "A flicker-free desk lamp with five colour temperatures and a weighted base that does not skate across the desk. A USB-A port on the base charges a phone.",
    specs: [
      ["Brightness", "5 levels"],
      ["Colour temperature", "3000K – 6000K"],
      ["Extras", "USB-A charging port"],
      ["Rating", "Flicker-free, RG0"],
    ],
    rating: [4.4, 141],
  },
  {
    slug: "lumen-rechargeable-emergency-light",
    title: "Lumen Rechargeable Emergency Light",
    brand: "Lumen",
    category: "lighting-cleaning",
    price: 3999,
    stock: 77,
    description:
      "A load-shedding staple: charges while the power is on and switches itself on the moment it goes off. Around six hours on the lower setting.",
    specs: [
      ["Runtime", "6h low, 3h high"],
      ["Charging", "8 hours to full"],
      ["Modes", "Auto-on, manual, dim"],
      ["Battery", "Lithium, replaceable"],
    ],
    rating: [4.5, 384],
  },
  {
    slug: "swift-cordless-stick-vacuum",
    title: "Swift Cordless Stick Vacuum",
    brand: "Swift",
    category: "lighting-cleaning",
    price: 34999,
    compareAt: 41999,
    stock: 7,
    description:
      "A 45-minute-runtime stick vacuum that converts to a handheld for stairs and car seats. Bagless, with a bin that empties without putting a hand near the dust.",
    specs: [
      ["Runtime", "Up to 45 minutes"],
      ["Suction", "23kPa"],
      ["Bin", "0.6L, one-touch empty"],
      ["Filtration", "HEPA, washable"],
      ["Weight", "2.6kg"],
    ],
    rating: [4.3, 96],
  },
  {
    slug: "swift-robot-vacuum-r20",
    title: "Swift Robot Vacuum R20",
    brand: "Swift",
    category: "lighting-cleaning",
    price: 44999,
    stock: 5,
    description:
      "A gyroscope-navigating robot that cleans in rows rather than at random, with a mopping attachment for hard floors. It will not map a three-storey house, and does not claim to.",
    specs: [
      ["Navigation", "Gyroscope, row-by-row"],
      ["Suction", "2700Pa"],
      ["Runtime", "120 minutes"],
      ["Mopping", "180ml water tank"],
      ["Height", "72mm"],
    ],
    rating: [4.0, 63],
  },
  {
    slug: "swift-steam-mop",
    title: "Swift Steam Mop",
    brand: "Swift",
    category: "lighting-cleaning",
    price: 13999,
    stock: 0,
    description:
      "Reaches steam in about 25 seconds and cleans sealed hard floors with water alone. Two washable microfibre pads are included.",
    specs: [
      ["Heat-up", "25 seconds"],
      ["Tank", "350ml"],
      ["Runtime", "~20 minutes"],
      ["Included", "2 microfibre pads"],
    ],
    rating: [3.8, 47],
  },
  {
    slug: "swift-microfibre-cloth-12-pack",
    title: "Swift Microfibre Cloths, 12-Pack",
    brand: "Swift",
    category: "lighting-cleaning",
    price: 1499,
    stock: 96,
    description:
      "Twelve colour-coded cloths so the kitchen cloth and the bathroom cloth stay separate. Machine washable a few hundred times.",
    specs: [
      ["Quantity", "12 cloths"],
      ["Size", "30 × 30cm"],
      ["Weight", "300 GSM"],
      ["Care", "Machine washable"],
    ],
    rating: [4.4, 208],
  },
];
