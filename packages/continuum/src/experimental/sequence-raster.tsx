'use client';

import { Copy, EllipsisVertical, Pencil, Plus, Rocket, Search, Trash2 } from 'lucide-react';
import { Fragment, useMemo, useState } from 'react';
import { focusRing } from '../components/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '../components/dropdown-menu';
import { cn } from '../lib/cn';
import { allocateColumns, type ColumnSpec, type RasterParams } from './engine';
import {
    Area,
    Band,
    Mark,
    Panel,
    RasterButton,
    RasterInput,
    RasterViewport,
    Row,
    Rule,
    ShowMore,
    Text,
    useOuterRaster,
    useRaster,
    useShowMore,
} from './raster';

export type Density = 'figma' | 'lots';

type Email = {
    id: number;
    name: string;
    delay?: string;
    sent?: number;
    open?: string;
    click?: string;
    bounces?: number;
    unsubscribes?: number;
};
type Phase = { id: string; title: string; interval?: string; emails: Email[] };
type Project = { label: string; pages?: string[] };

export const figmaPhases: Phase[] = [
    { id: 'unassigned', title: 'Unassigned', emails: [{ id: 1, name: 'New email' }] },
    {
        id: 'phase-1',
        title: 'Phase 1',
        interval: '72h interval',
        emails: [
            { id: 2, name: 'Welcome email' },
            { id: 3, name: 'Getting started guide', delay: '+72h' },
            { id: 4, name: 'Tips & tricks', delay: '+72h' },
        ],
    },
    {
        id: 'phase-2',
        title: 'Phase 2',
        interval: '4w interval',
        emails: [
            { id: 5, name: 'Case study', delay: '+4w' },
            { id: 6, name: 'Feedback request', delay: '+4w' },
        ],
    },
];

const figmaProjects: Project[] = [
    {
        label: 'Q1 growth campaign',
        pages: ['Campaigns', 'Automations', 'Analytics', 'Permissions'],
    },
    { label: 'Mobile app launch' },
    { label: 'Customer retention program' },
    { label: 'Brand refresh initiative' },
];

const SUBJECTS = [
    'Welcome',
    'Onboarding',
    'Feature',
    'Webinar',
    'Case study',
    'Renewal',
    'Survey',
    'Upgrade',
    'Digest',
    'Reminder',
];
const TOPICS = [
    'guide',
    'tips',
    'invite',
    'recap',
    'offer',
    'update',
    'check-in',
    'story',
    'follow-up',
    'teaser',
];
const PLACES = ['Nordic', 'Benelux', 'DACH', 'Iberia', 'Baltic', 'Alpine', 'Atlantic', 'Adriatic'];
const KINDS = [
    'launch',
    'retention',
    'win-back',
    'pilot',
    'referral',
    'loyalty',
    'beta',
    'webinar series',
    'partner push',
    'seasonal sale',
    'trial nurture',
    'event follow-up',
    'pricing test',
    'product tour',
    'newsletter',
];

// Deterministic, so a reload shows the same long lists.
const pick = <T,>(list: T[], seed: number) => list[seed % list.length] as T;

export const lotsOfPhases = (): Phase[] =>
    Array.from({ length: 6 }, (_, phaseIndex) => ({
        id: `phase-${phaseIndex + 1}`,
        title: `Phase ${phaseIndex + 1}`,
        interval: pick(
            ['24h interval', '72h interval', '1w interval', '2w interval', '4w interval'],
            phaseIndex,
        ),
        emails: Array.from({ length: 24 + ((phaseIndex * 7) % 15) }, (_, index) => {
            const seed = phaseIndex * 97 + index * 13;
            return {
                id: phaseIndex * 1000 + index,
                name: `${pick(SUBJECTS, seed)} ${pick(TOPICS, seed >> 2)}`,
                delay: index === 0 ? undefined : pick(['+24h', '+72h', '+1w', '+2w'], phaseIndex),
                sent: 4000 - ((seed * 31) % 3200),
                open: `${(28 + ((seed * 7) % 400) / 10).toFixed(1)}%`,
                click: `${(2 + ((seed * 3) % 90) / 10).toFixed(1)}%`,
                bounces: (seed * 11) % 60,
                unsubscribes: (seed * 5) % 24,
            };
        }),
    }));

// Every place with every kind, once: each project is listed, and keyed, by its name
export const lotsOfProjects = (): Project[] =>
    PLACES.flatMap(place => KINDS.map(kind => `${place} ${kind}`))
        .map((label, index) => ({
            label,
            pages: index === 0 ? ['Campaigns', 'Automations', 'Analytics', 'Permissions'] : undefined,
        }))
        .sort((a, b) => a.label.localeCompare(b.label));

/** Long lists open on a first step and reveal the rest on request. */
export const PROJECT_STEP = 12;
export const EMAIL_STEP = 10;

// A sticky band's colour carried out over the page's margins, so the row
// numbers hanging there pass under it like the rest of the row
const bleed =
    'before:pointer-events-none before:absolute before:inset-y-0 before:-inset-x-[calc(var(--rx-line)*2)] before:-z-10 before:bg-neutral-50';

const navigation = ['All sequences', 'Active campaigns', 'Drafts', 'Templates'];
const sections = ['Eligibility', 'Audience', 'Settings'];

// Each phase takes the next data colour, so a long sequence stays legible as it scrolls.
const phaseColors = [
    'var(--pds-chart-1)',
    'var(--pds-chart-5)',
    'var(--pds-chart-2)',
    'var(--pds-chart-3)',
    'var(--pds-chart-4)',
];

type Column =
    | 'delay'
    | 'name'
    | 'template'
    | 'sent'
    | 'open'
    | 'click'
    | 'bounces'
    | 'unsubscribes';

export const figmaColumns: ColumnSpec<Column>[] = [
    { key: 'delay', label: 'Delay', span: 1, priority: 5 },
    { key: 'name', label: 'Email', span: 2, priority: 10, flexible: true },
    { key: 'template', label: 'Template', span: 2, priority: 3 },
    { key: 'click', label: 'Click rate', span: 1, priority: 7 },
    { key: 'open', label: 'Open rate', span: 1, priority: 8 },
];

export const lotsColumns: ColumnSpec<Column>[] = [
    ...figmaColumns.slice(0, 3),
    { key: 'sent', label: 'Sent', span: 1, priority: 6 },
    ...figmaColumns.slice(3),
    { key: 'bounces', label: 'Bounces', span: 1, priority: 2 },
    { key: 'unsubscribes', label: 'Unsubscribed', span: 1, priority: 1 },
];

const numeric = new Set<Column>(['sent', 'open', 'click', 'bounces', 'unsubscribes']);

const cellValue = (email: Email, column: Column) => {
    switch (column) {
        case 'delay':
            return email.delay ?? '—';
        case 'name':
            return email.name;
        case 'template':
            return 'Template';
        case 'sent':
            return email.sent?.toLocaleString('en-GB') ?? '—';
        case 'open':
            return email.open ?? 'N/A';
        case 'click':
            return email.click ?? 'N/A';
        case 'bounces':
            return email.bounces ?? '—';
        case 'unsubscribes':
            return email.unsubscribes ?? '—';
    }
};

/** A plain text action: no fill, no border, only colour on hover. */
const textAction = cn(
    'cursor-pointer select-none text-left transition-colors duration-150',
    focusRing,
);

/**
 * The navigation on the page's own colour, in its own columns of the viewport
 * grid. It scrolls on its own, so a long project list never moves the page.
 */
const Navigation = ({ projects }: { projects: Project[] }) => {
    const outer = useOuterRaster();
    const [filter, setFilter] = useState('');
    const row = outer.line + 8;
    const shown = projects.filter(project =>
        project.label.toLowerCase().includes(filter.trim().toLowerCase()),
    );
    // A long list opens on its first dozen; the filter still searches every project.
    const more = useShowMore(shown.length, PROJECT_STEP, filter);

    return (
        <nav
            aria-label="Sequences"
            className="flex h-full flex-col overflow-y-auto text-neutral-950 [scrollbar-width:none]"
            style={{ lineHeight: `${outer.line}px` }}
        >
            <div className="flex flex-col" style={{ paddingTop: outer.line * 2 }}>
                <Row height={outer.line * 2}>
                    <Text className="font-medium">Northwind</Text>
                </Row>
            </div>

            <div className="flex flex-col" style={{ marginTop: outer.line * 4 }}>
                <RasterButton className="w-full justify-start" variant="secondary">
                    <Plus strokeWidth={1.5} />
                    New sequence
                </RasterButton>
                <div style={{ height: outer.line }} />
                {navigation.map(label => {
                    const active = label === 'Active campaigns';
                    return (
                        <Row height={row} key={label}>
                            <button
                                aria-current={active ? 'page' : undefined}
                                className={cn(
                                    textAction,
                                    'relative',
                                    active
                                        ? 'text-neutral-950'
                                        : 'text-neutral-600 hover:text-neutral-950',
                                )}
                                type="button"
                            >
                                {/* The marker hangs in the margin, so the labels keep one edge. */}
                                {active && (
                                    <Mark className="absolute top-0.5 -left-3.5 bg-action" />
                                )}
                                <Text>{label}</Text>
                            </button>
                        </Row>
                    );
                })}
            </div>

            {/* The project list keeps its label and filter in view while it scrolls past */}
            <div
                className="sticky top-0 z-10 flex flex-col bg-neutral-50"
                style={{ marginTop: outer.line * 2 }}
            >
                <Row className="justify-between gap-2" height={row}>
                    <Text className="text-neutral-500">Projects</Text>
                    <Text className="text-neutral-500 tabular-nums">{projects.length}</Text>
                </Row>
                {projects.length > 8 && (
                    <div style={{ paddingBottom: 8 }}>
                        <RasterInput
                            aria-label="Filter projects"
                            leadingIcon={<Search strokeWidth={1.5} />}
                            onChange={event => setFilter(event.target.value)}
                            placeholder="Filter projects…"
                            value={filter}
                        />
                    </div>
                )}
            </div>

            <div className="flex flex-col">
                {shown.slice(0, more.shown).map(project => (
                    <Fragment key={project.label}>
                        <Row height={row}>
                            <button
                                className={cn(
                                    textAction,
                                    'min-w-0',
                                    project.pages
                                        ? 'text-neutral-950'
                                        : 'text-neutral-600 hover:text-neutral-950',
                                )}
                                type="button"
                            >
                                <Text className="truncate">{project.label}</Text>
                            </button>
                        </Row>
                        {project.pages?.map(page => (
                            <Row height={row} key={page} style={{ paddingLeft: outer.line }}>
                                <button
                                    className={cn(
                                        textAction,
                                        'text-neutral-600 hover:text-neutral-950',
                                    )}
                                    type="button"
                                >
                                    <Text>{page}</Text>
                                </button>
                            </Row>
                        ))}
                    </Fragment>
                ))}
                {shown.length === 0 && (
                    <Row height={row}>
                        <Text className="text-neutral-400">No projects</Text>
                    </Row>
                )}
                <ShowMore
                    onAll={more.all}
                    onMore={more.more}
                    remaining={more.remaining}
                    step={PROJECT_STEP}
                />
            </div>

            <div
                className="mt-auto flex flex-col"
                style={{ paddingTop: outer.line * 4, paddingBottom: outer.line * 2 }}
            >
                <Text>Northwind Agency</Text>
                <Text className="mt-1 text-neutral-500">Startup</Text>
            </div>
        </nav>
    );
};

const EmailActions = ({ name, onDelete }: { name: string; onDelete: () => void }) => (
    <DropdownMenu>
        <DropdownMenuTrigger asChild>
            <RasterButton
                aria-label={`Actions for ${name}`}
                className="opacity-0 focus-visible:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100"
                size="icon-sm"
                variant="ghost"
            >
                <EllipsisVertical strokeWidth={1.5} />
            </RasterButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
            <DropdownMenuItem>
                <Pencil strokeWidth={1.5} />
                Edit email
            </DropdownMenuItem>
            <DropdownMenuItem>
                <Copy strokeWidth={1.5} />
                Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onDelete} variant="danger">
                <Trash2 strokeWidth={1.5} />
                Delete
            </DropdownMenuItem>
        </DropdownMenuContent>
    </DropdownMenu>
);

type PlacedColumn = ReturnType<typeof allocateColumns<Column>>[number];

const place = (within: [number, number]) => ({
    gridColumn: `${within[0]} / span ${within[1]}`,
});

/**
 * A phase's rows in the content's columns. A long phase opens on its first
 * ten and reveals the rest under its last row; the numerals keep counting.
 */
const PhaseEmails = ({
    phase,
    color,
    columns,
    onRemove,
}: {
    phase: Phase;
    color: string | undefined;
    columns: PlacedColumn[];
    onRemove: (id: number) => void;
}) => {
    const { raster } = useRaster();
    const row = raster.line * 2;
    const more = useShowMore(phase.emails.length, EMAIL_STEP);

    return (
        <Area area="main" className="grid grid-cols-subgrid">
            {phase.emails.slice(0, more.shown).map((email, index) => (
                <div
                    className="group relative col-span-full grid grid-cols-subgrid hover:bg-neutral-950/[0.03]"
                    key={email.id}
                >
                    {/* The number hangs in the gutter before the content's edge */}
                    {phase.interval && (
                        <Row
                            className="absolute justify-end"
                            height={row}
                            style={{
                                right: '100%',
                                width: raster.gutter * 3,
                                paddingRight: raster.gutter / 2,
                                color,
                            }}
                        >
                            <Text className="tabular-nums">{index + 1}</Text>
                        </Row>
                    )}
                    {columns.map(column => (
                        <Row
                            className={cn(numeric.has(column.key) && 'justify-end')}
                            height={row}
                            key={column.key}
                            style={place(column.within)}
                        >
                            <Text
                                className={cn(
                                    'truncate',
                                    column.key === 'name' ? 'text-neutral-950' : 'text-neutral-600',
                                    numeric.has(column.key) && 'tabular-nums',
                                )}
                            >
                                {cellValue(email, column.key)}
                            </Text>
                        </Row>
                    ))}
                    <div className="absolute top-1 -right-9">
                        <EmailActions name={email.name} onDelete={() => onRemove(email.id)} />
                    </div>
                </div>
            ))}
            {phase.emails.length === 0 && (
                <Row className="col-span-full" height={row}>
                    <Text className="text-neutral-500">No emails yet</Text>
                </Row>
            )}
            <ShowMore
                className="col-span-full"
                onAll={more.all}
                onMore={more.more}
                remaining={more.remaining}
                step={EMAIL_STEP}
            />
        </Area>
    );
};

const SequenceTable = ({
    phases,
    specs,
    onAddPhase,
    onRemove,
}: {
    phases: Phase[];
    specs: ColumnSpec<Column>[];
    onAddPhase: () => void;
    onRemove: (id: number) => void;
}) => {
    const { raster, content } = useRaster();
    const columns = allocateColumns(content.main[1], specs);
    const row = raster.line * 2;
    const hanging = Boolean(content.head);

    return (
        <>
            {/* The column names stay in view over a long table, on the page's own colour */}
            <Band className={cn('sticky top-0 z-20 bg-neutral-50', bleed)}>
                {/* Its hairline is an inset line on its last pixel, so it travels with the band */}
                <Area
                    area="main"
                    className="grid grid-cols-subgrid shadow-[inset_0_-1px_0_var(--pds-neutral-200)]"
                >
                    {columns.map(column => (
                        <Row
                            className={cn(numeric.has(column.key) && 'justify-end')}
                            height={row}
                            key={column.key}
                            style={place(column.within)}
                        >
                            <Text className="truncate text-neutral-500">{column.label}</Text>
                        </Row>
                    ))}
                </Area>
            </Band>

            {phases.map((phase, phaseIndex) => {
                const color = phase.interval
                    ? phaseColors[(phaseIndex - 1 + phaseColors.length) % phaseColors.length]
                    : 'var(--pds-neutral-300)';

                return (
                    <Fragment key={phase.id}>
                        {/* Phases part on a rule, then a blank line */}
                        {phaseIndex > 0 && <Rule />}
                        <Band style={{ marginTop: raster.line }}>
                            {/* The phase hangs beside its rows and stays there while they scroll past */}
                            <Area
                                area="head"
                                className={cn('flex flex-col self-start', hanging && 'sticky z-10')}
                                style={hanging ? { top: row } : undefined}
                            >
                                <Row className="gap-2" height={row}>
                                    <Mark className="mt-0.5" style={{ backgroundColor: color }} />
                                    <Text className="text-neutral-950">{phase.title}</Text>
                                </Row>
                                {hanging && (
                                    <Row height={row} style={{ paddingLeft: 16 }}>
                                        <Text className="text-neutral-500">
                                            {phase.interval ?? 'No interval'}
                                            {phase.emails.length > 8 &&
                                                ` · ${phase.emails.length} emails`}
                                        </Text>
                                    </Row>
                                )}
                            </Area>
                            <PhaseEmails
                                color={color}
                                columns={columns}
                                onRemove={onRemove}
                                phase={phase}
                            />
                        </Band>
                    </Fragment>
                );
            })}

            <Band style={{ marginTop: raster.line }}>
                <Area area="main">
                    {/* Hung by its own padding, so the icon starts on the column edge */}
                    <RasterButton className="-ml-3" onClick={onAddPhase} variant="ghost">
                        <Plus strokeWidth={1.5} />
                        Add phase
                    </RasterButton>
                </Area>
            </Band>
        </>
    );
};

const SequencePage = ({
    phases,
    specs,
    section,
    onAddEmail,
    onAddPhase,
    onRemove,
    onSection,
}: {
    phases: Phase[];
    specs: ColumnSpec<Column>[];
    section?: string;
    onAddEmail: () => void;
    onAddPhase: () => void;
    onRemove: (id: number) => void;
    onSection: (section: string) => void;
}) => {
    const { raster, content } = useRaster();
    const line = raster.line;
    const descriptionSpan = Math.min(
        content.main[1],
        Math.max(4, Math.round((content.main[1] * 2) / 3)),
    );
    const emails = phases.reduce((sum, phase) => sum + phase.emails.length, 0);

    return (
        <>
            <Band>
                <Area area="head">
                    <Row height={line * 2}>
                        <Text className="text-neutral-500">Email campaigns</Text>
                    </Row>
                </Area>
                <Area area="main">
                    <Row height={line * 2}>
                        <Text className="text-neutral-950">Q1 growth campaign</Text>
                    </Row>
                </Area>
            </Band>

            <Rule style={{ marginTop: line }} />

            <Band style={{ marginTop: line * 3 }}>
                <Panel area="head" className="self-start">
                    <dl className="flex flex-col" style={{ gap: line }}>
                        <div>
                            <Text as="dt" className="text-neutral-500">
                                Status
                            </Text>
                            <dd className="mt-1 flex items-start gap-2">
                                <Mark className="mt-0.5 bg-warning-500" />
                                <Text className="text-neutral-950">Inactive</Text>
                            </dd>
                        </div>
                        <div>
                            <Text as="dt" className="text-neutral-500">
                                Markets
                            </Text>
                            <Text as="dd" className="mt-1 text-neutral-950">
                                NL, DE, BE
                            </Text>
                        </div>
                        <div>
                            <Text as="dt" className="text-neutral-500">
                                Emails
                            </Text>
                            <Text as="dd" className="mt-1 text-neutral-950 tabular-nums">
                                {emails} in {phases.length} phases
                            </Text>
                        </div>
                    </dl>
                </Panel>
                <Area area="main">
                    <Text
                        as="h1"
                        className="font-medium text-[31px] text-neutral-950 leading-[calc(var(--rx-line)*2)] tracking-[-0.01em]"
                    >
                        Q1 growth campaign
                    </Text>
                </Area>
            </Band>

            <Rule style={{ marginTop: line * 2 }} />

            <Band style={{ marginTop: line * 2 }}>
                <Area area="head">
                    <Text as="h2" className="font-medium text-neutral-950">
                        Email sequencing
                    </Text>
                </Area>
                <Area area="main" within={[1, descriptionSpan]}>
                    <Text as="p" className="text-neutral-600">
                        Build the sequence by adding emails and grouping them into phases. Emails in
                        a phase go out in order at the set interval.
                    </Text>
                </Area>
            </Band>

            <Band style={{ marginTop: line * 2 }}>
                <Area area="main">
                    <RasterButton onClick={onAddEmail} variant="secondary">
                        <Plus strokeWidth={1.5} />
                        Add email
                    </RasterButton>
                </Area>
            </Band>

            <div className="col-span-full grid grid-cols-subgrid" style={{ marginTop: line * 2 }}>
                <SequenceTable
                    onAddPhase={onAddPhase}
                    onRemove={onRemove}
                    phases={phases}
                    specs={specs}
                />
            </div>

            {/* The page's sections and its one action, on the content's columns */}
            <Band
                className={cn(
                    'sticky bottom-0 z-20 bg-neutral-50',
                    bleed,
                    'before:shadow-[inset_0_1px_0_var(--pds-neutral-200)]',
                )}
                style={{ marginTop: line * 4, paddingBlock: line }}
            >
                {/* On a narrow page the action wraps below the sections, a line apart */}
                <Area
                    area="all"
                    className="flex flex-wrap items-center justify-between gap-x-6"
                    style={{ rowGap: line }}
                >
                    <div className="flex gap-6">
                        {sections.map(name => (
                            <button
                                aria-pressed={section === name}
                                className={cn(
                                    textAction,
                                    'flex items-start gap-2',
                                    section === name
                                        ? 'text-neutral-950'
                                        : 'text-neutral-500 hover:text-neutral-950',
                                )}
                                key={name}
                                onClick={() => onSection(name)}
                                type="button"
                            >
                                {section === name && <Mark className="mt-0.5 bg-action" />}
                                <Text>{name}</Text>
                            </button>
                        ))}
                    </div>
                    <RasterButton>
                        Start campaign
                        <Rocket strokeWidth={1.5} />
                    </RasterButton>
                </Area>
            </Band>
        </>
    );
};

type SequenceRasterProps = {
    params: RasterParams;
    containerMax: number;
    height: number;
    density: Density;
    overlay: boolean;
};

/**
 * The email sequence editor on a raster. The grid separates navigation from
 * page, labels from content and row from row; a few hairlines mark the section
 * edges and one panel holds the campaign's facts. Colour only marks state and data.
 */
export const SequenceRaster = ({
    params,
    containerMax,
    height,
    density,
    overlay,
}: SequenceRasterProps) => {
    const seeded = useMemo(() => (density === 'lots' ? lotsOfPhases() : figmaPhases), [density]);
    const projects = useMemo(
        () => (density === 'lots' ? lotsOfProjects() : figmaProjects),
        [density],
    );
    const [edits, setEdits] = useState<{ density: Density; phases: Phase[] }>();
    const phases = edits?.density === density ? edits.phases : seeded;
    const setPhases = (update: (current: Phase[]) => Phase[]) =>
        setEdits({ density, phases: update(phases) });
    const [section, setSection] = useState<string>();

    const nextId = () => Math.max(0, ...phases.flatMap(p => p.emails.map(e => e.id))) + 1;

    return (
        <RasterViewport
            containerMax={containerMax}
            height={height}
            nav={<Navigation projects={projects} />}
            overlay={overlay}
            params={params}
        >
            <SequencePage
                onAddEmail={() =>
                    setPhases(current =>
                        current.map((phase, index) =>
                            index === 0
                                ? {
                                      ...phase,
                                      emails: [
                                          ...phase.emails,
                                          { id: nextId(), name: 'New email' },
                                      ],
                                  }
                                : phase,
                        ),
                    )
                }
                onAddPhase={() =>
                    setPhases(current => [
                        ...current,
                        {
                            id: `phase-${current.length + 1}`,
                            title: `Phase ${current.length}`,
                            interval: '1w interval',
                            emails: [],
                        },
                    ])
                }
                onRemove={id =>
                    setPhases(current =>
                        current.map(phase => ({
                            ...phase,
                            emails: phase.emails.filter(e => e.id !== id),
                        })),
                    )
                }
                onSection={setSection}
                phases={phases}
                section={section}
                specs={density === 'lots' ? lotsColumns : figmaColumns}
            />
        </RasterViewport>
    );
};
