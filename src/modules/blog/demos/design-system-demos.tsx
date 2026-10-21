"use client";

import "continuum/styles.css";

import {
  Bell,
  ChartColumn,
  ChevronRight,
  Clock,
  Download,
  FileText,
  Folder,
  LayoutGrid,
  ListFilter,
  Mail,
  Plus,
  Receipt,
  Repeat,
  Search,
  Settings,
  Users,
} from "lucide-react";
import { Geist, Inter } from "next/font/google";
import {
  ActivityItem,
  ActivityList,
  AppPanel,
  AppShell,
  AreaChart,
  Avatar,
  AvatarStack,
  Badge,
  BottomBar,
  Breadcrumb,
  BreadcrumbHome,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Button,
  Card,
  CardDelta,
  CardHeader,
  CardTitle,
  CardValue,
  Checkbox,
  Dock,
  DockAction,
  DockItem,
  Field,
  FieldHelper,
  FieldLabel,
  FilterChip,
  FunnelChart,
  HeaderBar,
  Input,
  Kbd,
  NavGroup,
  NavItem,
  SegmentedControl,
  SegmentedControlItem,
  Sidebar,
  SidebarAccount,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarLogo,
  SidebarToggle,
  StatCard,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsList,
  TabsTrigger,
  Theme as SystemTheme,
  type ThemeMode,
  type ThemeName,
  Toolbar,
  ToolbarButton,
  ToolbarChip,
} from "continuum";
import {
  type ComponentProps,
  type CSSProperties,
  type PropsWithChildren,
  type ReactNode,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Choice, Demo, Slider } from "~/modules/blog/components/demo";
import { REDLINE, Redline, SELECTION } from "~/modules/blog/demos/redline";
import cn from "~/utils/cn";
import { scrollerOf } from "~/utils/footer";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const fonts = `${geist.variable} ${inter.variable}`;

// Each swatch is the theme's action colour. Themes whose actions are drawn with a gradient get a shaded one.
const themeOptions: { value: ThemeName; label: string; shaded?: boolean }[] = [
  { value: "eyes", label: "Eyes" },
  { value: "indigo", label: "Indigo" },
  { value: "electric", label: "Electric" },
  { value: "lime", label: "Lime", shaded: true },
  { value: "stone", label: "Stone", shaded: true },
  { value: "violet", label: "Violet" },
];

const modeOptions: { value: ThemeMode; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

interface DemoSettingsState {
  theme: ThemeName;
  mode: ThemeMode;
  radius: number;
}

const DEFAULT_SETTINGS: DemoSettingsState = { theme: "eyes", mode: "light", radius: 1 };

// One set of settings for every demo on the page, changed from the floating panel.
let settings = DEFAULT_SETTINGS;
const settingsListeners = new Set<() => void>();

const updateSettings = (change: Partial<DemoSettingsState>) => {
  settings = { ...settings, ...change };
  for (const listener of settingsListeners) listener();
};

const subscribeSettings = (listener: () => void) => {
  settingsListeners.add(listener);
  return () => settingsListeners.delete(listener);
};

const useSettings = () => useSyncExternalStore(subscribeSettings, () => settings, () => DEFAULT_SETTINGS);

const RADII = ["chip", "item", "control", "control-lg", "card", "panel", "dock"] as const;

// The pill dock is 9999px, so below 100% it shrinks from 20px, half the bar's height, instead.
const scaledRadius = (token: (typeof RADII)[number], scale: number) =>
  token === "dock" && scale < 1
    ? `min(var(--base-radius-dock) * ${scale}, ${20 * scale}px)`
    : `calc(var(--base-radius-${token}) * ${scale})`;

/**
 * The system's theme in the page's settings, with its radius tokens multiplied by the corner scale.
 * The theme's values are copied a level down first, since a token can't be defined in terms of itself.
 */
const Theme = ({ theme, mode, children, ...props }: ComponentProps<typeof SystemTheme>) => {
  const { radius, ...page } = useSettings();

  return (
    <SystemTheme theme={theme ?? page.theme} mode={mode ?? page.mode} {...props}>
      <div
        className="contents"
        style={
          {
            "--radius-scale": radius,
            ...Object.fromEntries(RADII.map((token) => [`--base-radius-${token}`, `var(--pds-radius-${token})`])),
          } as CSSProperties
        }
      >
        <div
          className="contents"
          style={
            radius === 1
              ? undefined
              : (Object.fromEntries(RADII.map((token) => [`--pds-radius-${token}`, scaledRadius(token, radius)])) as CSSProperties)
          }
        >
          {children}
        </div>
      </div>
    </SystemTheme>
  );
};

/** A quick morph that overshoots a touch and settles, like the Dynamic Island. */
const ISLAND = "0.55s cubic-bezier(0.3, 1.3, 0.5, 1)";
const PILL = 44;
/** Centres the 18px chevron in the pill, inside its 1px border. */
const CHEVRON_INSET = (PILL - 2 - 18) / 2;

/** A dot per product's theme, each in its own action colour; picking one sets the page's demos. */
const ThemeDots = ({ className, size = "size-7" }: { className?: string; size?: string }) => {
  const { theme } = useSettings();

  return (
    <div className={cn("flex", className)}>
      {themeOptions.map((option) => (
        <SystemTheme key={option.value} theme={option.value} mode="light" asChild>
          <button
            type="button"
            aria-label={option.label}
            aria-pressed={option.value === theme}
            onClick={() => updateSettings({ theme: option.value })}
            className={cn(
              size,
              "cursor-pointer rounded-full shadow-[inset_0_0_0_1px_rgb(0_0_0/0.08)] ring-offset-2 ring-offset-neutral-50 transition-[box-shadow,transform] duration-200 hover:scale-110",
              option.value === theme ? "ring-1 ring-neutral-950" : "ring-0",
            )}
            style={{
              backgroundColor: "var(--pds-action)",
              backgroundImage: option.shaded
                ? "radial-gradient(circle at 35% 30%, var(--pds-primary-300), var(--pds-primary-500) 55%, var(--pds-primary-700))"
                : undefined,
            }}
          />
        </SystemTheme>
      ))}
    </div>
  );
};

/** The page's demo settings, floating at the right so they stay in reach while scrolling. */
export const DemoSettings = () => {
  const { theme, mode, radius } = useSettings();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(true);
  const [height, setHeight] = useState<number>();
  const ref = useRef<HTMLElement>(null);
  const content = useRef<HTMLDivElement>(null);
  // Folded through the intro and outro, open while the middle of the screen sits between the
  // top of the first demo and the bottom of the last. The demos load in late, so they're looked
  // up on every check. A manual toggle holds until the reader crosses into or out of that stretch.
  useEffect(() => {
    const post = ref.current?.parentElement;
    if (!post) return;
    // The page scrolls itself, unless the post is open in a section layer
    const scroller = scrollerOf(post);
    const scrollTarget = scroller ?? window;

    let active: boolean | undefined;
    let frame = 0;
    const update = () => {
      frame = 0;
      // On smaller screens it stays shut until the reader opens it
      if (!window.matchMedia("(min-width: 48rem)").matches) return;
      const demos = post.querySelectorAll("figure");
      const first = demos[0];
      const last = demos[demos.length - 1];
      if (!first || !last) return;
      const top = scroller?.getBoundingClientRect().top ?? 0;
      const middle = top + (scroller?.clientHeight ?? window.innerHeight) / 2;
      const next = first.getBoundingClientRect().top <= middle && last.getBoundingClientRect().bottom >= middle;
      if (next === active) return;
      active = next;
      setCollapsed(!next);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    scrollTarget.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      scrollTarget.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  useEffect(() => {
    const element = content.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setHeight(element.offsetHeight));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const toggle = () => setCollapsed(!collapsed);

  const themeLabel = themeOptions.find((option) => option.value === theme)?.label;

  return (
    <aside
      ref={ref}
      className="fixed bottom-4 left-4 z-40 flex flex-col items-start gap-2 md:right-4 md:left-auto md:items-end xl:top-1/2 xl:right-6 xl:bottom-auto xl:-translate-y-1/2"
    >
      <div
        className={cn(
          "relative items-start justify-end overflow-hidden border border-neutral-950/10 bg-neutral-50/90 backdrop-blur-xl",
          open ? "flex" : "hidden md:flex",
        )}
        style={{
          width: collapsed ? PILL : 256,
          height: collapsed ? PILL : height,
          borderRadius: collapsed ? PILL / 2 : 24,
          transition: `width ${ISLAND}, height ${ISLAND}, border-radius ${ISLAND}`,
        }}
      >
        <button
          type="button"
          aria-label="Demo settings"
          aria-expanded={false}
          tabIndex={collapsed ? 0 : -1}
          onClick={toggle}
          className={cn(
            "absolute inset-0 grid cursor-pointer place-items-center text-neutral-950 transition-opacity duration-200",
            collapsed ? "delay-150" : "pointer-events-none opacity-0",
          )}
        >
        </button>
        <ChevronRight
          aria-hidden
          className={cn(
            "pointer-events-none absolute size-[18px] text-neutral-950",
            collapsed && "rotate-180",
          )}
          style={{
            top: collapsed ? CHEVRON_INSET : 21,
            right: collapsed ? CHEVRON_INSET : 20,
            transition: `top ${ISLAND}, right ${ISLAND}, rotate ${ISLAND}`,
          }}
          {...icon}
        />
        <div
          ref={content}
          inert={collapsed}
          className={cn(
            "flex w-[254px] shrink-0 flex-col gap-6 p-5 transition-[opacity,filter,scale] duration-200",
            collapsed ? "scale-95 opacity-0 blur-sm" : "delay-150",
          )}
        >
          <button
            type="button"
            aria-expanded
            onClick={toggle}
            className="flex cursor-pointer items-center justify-between text-left text-neutral-950 text-sm"
          >
            Demo settings
          </button>
          <fieldset>
            <legend className="mb-3 flex w-full items-baseline justify-between gap-4 text-xs">
              <span className="text-neutral-950/60">Theme</span>
              <span className="text-neutral-950">{themeLabel}</span>
            </legend>
            <ThemeDots className="justify-between" />

          </fieldset>
          <Choice label="Mode" value={mode} options={modeOptions} onChange={(value) => updateSettings({ mode: value })} />
          <Slider
            label="Corner radius"
            value={radius}
            min={0}
            max={2}
            step={0.05}
            format={(value) => `${Math.round(value * 100)}%`}
            onChange={(value) => updateSettings({ radius: value })}
          />
        </div>
      </div>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => {
          setOpen(!open);
          setCollapsed(false);
        }}
        className="h-10 cursor-pointer rounded-full border border-neutral-950/10 bg-neutral-50/90 px-4 text-neutral-950 text-sm shadow-[0_12px_24px_-12px_rgb(0_0_0/0.18)] backdrop-blur-xl md:hidden"
      >
        {open ? "Close" : "Demo settings"}
      </button>
    </aside>
  );
};

const SCREEN = { width: 1040, height: 520 };

const icon = { strokeWidth: 1.5 };

const invoices = [
  { client: "Harbour & Co", status: "Paid", tone: "success", amount: "€4,500.00" },
  { client: "Lindqvist Studio", status: "Pending", tone: "warning", amount: "€1,250.00" },
  { client: "Okafor Labs", status: "Draft", tone: "neutral", amount: "€980.00" },
] as const;

/** One small app screen, built only from the system, so a theme switch restyles all of it. */
const AppSidebar = ({ className }: { className?: string }) => (
  <Sidebar className={className}>
    <SidebarHeader>
      <SidebarLogo>
        <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <path d="M3 2h5.5v4.5H13V14H3z" />
          <path d="M10 2l3 3h-3z" />
        </svg>
      </SidebarLogo>
      <SidebarToggle />
    </SidebarHeader>
    <SidebarGroup divided aria-label="Invoices">
      <NavItem variant="primary" icon={<Plus {...icon} />}>
        New invoice
      </NavItem>
      <NavItem icon={<FileText {...icon} />} active>
        All invoices
      </NavItem>
      <NavItem icon={<Clock {...icon} />}>Overdue</NavItem>
      <NavItem icon={<Repeat {...icon} />}>Recurring</NavItem>
    </SidebarGroup>
    <SidebarGroup label="Clients">
      <NavGroup icon="🌿" label="Harbour & Co" defaultOpen>
        <NavItem variant="inset" icon={<FileText {...icon} />}>
          Invoices
        </NavItem>
        <NavItem variant="inset" icon={<Users {...icon} />}>
          Contacts
        </NavItem>
      </NavGroup>
      <NavGroup icon="🚀" label="Okafor Labs" />
      <NavItem variant="project" icon={<Folder {...icon} />}>
        All clients
      </NavItem>
    </SidebarGroup>
    <SidebarFooter>
      <SidebarAccount avatar={<Avatar fallback="N" size={36} />} name="Northwind" plan="Team" />
      <Bell className="size-[18px] text-neutral-600" strokeWidth={1.5} />
    </SidebarFooter>
  </Sidebar>
);

const Screen = () => (
  <AppShell className="min-h-0" style={{ width: SCREEN.width, height: SCREEN.height }}>
    <AppSidebar className="w-60" />
    <AppPanel>
      <HeaderBar>
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbHome />
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>Invoices</BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>October</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <Button>
          Export <Download {...icon} />
        </Button>
      </HeaderBar>
      <div className="flex flex-col gap-5 px-10 pt-6">
        <div className="flex items-end justify-between gap-6">
          <div className="flex flex-col gap-2">
            <StatTitle>October invoices</StatTitle>
          </div>
          <SegmentedControl defaultValue="all" aria-label="Status">
            <SegmentedControlItem value="all">All</SegmentedControlItem>
            <SegmentedControlItem value="paid">Paid</SegmentedControlItem>
            <SegmentedControlItem value="open">Open</SegmentedControlItem>
          </SegmentedControl>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Invoiced" value="€24,180" delta="+12%" trend="up" />
          <StatCard label="Paid on time" value="81%" delta="+4%" trend="up" />
          <StatCard label="Overdue" value="€3,420" delta="-6%" trend="down" />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Status</TableHead>
              <TableHead numeric>Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((invoice) => (
              <TableRow key={invoice.client}>
                <TableCell>{invoice.client}</TableCell>
                <TableCell>
                  <Badge tone={invoice.tone}>{invoice.status}</Badge>
                </TableCell>
                <TableCell numeric>{invoice.amount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <BottomBar floating>
        <Dock defaultValue="overview" aria-label="Sections">
          <DockItem value="overview">
            <LayoutGrid {...icon} /> Overview
          </DockItem>
          <DockItem value="reports">
            <ChartColumn {...icon} /> Reports
          </DockItem>
          <DockItem value="settings">
            <Settings {...icon} /> Settings
          </DockItem>
        </Dock>
        <DockAction size="icon" aria-label="New invoice">
          <Plus {...icon} />
        </DockAction>
      </BottomBar>
    </AppPanel>
  </AppShell>
);

// The page title is plain text in the screens, so it borrows the stat value's style.
const StatTitle = ({ children }: PropsWithChildren) => (
  <span className="font-medium text-lg text-neutral-950">
    {children}
  </span>
);

const useFitScale = (width: number) => {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      if (entry) setScale(entry.contentRect.width / width);
    });
    observer.observe(element);

    return () => observer.disconnect();
  }, [width]);

  return [ref, scale] as const;
};

/** Scales the fixed-size screen to whatever width it is given. */
const Fitted = ({ className }: { className?: string }) => {
  const [ref, scale] = useFitScale(SCREEN.width);

  return (
    <div ref={ref} inert className={cn("relative w-full overflow-hidden", className)} style={{ height: SCREEN.height * scale }}>
      <div className="absolute top-0 left-0 origin-top-left" style={{ transform: `scale(${scale})` }}>
        <Theme className={fonts}>
          <Screen />
        </Theme>
      </div>
    </div>
  );
};

// The table is drawn at this size, then scaled to cover its frame.
const TABLE = { width: 2000, height: 1400 };

// Extra table round the layout, so the frame's corners still look onto the mat.
const BLEED = 400;

// A faint plus every 64px, like the marks on a cutting mat.
const TABLE_GRID = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64'%3E%3Cpath d='M32 27v10M27 32h10' stroke='%23000' stroke-opacity='0.14'/%3E%3C/svg%3E")`;

/** Something lying on the table, at a spot in table pixels. */
const Piece = ({ x, y, children }: PropsWithChildren<{ x: number; y: number }>) => (
  <div className="absolute" style={{ left: x + BLEED, top: y + BLEED }}>
    {children}
  </div>
);

// A surface for loose components, so they read as one object on the table.
const SLAB = "rounded-[calc(16px*var(--radius-scale))] border border-neutral-200 bg-neutral-50 p-5";

const RAMP_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;

const Ramp = ({ ramp }: { ramp: string }) => (
  <div className="flex overflow-hidden rounded-[calc(12px*var(--radius-scale))] border border-neutral-200">
    {RAMP_STEPS.map((step) => (
      <span key={step} className="h-20 w-10" style={{ backgroundColor: `var(--pds-${ramp}-${step})` }} />
    ))}
  </div>
);

const sessions = [
  { label: "Mon", value: 120 },
  { label: "Tue", value: 180 },
  { label: "Wed", value: 390 },
  { label: "Thu", value: 300 },
  { label: "Fri", value: 240 },
  { label: "Sat", value: 290 },
  { label: "Sun", value: 110 },
];

const revenue = [
  { label: "Mon", value: 210 },
  { label: "Tue", value: 260 },
  { label: "Wed", value: 230 },
  { label: "Thu", value: 320 },
  { label: "Fri", value: 360 },
  { label: "Sat", value: 300 },
  { label: "Sun", value: 380 },
];

const funnel = [
  { label: "/pricing", value: 1840 },
  { label: "/checkout", value: 1426, delta: -22.5 },
  { label: "/checkout/pay", value: 557, delta: -38.4 },
];

/**
 * The system's own components laid out on a work table, seen from above at an
 * isometric angle.
 */
export const SystemCover = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  const { theme, mode } = useSettings();
  const dark = mode === "dark";

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      if (entry) {
        setScale(Math.max(entry.contentRect.width / 1500, entry.contentRect.height / 700));
      }
    });
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return (
    <SystemTheme
      ref={ref}
      inert
      theme={theme}
      mode={mode}
      className={cn("absolute inset-0 overflow-hidden", dark ? "bg-neutral-100" : "bg-[#f5f5f4]")}
    >
      <div
        className="absolute top-1/2 left-1/2"
        style={{ transform: `translate(-50%, -50%) scale(${scale})` }}
      >
        <Theme
          className={cn(fonts, "relative")}
          style={{
            width: TABLE.width + BLEED * 2,
            height: TABLE.height + BLEED * 2,
            backgroundImage: dark ? TABLE_GRID.replace("%23000", "%23fff") : TABLE_GRID,
            transform: "rotateX(55deg) rotateZ(-38deg)",
          }}
        >
          {/* Big type, printed flat onto the middle of the table, with everything else round it */}
          <span
            className="absolute -translate-x-1/2 -translate-y-1/2 font-medium text-neutral-950 leading-none tracking-[-0.04em]"
            style={{ left: BLEED + TABLE.width / 2, top: BLEED + TABLE.height / 2, fontSize: 300 }}
          >
            Aa
          </span>

          <Piece x={120} y={120}>
            <div className="h-[460px] w-60 overflow-hidden rounded-[calc(16px*var(--radius-scale))] border border-neutral-200 bg-neutral-100">
              <AppSidebar />
            </div>
          </Piece>

          <Piece x={420} y={120}>
            <Card layout="chart" className="w-[520px]">
              <CardHeader>
                <CardTitle>Sessions over time</CardTitle>
                <div className="flex items-baseline gap-2">
                  <CardValue size="lg">12.4k</CardValue>
                  <CardDelta>+10.7% last mo</CardDelta>
                </div>
              </CardHeader>
              <AreaChart data={sessions} color="var(--pds-chart-5)" height={150} yTicks={[0, 200, 400]} />
            </Card>
          </Piece>

          <Piece x={1000} y={120}>
            <div className="flex flex-col gap-3">
              <Ramp ramp="neutral" />
              <Ramp ramp="success" />
            </div>
          </Piece>

          <Piece x={1520} y={120}>
            <div className={cn(SLAB, "flex flex-col items-start gap-3")}>
              <SegmentedControl defaultValue="all" aria-label="Status">
                <SegmentedControlItem value="all">All</SegmentedControlItem>
                <SegmentedControlItem value="paid">Paid</SegmentedControlItem>
                <SegmentedControlItem value="open">Open</SegmentedControlItem>
              </SegmentedControl>
              <div className="flex gap-2">
                <Badge tone="success">Paid</Badge>
                <Badge tone="warning">Pending</Badge>
                <Badge variant="pill" tone="error">
                  -6%
                </Badge>
              </div>
            </div>
          </Piece>

          <Piece x={420} y={440}>
            <div className="flex flex-col gap-4">
              <StatCard className="w-56" label="Paid on time" value="81%" delta="+4%" trend="up" />
              <StatCard className="w-56" label="Overdue" value="€3,420" delta="-6%" trend="down" />
            </div>
          </Piece>

          <Piece x={1520} y={360}>
            <div className="w-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead numeric>Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.client}>
                      <TableCell>{invoice.client}</TableCell>
                      <TableCell numeric>{invoice.amount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Piece>

          <Piece x={120} y={640}>
            <div className={cn(SLAB, "flex w-60 flex-col gap-3")}>
              <Input size="sm" placeholder="Search clients" leadingIcon={<Search {...icon} />} />
              <Button>
                New invoice <Plus {...icon} />
              </Button>
              <Button variant="secondary">Import</Button>
            </div>
          </Piece>

          <Piece x={120} y={880}>
            <div className={cn(SLAB, "flex w-60 flex-wrap gap-2")}>
              <Badge tone="success">Paid</Badge>
              <Badge tone="warning">Pending</Badge>
              <Badge>Draft</Badge>
              <Badge>Sent</Badge>
            </div>
          </Piece>

          <Piece x={1280} y={500}>
            <div className={cn(SLAB, "flex flex-col gap-3")}>
              <Button>Send</Button>
              <Button variant="secondary">Preview</Button>
            </div>
          </Piece>

          <Piece x={1280} y={720}>
            <div className={cn(SLAB, "flex items-center gap-3")}>
              <Switch aria-label="Auto-send" />
              <Checkbox defaultChecked aria-label="Copy me" />
            </div>
          </Piece>

          <Piece x={420} y={740}>
            <div className={cn(SLAB, "flex items-center gap-3")}>
              <Button variant="secondary">Cancel</Button>
              <Button>
                Export <Download {...icon} />
              </Button>
            </div>
          </Piece>

          <Piece x={420} y={860}>
            <div className={cn(SLAB, "w-72")}>
              <Field>
                <FieldLabel>Email</FieldLabel>
                <Input size="sm" placeholder="name@company.com" leadingIcon={<Mail {...icon} />} />
                <FieldHelper>We only use it for invoices.</FieldHelper>
              </Field>
            </div>
          </Piece>

          <Piece x={880} y={960}>
            <div className={cn(SLAB, "flex flex-col gap-4")}>
              <Tabs defaultValue="general">
                <TabsList>
                  <TabsTrigger value="general">General</TabsTrigger>
                  <TabsTrigger value="billing">Billing</TabsTrigger>
                  <TabsTrigger value="team">Team</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="flex items-center gap-3">
                <Switch defaultChecked aria-label="Reminders" />
                <Checkbox defaultChecked aria-label="Paid" />
                <Checkbox aria-label="Overdue" />
                <Kbd>K</Kbd>
              </div>
            </div>
          </Piece>

          <Piece x={1000} y={340}>
            <div className="flex max-w-[460px] flex-wrap gap-1.5">
              <FilterChip icon={<Users {...icon} />}>Device: 2</FilterChip>
              <FilterChip icon={<LayoutGrid {...icon} />}>Region: 1</FilterChip>
              <FilterChip icon={<ChartColumn {...icon} />}>Source: 1</FilterChip>
            </div>
          </Piece>

          <Piece x={1520} y={640}>
            <div className={cn(SLAB, "w-[400px]")}>
              <ActivityList>
                <ActivityItem
                  tone="success"
                  icon={<Receipt {...icon} />}
                  title="Harbour & Co paid"
                  time="11/03 · 14:42"
                  action={<Badge tone="success">Paid</Badge>}
                />
                <ActivityItem
                  icon={<Mail {...icon} />}
                  title="Invoice sent"
                  time="10/03 · 09:12"
                  action={<Badge>Sent</Badge>}
                />
              </ActivityList>
            </div>
          </Piece>

          <Piece x={120} y={1060}>
            <div className="w-[700px]">
              <FunnelChart steps={funnel} height={260} />
            </div>
          </Piece>

          <Piece x={1240} y={1100}>
            <BottomBar>
              <Dock defaultValue="overview" aria-label="Sections">
                <DockItem value="overview">
                  <LayoutGrid {...icon} /> Overview
                </DockItem>
                <DockItem value="reports">
                  <ChartColumn {...icon} /> Reports
                </DockItem>
                <DockItem value="settings">
                  <Settings {...icon} /> Settings
                </DockItem>
              </Dock>
              <DockAction aria-label="Filters, 6 applied">
                <ListFilter {...icon} /> (6)
              </DockAction>
            </BottomBar>
          </Piece>

          <Piece x={880} y={1120}>
            <div className={cn(SLAB, "flex items-center gap-4")}>
              <AvatarStack>
                <Avatar shape="round" size={24} fallback="AK" />
                <Avatar shape="round" size={24} fallback="JM" />
                <Avatar shape="round" size={24} fallback="SO" />
              </AvatarStack>
              <Badge variant="count" tone="success">
                12
              </Badge>
            </div>
          </Piece>

          <Piece x={1520} y={940}>
            <Toolbar aria-label="Cell">
              <ToolbarChip>Suggestions</ToolbarChip>
              <ToolbarButton>
                <Repeat {...icon} /> Rewrite
              </ToolbarButton>
              <ToolbarButton>
                <FileText {...icon} /> Summarise
              </ToolbarButton>
            </Toolbar>
          </Piece>

          <Piece x={600} y={-250}>
            <StatCard className="w-56" label="Invoices sent" value="248" delta="+12%" trend="up" />
          </Piece>

          <Piece x={560} y={-30}>
            <div className={SLAB}>
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbHome />
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>Clients</BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Harbour & Co</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </Piece>

          <Piece x={900} y={-220}>
            <div className={cn(SLAB, "flex w-60 flex-col gap-1")}>
              <NavItem icon={<FileText {...icon} />} active>
                All invoices
              </NavItem>
              <NavItem icon={<Clock {...icon} />}>Overdue</NavItem>
              <NavItem icon={<Repeat {...icon} />}>Recurring</NavItem>
            </div>
          </Piece>

          <Piece x={1160} y={1260}>
            <Card layout="chart" className="w-[440px]">
              <CardHeader>
                <CardTitle>Revenue</CardTitle>
                <div className="flex items-baseline gap-2">
                  <CardValue size="lg">€48.2k</CardValue>
                  <CardDelta>+6.1% last mo</CardDelta>
                </div>
              </CardHeader>
              <AreaChart data={revenue} color="var(--pds-chart-2)" height={110} yTicks={[0, 200, 400]} />
            </Card>
          </Piece>

          <Piece x={1680} y={1160}>
            <div className={cn(SLAB, "flex flex-col gap-3")}>
              <Input size="sm" placeholder="Search" leadingIcon={<Search {...icon} />} />
              <div className="flex items-center gap-2 text-[13px] text-neutral-600">
                <Kbd>⌘</Kbd>
                <Kbd>K</Kbd>
                to search
              </div>
            </div>
          </Piece>
        </Theme>
      </div>
    </SystemTheme>
  );
};

interface SpecProps {
  caption: string;
  controls?: ReactNode;
  style?: CSSProperties;
  initial: string;
  scale?: number;
  columns?: number;
  gutter?: number;
}

/** A component under Figma-style redlines, in the page's theme. */
const Spec = ({
  caption,
  controls,
  style,
  initial,
  scale,
  columns,
  gutter,
  children,
}: PropsWithChildren<SpecProps>) => {
  const { theme, mode } = useSettings();

  return (
    <Demo caption={caption} controls={controls}>
      <Redline
        initial={initial}
        scale={scale}
        columns={columns}
        gutter={gutter}
        // In dark mode the stage takes the theme's own surface, or the component sits light-on-light.
        wrapStage={(stage) => (
          <SystemTheme theme={theme} mode={mode} className={mode === "dark" ? "bg-neutral-50" : undefined} asChild>
            {stage}
          </SystemTheme>
        )}
      >
        <Theme className={fonts} style={style}>
          {children}
        </Theme>
      </Redline>
    </Demo>
  );
};

export const ButtonSpec = () => (
  <Spec caption="Hover any part of the button to measure it." initial="[data-slot=button]">
    <div className="flex items-center gap-3">
      <Button variant="secondary">Cancel</Button>
      <Button>
        Export <Download {...icon} />
      </Button>
    </div>
  </Spec>
);

export const InputSpec = () => (
  <Spec caption="A field is a label, the input and a line of help, 8px apart." initial="[data-slot=field]">
    <Field className="w-64">
      <FieldLabel>Email</FieldLabel>
      <Input size="sm" placeholder="name@company.com" leadingIcon={<Mail {...icon} />} />
      <FieldHelper>We only use it for invoices.</FieldHelper>
    </Field>
  </Spec>
);

export const SidebarSpec = () => (
  <Spec
    caption="The selected row gets a 5% wash. Projects fold open to their pages, indented to line up with the name."
    initial="[aria-current=page]"
    scale={1}
  >
    <div className="flex h-[34rem]">
      <AppSidebar className="rounded-[calc(16px*var(--radius-scale))] border border-neutral-200 bg-neutral-100" />
    </div>
  </Spec>
);

export const BottomBarSpec = () => (
  <Spec
    caption="The bar at the bottom of a page, with its main action beside it. Eyes draws it as a pill, the older products with 10px corners."
    initial="[data-slot=dock]"
    scale={1.5}
  >
    <BottomBar>
      <Dock defaultValue="overview" aria-label="Sections">
        <DockItem value="overview">
          <LayoutGrid {...icon} /> Overview
        </DockItem>
        <DockItem value="reports">
          <ChartColumn {...icon} /> Reports
        </DockItem>
      </Dock>
      <DockAction size="icon" aria-label="New invoice">
        <Plus {...icon} />
      </DockAction>
    </BottomBar>
  </Spec>
);

const RAMPS = ["neutral", "primary", "success", "warning", "error"] as const;
const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;

/** Small Figma-style label, for the token and type readouts. */
const Tag = ({ color, children }: PropsWithChildren<{ color: string }>) => (
  <span
    className="whitespace-nowrap rounded-[3px] px-1 py-px text-[10px] text-white tabular-nums leading-tight"
    style={{ backgroundColor: color }}
  >
    {children}
  </span>
);

// What each step is used for on the card, so a swatch can say where it went.
const ROLES: Record<string, string> = {
  "neutral-50": "Card",
  "neutral-100": "Page",
  "neutral-200": "Hairline",
  "neutral-600": "Secondary text",
  "neutral-950": "Text",
  "primary-500": "Action",
  "success-100": "Paid fill",
  "success-700": "Paid label",
  "warning-100": "Pending fill",
  "warning-700": "Pending label",
  "error-100": "Overdue fill",
  "error-700": "Overdue label",
};

const FADE = "background-color 0.7s, color 0.7s, border-color 0.7s";

interface PartProps {
  tokens: string[];
  active: string | null;
  onPoint: (token: string) => void;
  className?: string;
  style?: CSSProperties;
}

/** A piece of the card that names its steps, outlined when one of them is picked. */
const Part = ({ tokens, active, onPoint, className, style, children }: PropsWithChildren<PartProps>) => {
  const picked = active !== null && tokens.includes(active);

  return (
    <div
      className={cn("relative", className)}
      style={{
        outlineOffset: 2,
        ...style,
        transition: FADE,
        outline: picked ? `1px solid ${SELECTION}` : "1px solid transparent",
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        if (tokens[0]) onPoint(tokens[0]);
      }}
    >
      {children}
      {picked && (
        <span className="pointer-events-none absolute -top-2 left-0 z-10 -translate-y-full">
          <Tag color={SELECTION}>{active}</Tag>
        </span>
      )}
    </div>
  );
};

const STATUS = [
  { tone: "success", label: "Paid" },
  { tone: "warning", label: "Pending" },
  { tone: "error", label: "Overdue" },
] as const;

const step = (token: string) => `var(--pds-${token})`;

/**
 * The ramps beside a card that only names steps. Pointing at either side finds
 * the other, and dark mode slides each ramp's colours back to front under
 * steps that stay where they are.
 */
export const ColorScales = () => {
  const ref = useRef<HTMLDivElement>(null);
  const { theme, mode } = useSettings();
  const [active, setActive] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const dark = mode === "dark";

  // biome-ignore lint/correctness/useExhaustiveDependencies: the resolved values change with the theme and mode
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const style = getComputedStyle(element);
    setValues(
      Object.fromEntries(
        RAMPS.flatMap((ramp) =>
          STEPS.map((value) => [`${ramp}-${value}`, style.getPropertyValue(`--pds-${ramp}-${value}`).trim()]),
        ),
      ),
    );
  }, [theme, mode]);

  const part = { active, onPoint: setActive };

  return (
    <Demo
      caption="Point at a part of the card to find its step, or at a step to find where it's used. Dark mode moves the colours, never the names."
    >
      <Theme
        ref={ref}
        className={cn(fonts, "grid md:grid-cols-[22rem_1fr]")}
        style={{ backgroundColor: "transparent" }}
        onPointerLeave={() => setActive(null)}
      >
        <Part
          tokens={["neutral-100"]}
          {...part}
          className="flex items-center justify-center p-8 md:p-10"
          style={{ backgroundColor: step("neutral-100"), outlineOffset: -4 }}
        >
          <Part
            tokens={["neutral-50", "neutral-200"]}
            {...part}
            className="flex w-full max-w-72 flex-col gap-4 rounded-[calc(16px*var(--radius-scale))] border p-5"
            style={{ backgroundColor: step("neutral-50"), borderColor: step("neutral-200") }}
          >
            <div className="flex items-baseline justify-between gap-3">
              <Part tokens={["neutral-950"]} {...part} className="text-base" style={{ color: step("neutral-950") }}>
                October
              </Part>
              <Part tokens={["neutral-600"]} {...part} style={{ color: step("neutral-600") }}>
                3 invoices
              </Part>
            </div>
            <div className="flex flex-col">
              {invoices.map((invoice, index) => {
                const status = STATUS[index] ?? STATUS[0];

                return (
                  <div
                    key={invoice.client}
                    className="flex items-center justify-between gap-3 border-t py-2.5"
                    style={{ borderColor: step("neutral-200"), transition: FADE }}
                  >
                    <span style={{ color: step("neutral-950"), transition: FADE }}>{invoice.client}</span>
                    <Part
                      tokens={[`${status.tone}-100`, `${status.tone}-700`]}
                      {...part}
                      className="rounded-[calc(6px*var(--radius-scale))] px-1.5 py-0.5 text-[11px]"
                      style={{ backgroundColor: step(`${status.tone}-100`), color: step(`${status.tone}-700`) }}
                    >
                      {status.label}
                    </Part>
                  </div>
                );
              })}
            </div>
            <Part
              tokens={["primary-500"]}
              {...part}
              className="flex h-[33px] items-center justify-center rounded-[calc(12px*var(--radius-scale))] font-medium"
              style={{ backgroundColor: step("primary-500"), color: "#fff" }}
            >
              Send reminders
            </Part>
          </Part>
        </Part>

        <div className="flex flex-col gap-4 overflow-x-auto bg-white p-6 md:p-8">
          <div className="grid min-w-[30rem] grid-cols-[4.5rem_1fr] gap-x-3">
            <span />
            <div className="grid grid-cols-11 gap-1">
              {STEPS.map((value) => (
                <span key={value} className="text-center text-[#7f827d] text-[11px] tabular-nums">
                  {value}
                </span>
              ))}
            </div>
          </div>
          {RAMPS.map((ramp) => (
            <div key={ramp} className="grid min-w-[30rem] grid-cols-[4.5rem_1fr] items-center gap-x-3">
              <span className="text-[#181818] text-xs capitalize">{ramp}</span>
              <div className="grid grid-cols-11 gap-1">
                {STEPS.map((value, index) => {
                  const token = `${ramp}-${value}`;
                  const picked = active === token;

                  return (
                    <div key={value} className="relative flex flex-col items-center gap-1.5" onPointerOver={() => setActive(token)}>
                      <span
                        className="relative z-[1] block h-9 w-full rounded-[calc(6px*var(--radius-scale))] shadow-[inset_0_0_0_1px_rgb(0_0_0/0.06)]"
                        style={{
                          // The raw ramp, so the colour itself travels when the mode flips.
                          backgroundColor: `var(--pds-${ramp[0]}-${value})`,
                          transform: dark ? `translateX(calc(${10 - 2 * index} * (100% + 4px)))` : "none",
                          transition: "transform 0.7s cubic-bezier(0.65, 0, 0.35, 1)",
                          transitionDelay: `${index * 15}ms`,
                        }}
                      />
                      <span
                        className="pointer-events-none absolute -top-[3px] -right-[3px] -left-[3px] z-[2] h-[calc(2.25rem+6px)] rounded-[calc(8px*var(--radius-scale))] border transition-opacity"
                        style={{ borderColor: SELECTION, opacity: picked ? 1 : 0 }}
                      />
                      <span
                        className="size-1 rounded-full transition-colors"
                        style={{ backgroundColor: ROLES[token] ? (picked ? SELECTION : "#b2b4b1") : "transparent" }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          <div className="flex min-h-5 min-w-[30rem] items-center gap-2 pl-[5.25rem] text-[#656864] text-xs">
            {active ? (
              <>
                <Tag color={SELECTION}>{active}</Tag>
                <span className="text-[#181818] uppercase tabular-nums">{values[active]?.replace("#", "")}</span>
                {ROLES[active] && <span>{ROLES[active]}</span>}
              </>
            ) : (
              "A dot marks a step the card uses."
            )}
          </div>
        </div>
      </Theme>
    </Demo>
  );
};

const TYPE_SCALE = [
  ["4xl", 39, 48.75, "€24,180"],
  ["3xl", 31, 38.75, "Good morning"],
  ["2xl", 24, 30, "October invoices"],
  ["xl", 20, 25, "Overdue this month"],
  ["lg", 18, 22.5, "Harbour & Co"],
  ["base", 16, 20, "Send a reminder"],
  ["sm", 14, 17.5, "Due in 14 days"],
  ["xs", 13, 16.25, "We only use it for invoices."],
  ["xxs", 11, 13.75, "Updated 2 minutes ago"],
] as const;

type TypeStep = (typeof TYPE_SCALE)[number];

// The size the glyphs are drawn at; the guides are read back at the picked size.
const GLYPH = 104;

interface Anatomy {
  baseline: number;
  cap: number;
  x: number;
  descender: number;
}

const weightOptions: { value: number; label: string }[] = [
  { value: 400, label: "Regular" },
  { value: 500, label: "Medium" },
];

/** Geist blown up under its guides, measured in pixels at the size being pointed at. */
const Glyphs = ({ type, weight }: { type: TypeStep; weight: number }) => {
  const ref = useRef<HTMLDivElement>(null);
  const baselineRef = useRef<HTMLSpanElement>(null);
  const [anatomy, setAnatomy] = useState<Anatomy | null>(null);
  const [name, size, leading] = type;
  const ratio = size / GLYPH;

  useEffect(() => {
    const element = ref.current;
    const baseline = baselineRef.current;
    if (!element || !baseline) return;

    let live = true;

    document.fonts.ready.then(() => {
      const context = document.createElement("canvas").getContext("2d");
      if (!live || !context) return;

      context.font = `${weight} ${GLYPH}px ${getComputedStyle(element).fontFamily}`;
      setAnatomy({
        baseline: baseline.offsetTop,
        cap: context.measureText("H").actualBoundingBoxAscent,
        x: context.measureText("x").actualBoundingBoxAscent,
        descender: context.measureText("g").actualBoundingBoxDescent,
      });
    });

    return () => {
      live = false;
    };
  }, [weight]);

  const guides = anatomy
    ? [
        { label: "Cap", y: anatomy.baseline - anatomy.cap, value: anatomy.cap },
        { label: "x-height", y: anatomy.baseline - anatomy.x, value: anatomy.x },
        { label: "Baseline", y: anatomy.baseline, value: 0 },
        { label: "Descender", y: anatomy.baseline + anatomy.descender, value: anatomy.descender },
      ]
    : [];

  return (
    <div className="flex flex-col gap-5 p-6 md:p-8">
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-[#181818]">Geist</span>
        <span className="text-[#7f827d] tabular-nums">
          {name} · {size} / {leading}
        </span>
      </div>
      <div
        ref={ref}
        className="relative select-none whitespace-nowrap text-[#181818]"
        style={{ fontSize: GLYPH, lineHeight: 1.25, fontWeight: weight }}
      >
        <span
          className="pointer-events-none absolute inset-x-0 top-0 border border-dashed"
          style={{ height: GLYPH * 1.25, borderColor: `${SELECTION}66`, backgroundColor: `${SELECTION}0a` }}
        />
        Hxg
        <span ref={baselineRef} className="inline-block h-0 w-0 align-baseline" />
        {guides.map((guide) => (
          <span
            key={guide.label}
            className="pointer-events-none absolute inset-x-0 flex h-0 items-center justify-end"
            style={{ top: guide.y, borderTop: `1px solid ${REDLINE}99` }}
          >
            <span className="flex items-center gap-1 text-[10px] leading-none tracking-normal">
              <span style={{ color: REDLINE }}>{guide.label}</span>
              {guide.value > 0 && <Tag color={REDLINE}>{Math.round(guide.value * ratio * 10) / 10}</Tag>}
            </span>
          </span>
        ))}
      </div>
      <div className="flex justify-between text-[#7f827d] text-[11px] tabular-nums">
        <span>Line {leading}</span>
        <span>Tracking 0.32</span>
        <span>{weight === 400 ? "Regular" : "Medium"}</span>
      </div>
    </div>
  );
};

/**
 * The type ramp set in the products' own words, beside Geist under its guides.
 * The row being pointed at shows its line box.
 */
export const TypeScale = () => {
  const [picked, setPicked] = useState<string>("xs");
  const [weight, setWeight] = useState(400);
  const type = TYPE_SCALE.find(([name]) => name === picked) ?? TYPE_SCALE[7];

  return (
    <Demo
      caption="Line height is always 1.25 and letter-spacing 0.32px. Point at a size to see its line box, and the guides measure at that size."
      controls={<Choice label="Weight" value={weight} options={weightOptions} onChange={setWeight} />}
    >
      <Theme className={cn(fonts, "grid bg-white md:grid-cols-[20rem_1fr]")}>
        <div className="border-[#eaebea] border-b md:border-r md:border-b-0">
          <Glyphs type={type} weight={weight} />
        </div>
        <div className="flex flex-col overflow-x-auto px-6 py-4 md:px-8">
          {TYPE_SCALE.map(([name, size, leading, sample]) => {
            const active = name === picked;

            return (
              <div
                key={name}
                className="grid min-w-[26rem] cursor-default grid-cols-[3.5rem_1fr_auto] items-center gap-4 py-2"
                onPointerEnter={() => setPicked(name)}
              >
                <span className={cn("text-xs tabular-nums", active ? "text-[#181818]" : "text-[#989b97]")}>{name}</span>
                <span
                  className="truncate text-[#181818] transition-[background-color,box-shadow] duration-200"
                  style={{
                    fontSize: size,
                    lineHeight: `${leading}px`,
                    fontWeight: weight,
                    backgroundColor: active ? `${REDLINE}14` : "transparent",
                    boxShadow: active ? `inset 0 1px 0 ${REDLINE}, inset 0 -1px 0 ${REDLINE}` : "none",
                  }}
                >
                  {sample}
                </span>
                <span className={cn("w-16 text-right transition-opacity", active ? "opacity-100" : "opacity-0")}>
                  <Tag color={REDLINE}>
                    {size}/{leading}
                  </Tag>
                </span>
              </div>
            );
          })}
        </div>
      </Theme>
    </Demo>
  );
};

export const SegmentSpec = () => (
  <Spec caption="A 2px inset, so the segment's radius sits 2px inside the track's." initial="[data-slot=segmented-control]">
    <SegmentedControl defaultValue="all" aria-label="Status">
      <SegmentedControlItem value="all">All</SegmentedControlItem>
      <SegmentedControlItem value="paid">Paid</SegmentedControlItem>
      <SegmentedControlItem value="open">Open</SegmentedControlItem>
    </SegmentedControl>
  </Spec>
);

export const StatCardSpec = () => (
  <Spec caption="Cards share the page colour. Only the hairline sets them apart." initial="[data-slot=stat-card]">
    <StatCard className="w-52" label="Paid on time" value="81%" delta="+4%" trend="up" />
  </Spec>
);

export const LayoutSpec = () => (
  <Spec
    caption="A form section on a twelve-column grid: the heading spans half, the fields six columns each."
    initial="[data-specimen-frame]"
    scale={1}
    columns={12}
    gutter={16}
  >
    <div data-specimen-frame className="flex w-[40rem] flex-col gap-6">
      <div className="flex w-1/2 flex-col gap-1.5">
        <StatTitle>Profile</StatTitle>
        <span className="text-neutral-600 text-xs">The details clients see on your invoices.</span>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field>
          <FieldLabel>Company</FieldLabel>
          <Input placeholder="Northwind" />
        </Field>
        <Field>
          <FieldLabel>VAT number</FieldLabel>
          <Input placeholder="NL000000000B01" />
          <FieldHelper>You can't change this later.</FieldHelper>
        </Field>
      </div>
    </div>
  </Spec>
);

/** The same screen in the chosen theme, with the themes to pick from in place of a caption. */
export const ThemePlayground = () => (
  <Demo
    frameClassName="rounded-2xl"
    caption={
      <span className="inline-flex items-center gap-3 rounded-full border border-neutral-950/10 bg-neutral-50 py-1.5 pr-2 pl-4">
        <span className="text-neutral-950/60 text-xs">Demo</span>
        <ThemeDots className="gap-2" size="size-5" />
      </span>
    }
  >
    <Fitted />
  </Demo>
);
