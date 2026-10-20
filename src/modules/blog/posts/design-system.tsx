import { GitHubCard } from "~/modules/blog/components/prose";
import {
  BottomBarSpec,
  ButtonSpec,
  ColorScales,
  DemoSettings,
  InputSpec,
  LayoutSpec,
  SegmentSpec,
  SidebarSpec,
  StatCardSpec,
  ThemePlayground,
  TypeScale,
} from "~/modules/blog/demos/design-system-demos";

const DesignSystem = () => (
  <>
    <DemoSettings />
    <p>
      Over the years, I've developed my own set of design rules, components and tokens that I reuse
      across projects. It started with individual decisions made while designing interfaces and
      gradually grew into a system I could rely on.
    </p>
    <p>
      I recently brought it all together in code, building the components with Radix and Tailwind
      and adding themes for different products. The interactive demo below lets you explore the
      system, from colour scales and typography to individual components and layout rules.
    </p>

    <h2>Colour</h2>
    <p>
      The colour system follows a familiar approach, similar to Tailwind's numbered palettes. It
      includes a neutral scale, a primary colour scale, and separate scales for success, warning and
      error states.
    </p>
    <p>
      Components reference these steps through design tokens. A surface might use neutral-50, a
      border neutral-200, and secondary text neutral-600. Each product maps those tokens to its own
      palette, so the same components can be used with different colour schemes.
    </p>
    <ColorScales />
    <p>
      Dark mode uses the same tokens with a different colour mapping, keeping the component styles
      consistent across both modes.
    </p>

    <h2>Typography</h2>
    <p>
      The typography system uses a fixed scale of sizes, a line height of 1.25 and two font weights.
      Letter spacing stays consistent, while the typeface can vary between projects.
    </p>
    <p>
      The older products use Inter, while the analytics dashboard uses Geist. Keeping the scale
      consistent makes it easier to maintain hierarchy across different interfaces.
    </p>
    <TypeScale />

    <h2>Buttons</h2>
    <p>
      Buttons share the same label styling, with size variations handled through padding and
      height. Icons use a consistent 16px size and sit 6px from the label.
    </p>
    <p>
      Each variant defines its own dimensions, border, radius and text colour. These rules keep
      buttons consistent wherever they're used.
    </p>
    <ButtonSpec />

    <h2>Inputs</h2>
    <p>
      Fields follow a shared structure: a label, an input and optional supporting text. The spacing
      between these elements stays consistent, and the border changes to reflect hover and error
      states.
    </p>
    <p>
      Keeping the label, field and help text together also makes the component easy to reuse across
      forms.
    </p>
    <InputSpec />

    <h2>Sidebar</h2>
    <p>
      The sidebar sits directly on the page canvas, with a subtle fill to indicate the selected
      item. Projects can expand to reveal their pages, with indentation showing the hierarchy.
    </p>
    <p>
      The component handles the navigation structure and selected state, while the content can
      change between projects.
    </p>
    <SidebarSpec />

    <h2>Bottom bar</h2>
    <p>
      Several of my interfaces use a floating bar at the bottom of the page, with page sections on
      one side and the main action on the other.
    </p>
    <p>
      The component defines the layout, spacing, border and shadow. Its appearance can vary by
      theme, including the corner radius and treatment of the active item.
    </p>
    <BottomBarSpec />

    <h2>Corners that nest</h2>
    <p>
      The radius scale defines how rounded different elements should be, from larger cards to
      smaller controls and chips. Nested elements use smaller radii so their corners sit neatly
      within their containers.
    </p>
    <p>
      For example, a segmented control has a 2px inset, with the selected segment's corners
      following the shape of the outer track.
    </p>
    <SegmentSpec />
    <p>
      Cards share the page colour and use a subtle border to define their edges. This keeps the
      interface restrained while giving different elements enough separation.
    </p>
    <StatCardSpec />

    <h2>Layout</h2>
    <p>
      Pages use a twelve-column grid with 16px gutters. Form sections can place a heading alongside
      their fields, with consistent spacing between the two.
    </p>
    <p>
      Shared spacing rules also apply to component padding and the gaps between elements. This makes
      it easier to build new screens without having to work out every measurement from scratch.
    </p>
    <LayoutSpec />

    <h2>One system, six products</h2>
    <p>
      I've used this system across six products, each with its own visual identity. Themes control
      the colour palette, typeface, corner radii and selected states. The older products use Inter,
      smaller corners and a raised white selection, while the analytics dashboard uses Geist and a
      darker active state.
    </p>
    <ThemePlayground />
    <p>
      The demo above lets you switch between themes, adjust settings and inspect individual
      components. You can also explore the colour tokens and see where they're used throughout the
      interface.
    </p>
    <p>
      The components are built with Radix primitives and Tailwind, with design tokens controlling
      the shared styling.
    </p>
    <GitHubCard
      href="https://github.com/joan-verhulst/personal-design-system"
      title="View the design system on GitHub"
      description="personal-design-system on GitHub"
    />
  </>
);

export default DesignSystem;
