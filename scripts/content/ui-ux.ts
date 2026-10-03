// The UI/UX wall as it was hard-coded, imported once by scripts/import-content.mts
import type { WallBlock, WallItem, WallTag } from "../../src/modules/content/types.ts";

const tags = {
  eyes: {
    label: "Eyes",
    color: "#005740",
    logo: "/assets/icons/eyes.svg",
  },
  pixelPerfect: {
    label: "Pixel Perfect",
    color: "#2e77d6",
    logo: "/assets/icons/pixel-perfect.svg",
  },
  mcpHosted: {
    label: "MCP Hosted",
    color: "#3b8dff",
    logo: "/assets/icons/mcp-hosted.svg",
  },
  spark: { label: "Spark", color: "#7c3aed" },
  keijzerStats: { label: "KeijzerStats", color: "#65a30d" },
  nda: { label: "NDA", color: "#525252" },
  showreel: { label: "Showreel", color: "#db2777" },
  snippet: { label: "Snippet", color: "#ea580c" },
  concept: { label: "Concept", color: "#e11d48" },
  shader: { label: "Figma shader", color: "#171717" },
} satisfies Record<string, WallTag>;

const WORK = "/assets/images/work";
const EXPERIMENTS = "/assets/images/experiments";

// ── Eyes ──────────────────────────────────────────────────────────────────────

const eyesShowcase: WallItem = {
  id: "eyes-landingspage-showcase",
  title: "Landing page motion",
  tag: tags.eyes,
  media: {
    type: "video",
    src: `${WORK}/landingspage-showcase.mp4`,
    width: 2198,
    height: 1080,
  },
  background: "neutral",
  bare: true,
};

const eyesLanding: WallItem = {
  id: "eyes-landingspage",
  title: "Landing page",
  tag: tags.eyes,
  media: {
    type: "image",
    src: `${WORK}/eyes-landingspage.png`,
    width: 1917,
    height: 944,
  },
  background: "neutral",
  description:
    "The Eyes landing page, built around one idea: answers instead of dashboards.",
  link: { label: "Visit site", href: "https://eyes.dev/" },
};

const eyesOverview: WallItem = {
  id: "eyes-analytics-overview",
  title: "Analytics overview",
  tag: tags.eyes,
  media: {
    type: "image",
    src: `${WORK}/eyes-analytics-overview-dashboard.jpg`,
    width: 1920,
    height: 1000,
  },
  background: "forest",
  description:
    "Eyes is a product analytics suite we built for our own software. I helped design the full app, from overview to funnels.",
  link: { label: "Visit site", href: "https://eyes.dev/" },
};

const eyesFunnel: WallItem = {
  id: "eyes-checkout-funnel",
  title: "Checkout funnel",
  tag: tags.eyes,
  media: {
    type: "image",
    src: `${WORK}/eyes-analytics-checkout-funnel.jpg`,
    width: 1920,
    height: 1000,
  },
  background: "mint",
  description:
    "Funnels show where people drop off. Eyes keeps watch and flags it when a step suddenly loses people.",
  link: { label: "Visit site", href: "https://eyes.dev/" },
};

const navIsland: WallItem = {
  id: "nav-island-sequence",
  title: "Nav island sequence",
  tag: tags.eyes,
  media: {
    type: "video",
    src: `${EXPERIMENTS}/nav-sequencing.mp4`,
    width: 1920,
    height: 1080,
  },
  background: "mint",
  // The recording includes browser tabs and the taskbar
  zoom: 1.4,
};

const navAnticipation: WallItem = {
  id: "nav-anticipation",
  title: "Nav anticipation",
  tag: tags.eyes,
  media: {
    type: "video",
    src: `${EXPERIMENTS}/nav-anticipation.mp4`,
    width: 1306,
    height: 832,
  },
  background: "forest",
};

// ── Pixel Perfect ─────────────────────────────────────────────────────────────

const ppaLanding: WallItem = {
  id: "ppa-landing",
  title: "Agency website",
  tag: tags.pixelPerfect,
  media: {
    type: "image",
    src: `${WORK}/ppa-landing.png`,
    width: 1917,
    height: 941,
  },
  background: "ocean",
  description:
    "A full redesign of the agency site I'm part of. The old one made it hard to tell what we offered, so the new one says it in one line.",
  link: { label: "Visit site", href: "https://pixelperfect.agency/" },
};

const ppaServices: WallItem = {
  id: "ppa-services",
  title: "Services",
  tag: tags.pixelPerfect,
  media: {
    type: "image",
    src: `${WORK}/ppa-landing-2.png`,
    width: 1915,
    height: 938,
  },
  background: "sky",
  description:
    "The offer split into two clear paths, with real work in the background as proof.",
  link: { label: "Visit site", href: "https://pixelperfect.agency/" },
};

const ppaAi: WallItem = {
  id: "ppa-ai",
  title: "AI section",
  tag: tags.pixelPerfect,
  media: {
    type: "image",
    src: `${WORK}/ppa-landing-3.png`,
    width: 1917,
    height: 942,
  },
  background: "midnight",
  description:
    "AI explained for business owners, ending in one clear next step: a proof of concept.",
  link: { label: "Visit site", href: "https://pixelperfect.agency/" },
};

const ppaShowcase: WallItem = {
  id: "ppa-showcase",
  title: "Website showcase",
  tag: tags.pixelPerfect,
  media: {
    type: "video",
    src: `${EXPERIMENTS}/pixel-perfect-showcase.webm`,
    width: 1920,
    height: 1080,
  },
  background: "ocean",
  link: { label: "Visit site", href: "https://pixelperfect.agency/" },
};

// ── MCP Hosted ────────────────────────────────────────────────────────────────

const mcpDemo: WallItem = {
  id: "mcp-demo",
  title: "Website walkthrough",
  tag: tags.mcpHosted,
  media: {
    type: "video",
    src: `${WORK}/mcp-demo.mp4`,
    width: 1916,
    height: 946,
  },
  background: "sky",
  description:
    "A tool we built that connects everyday software to Claude and ChatGPT. The site animation is a web and video hybrid, made with Claude Code.",
  link: { label: "Visit site", href: "https://mcphosted.com/" },
};

const mcpSecurity: WallItem = {
  id: "mcp-hosted-security",
  title: "Security",
  tag: tags.mcpHosted,
  media: {
    type: "image",
    src: `${WORK}/mcp-hosted-1.png`,
    width: 1917,
    height: 941,
  },
  background: "midnight",
  description:
    "A technical topic in plain language: your key stays with us, your AI only sees the answers.",
  link: { label: "Visit site", href: "https://mcphosted.com/" },
};

const mcpConnections: WallItem = {
  id: "mcp-hosted-connections",
  title: "Connections",
  tag: tags.mcpHosted,
  media: {
    type: "image",
    src: `${WORK}/mcp-hosted-2.png`,
    width: 1915,
    height: 942,
  },
  background: "indigo",
  description:
    "Pick a tool and the phone shows what you can ask it. I designed and built the phone mockup in Figma.",
  link: { label: "Visit site", href: "https://mcphosted.com/" },
};

// ── Spark ─────────────────────────────────────────────────────────────────────

const sparkReel: WallItem = {
  id: "spark-showcase-reel",
  title: "Design system reel",
  tag: tags.spark,
  media: {
    type: "video",
    src: `${WORK}/spark-showcase-reel.mp4`,
    width: 3000,
    height: 2160,
  },
  background: "indigo",
  bare: true,
  description:
    "Spark is the visual direction I created for our apps: a loose design system for styling a typical app fast. Hoek Staalhandel and WK Machines are built on it.",
};

const sparkCampaigns: WallItem = {
  id: "spark-campaign-management",
  title: "Campaign management",
  tag: tags.spark,
  media: {
    type: "image",
    src: `${WORK}/spark-campaign-management-table.jpg`,
    width: 1920,
    height: 1000,
  },
  background: "ocean",
  description:
    "A typical Spark screen: sidebar, key numbers, a filterable table and a floating bar for switching views.",
};

// ── Loose work ────────────────────────────────────────────────────────────────

const showreel: WallItem = {
  id: "showcase-reel",
  title: "Product showreel",
  tag: tags.showreel,
  media: {
    type: "video",
    src: `${WORK}/showcase-reel.mp4`,
    width: 1902,
    height: 1524,
  },
  background: "graphite",
  bare: true,
};

const emailSequencing: WallItem = {
  id: "email-sequencing",
  title: "Email sequencing",
  tag: tags.snippet,
  media: {
    type: "image",
    src: `${WORK}/email-sequencing-editor.jpg`,
    width: 1920,
    height: 1000,
  },
  background: "indigo",
};

const reportGenerator: WallItem = {
  id: "keijzerstats-report-generator",
  title: "Report generator",
  tag: tags.keijzerStats,
  media: {
    type: "image",
    src: `${WORK}/keijzerstats-report-generator-settings.jpg`,
    width: 1920,
    height: 1000,
  },
  background: "lime",
};

const securityAssessment: WallItem = {
  id: "security-assessment",
  title: "Security assessment",
  tag: tags.concept,
  media: {
    type: "image",
    src: `${WORK}/practice-security-assessment-report.jpg`,
    width: 1920,
    height: 1000,
  },
  background: "ocean",
};

const cryptoInvoices: WallItem = {
  id: "crypto-invoice-editor",
  title: "Crypto invoice editor",
  tag: tags.nda,
  media: {
    type: "image",
    src: `${WORK}/nda-invoice-editor-dark.jpg`,
    width: 1920,
    height: 1000,
  },
  background: "graphite",
};

const distressedInk: WallItem = {
  id: "distressed-ink",
  title: "Distressed Ink",
  tag: tags.shader,
  media: {
    type: "image",
    src: `${EXPERIMENTS}/figma-shader-thumbnail.png`,
    width: 2880,
    height: 1620,
  },
  background: "graphite",
  description:
    "A Figma shader for a rough, weathered ink look: uneven smudging, diagonal linework, hard black-and-white contrast and a dry grain overlay.",
  link: {
    label: "View on Figma",
    href: "https://www.figma.com/community/shader/1677679061679200717/distressed-ink",
  },
};

// ── Wall ──────────────────────────────────────────────────────────────────────

// Ordered by importance: the most important work takes the big slots near
// the top, the least important sits in the last row
export const uiUxWall: WallBlock[] = [
  {
    layout: "spiral",
    items: [eyesFunnel, ppaServices, mcpSecurity, emailSequencing],
  },
  {
    layout: "spiral",
    items: [ppaLanding, eyesOverview, ppaAi, eyesLanding],
  },
  {
    layout: "triple",
    items: [mcpDemo, mcpConnections, cryptoInvoices],
  },
  {
    layout: "triple",
    items: [showreel, eyesShowcase, securityAssessment],
  },
  {
    layout: "triple",
    items: [sparkReel, sparkCampaigns, reportGenerator],
  },
];

// Side projects and motion studies, shown in the experiments modal on the
// home page instead of on the wall. The first two fill the home page widget:
// an image, then a video.
export const experiments: WallItem[] = [
  distressedInk,
  navIsland,
  navAnticipation,
  ppaShowcase,
];

// Shown on the home page widget, must be images
export const uiUxHighlights: [WallItem, WallItem] = [eyesFunnel, ppaLanding];
