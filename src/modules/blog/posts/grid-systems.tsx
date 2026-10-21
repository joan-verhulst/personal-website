import CodeBlock from "~/modules/blog/components/code-block";
import {
  BordersFigure,
  LengthsFigure,
  RasterApp,
  UnitFigure,
  WidthsFigure,
} from "~/modules/blog/demos/grid-demos";

const GridSystems = () => (
  <>
    <p>
      I've always liked Swiss design, particularly its use of typography, grids and whitespace. I've
      used the style in static projects like posters, and wanted to see what it would look like
      applied to a software interface.
    </p>
    <p>
      I built an email campaign tool as a test case, exploring how the same visual language could
      work with responsive layouts, tables and changing content. The result combines a typographic
      grid, modular spacing and a stripped-back interface with fewer borders and panels.
    </p>

    <h2>Typography and spacing</h2>
    <p>
      The interface uses a 16px base unit. Margins and gutters follow that unit, while table rows
      take up two units. Text is aligned to a 4px baseline grid using CSS text-box trimming and
      calculated offsets.
    </p>
    <CodeBlock caption="Trim the text to its letters, then push it down to the next grid line.">
      {`.rx {
  text-box: trim-both cap alphabetic;
  padding-top: calc(round(up, 1cap, 4px) - 1cap);
}`}
    </CodeBlock>
    <p>
      Text-box trimming isn't supported in every browser yet. Without it, the text sits a few pixels
      off the baseline grid, but the layout itself holds.
    </p>
    <p>
      This gives the interface a consistent rhythm, with typography, spacing and component
      dimensions working together rather than feeling independently styled.
    </p>
    <UnitFigure />

    <h2>A responsive grid</h2>
    <p>
      The layout uses 24, 12, 8 or 4 columns, depending on the available width. The navigation
      follows the window's grid, while the main content sits in a separate container with its own
      columns and maximum widths.
    </p>
    <p>
      Tables adapt to narrower screens by dropping lower-priority columns first. A designated column
      expands to fill the remaining space, keeping the table usable without needing a separate
      layout for every breakpoint.
    </p>
    <WidthsFigure />

    <h2>Working with real content</h2>
    <p>
      Unlike a poster, an interface has to accommodate content of varying lengths. Text can wrap
      across additional lines, and the layout grows with it while retaining consistent spacing.
    </p>
    <LengthsFigure />
    <p>
      Section labels sit in a separate column beside their content, moving above it on narrow
      screens. For larger datasets, group labels remain visible while scrolling, and long lists can
      be expanded in batches.
    </p>
    <RasterApp />

    <h2>Fewer borders</h2>
    <p>
      I also experimented with removing the panels, cards and borders commonly used to separate
      interface elements. Instead, spacing and alignment do most of the work.
    </p>
    <BordersFigure />
    <p>
      The result is quieter and closer to the graphic design that inspired it. But removing every
      boundary also made some elements harder to recognise. Buttons and inputs need clear
      affordances, and dense tables benefit from subtle dividers. I brought some of those details
      back where they helped.
    </p>

    <h2>Was it worth it?</h2>
    <p>
      I'm happy with the experiment as an exploration of Swiss design in software. The grid gives
      the interface a consistent structure, and the reduced use of boxes creates a different feel
      from a conventional dashboard.
    </p>
    <p>
      I'm not convinced the aesthetic suits every product, and that's fine. The point was to see how
      the style translated to an interactive interface, not to establish a new design methodology.
    </p>
  </>
);

export default GridSystems;
