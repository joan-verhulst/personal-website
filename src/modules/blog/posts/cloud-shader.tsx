import {
  CoverageDemo,
  LightingDemo,
  ScatteringDemo,
  SkyPlayground,
  WeatherDemo,
} from "~/modules/blog/demos/sky-demos";

const CloudShader = () => (
  <>
    <p>
      The goal was to build a sky that feels connected to the real world. The
      sun follows the clock, clouds drift with the wind, and the appearance of
      the sky changes with the weather. All of it runs in a small canvas on my
      website.
    </p>
    <p>
      The interesting part isn't drawing clouds themselves. It's making them
      look convincing from the ground, getting the lighting right, and keeping
      the same shader flexible enough to represent completely different
      weather conditions.
    </p>

    <h2>The sky</h2>
    <p>
      The foundation is an atmospheric scattering shader, which handles the
      gradient from the blue sky overhead to the haze around the horizon and
      the warmer colors of sunrise and sunset. The implementation follows{" "}
      <a
        href="https://blog.maximeheckel.com/posts/on-rendering-the-sky-sunsets-and-planets/"
        target="_blank"
        rel="noopener noreferrer"
      >
        Maxime Heckel's guide to rendering the sky, sunsets and planets
      </a>
      .
    </p>
    <ScatteringDemo />
    <p>
      The sun's position determines the sky color throughout the day. Since
      the atmospheric scattering calculation is relatively expensive and
      changes slowly, it can be rendered at a lower resolution and updated
      only when needed.
    </p>
    <p>Everything else is layered on top.</p>

    <h2>Building clouds from noise</h2>
    <p>
      The clouds start with a single tileable noise texture, generated once
      when the shader starts. It has four channels, and each one is made
      from one of two kinds of noise.
    </p>
    <p>
      The first is value noise: random values on a grid, smoothly
      interpolated, then stacked in layers that are each twice as fine and
      half as strong. The result is soft and blotchy, with no particular
      structure to it. The second is Worley noise: the distance from each
      point to the nearest of a scatter of random points. Inverted and
      softened, that gives round blobs with clear edges.
    </p>
    <p>
      The red channel is five layers of value noise, which becomes the
      sheet. Green is Worley noise with six points across the tile, the
      heaps. Blue is fine value noise, the detail. Alpha is much smaller
      Worley heaps with that detail mixed in, for cauliflower edges.
    </p>
    <p>
      None of these channels looks like a cloud on its own. The cloud types
      come from mixing them at different scales.
    </p>
    <p>
      Stratus is the sheet read twice: once at the texture's scale, and once
      rotated and five times finer, with the finer read carrying less weight.
      Two scales of soft noise give a layer that varies gently, the way a
      flat deck of cloud hangs.
    </p>
    <p>
      Cumulus is a mix of three channels. The sheet, read at a larger scale,
      gathers the clouds into regions. The heaps, read three times finer,
      provide the rounded shapes inside those regions. The small heaps, read
      six times finer still, add the lumpy edges.
    </p>
    <p>
      A ragged parameter adds the detail channel around the edges, so the
      outline tears instead of staying smooth. A billow parameter blends
      between the stratus sheet and the cumulus heaps. The weather presets
      set both.
    </p>
    <p>
      One tile represents roughly 30 kilometers of sky, which gives the
      clouds a consistent scale regardless of the canvas size. Wind moves the
      sampling coordinates, so the clouds drift without being regenerated.
    </p>

    <h3>Coverage</h3>
    <p>
      A mixed shape is still just a field of values. To turn it into clouds,
      I threshold those values: everything above a certain level becomes
      cloud, and everything below it remains clear sky.
    </p>
    <p>
      The threshold determines cloud coverage. A higher threshold produces
      fewer clouds; a lower one fills more of the sky.
    </p>
    <CoverageDemo />
    <p>
      The complication is that the threshold doesn't correspond directly to a
      percentage of sky coverage. The values aren't distributed uniformly,
      so a threshold of 0.5 doesn't necessarily leave half the sky covered.
    </p>
    <p>
      The values of each shape fall roughly in a bell curve, so I measured
      the average and spread of both the sheet and the heaps. The shader
      uses those to estimate the threshold for a given coverage. A soft
      transition around that threshold creates the cloud edges.
    </p>

    <h2>Seeing the clouds from below</h2>
    <p>
      The noise texture is a flat map, but the shader needs to show it from
      the perspective of someone standing on the ground.
    </p>
    <p>
      Rather than projecting the clouds onto a flat plane, the shader places
      them on a spherical shell above the Earth. Each view ray intersects that
      shell, and the intersection determines which part of the noise texture
      is visible.
    </p>
    <p>
      This matters most near the horizon. Clouds directly overhead occupy a
      relatively small area of the noise texture, while clouds near the
      horizon can stretch across many kilometers. Without accounting for that
      difference, the texture becomes a noisy band along the bottom of the
      sky.
    </p>
    <p>
      Mipmapping helps here. The GPU uses progressively smaller versions of
      the noise texture as the clouds recede into the distance, preventing
      fine details from turning into flickering speckles. The clouds also fade
      into the atmospheric haze near the horizon.
    </p>

    <h2>Lighting the clouds</h2>
    <p>
      Cloud lighting is largely about how much light passes through the cloud
      layer.
    </p>
    <p>
      Thin clouds transmit more sunlight and appear bright, while thicker
      clouds scatter and absorb more light, producing darker interiors and
      undersides. The shader approximates this using the cloud's thickness and
      its orientation relative to the sun.
    </p>
    <LightingDemo />
    <p>The most noticeable effect happens around sunrise and sunset.</p>
    <p>
      When the sun is low, its light can travel underneath the clouds and
      illuminate their undersides. But this only works when there are gaps
      between the clouds. An unbroken layer blocks the direct sunlight,
      leaving its underside grey, while broken clouds can glow orange from
      below.
    </p>
    <p>
      The shader estimates this by checking for open sky along the direction
      of the sun. The result isn't a full simulation of light scattering
      through a cloud volume, but it produces a much more convincing
      transition between broken clouds and overcast skies.
    </p>
    <p>
      Other adjustments account for the brighter edges of thin clouds near the
      sun, light on the sun-facing sides of rounded formations, and the warm
      glow of artificial lights after dark.
    </p>
    <p>
      A separate high-altitude layer adds thin, streaky clouds. These catch
      the light differently from the main layer, particularly around sunrise
      and sunset.
    </p>

    <h2>Five weather presets</h2>
    <p>
      The shader originally had a more elaborate system for choosing cloud
      types based on season, altitude and time of day. In practice, it added
      complexity without consistently improving the result.
    </p>
    <p>
      I replaced it with five presets: clear, partly cloudy, cloudy, rain and
      storm.
    </p>
    <p>
      Each preset is a collection of parameters controlling coverage, cloud
      scale, height, thickness, shape, edge detail and lighting. This makes
      the differences between weather conditions explicit rather than relying
      on a complicated system to produce them indirectly.
    </p>
    <p>
      The shape parameters do most of the work. Cloudy is a pure stratus
      sheet with smooth edges. Partly cloudy is heaped a third of the way
      toward cumulus, with ragged edges. Rain is a sheet again, lower and
      torn at the edges. Storm is low, slightly heaped and the most ragged of
      all.
    </p>
    <p>
      The weather API selects the closest preset, then adjusts it according to
      the reported conditions. Cloud coverage follows the observed amount,
      high clouds influence the upper layer, and precipitation affects the
      rain or snow intensity.
    </p>
    <p>
      When the weather changes, the parameters interpolate toward their new
      values over roughly twenty seconds. Instead of switching abruptly
      between two different skies, the existing clouds gradually change shape,
      coverage and height.
    </p>
    <WeatherDemo />

    <h2>Rain, snow and lightning</h2>
    <p>
      Precipitation is rendered in a separate pass at the canvas's full
      resolution.
    </p>
    <p>
      Rain uses streaks at three depths, with differences in size, speed and
      opacity to create a sense of distance. Snow uses flakes that drift as
      they fall. Both respond to the wind.
    </p>
    <p>
      Storms add occasional lightning, including a brief illumination of the
      surrounding clouds. The flashes vary in intensity, sometimes followed by
      a weaker secondary flash.
    </p>
    <p>
      Keeping these effects separate means they can be animated independently
      of the sky and cloud lighting.
    </p>
    <p>
      The shader also avoids recalculating everything every frame. The
      atmospheric background only needs updating when the sun moves, while the
      clouds update as they drift. Rain, snow and lightning run continuously.
    </p>

    <h2>Putting it together</h2>
    <SkyPlayground />
    <p>
      The final shader combines atmospheric scattering, a procedural cloud
      layer, cloud lighting and precipitation. The time of day and weather
      determine how those systems interact.
    </p>
    <p>
      The controls let you change the time, select a weather preset and watch
      the wind move the clouds across the sky.
    </p>
    <p>
      There are limits to the approach. The clouds form a single layer rather
      than a fully three-dimensional volume, so they don't cast shadows on
      each other and can't produce towering thunderheads with convincing
      internal structure. The lighting is an approximation, too.
    </p>
    <p>
      For this particular use, those trade-offs make sense. The shader needs
      to look convincing in a relatively small canvas, respond to real-world
      conditions and run continuously without consuming too many resources.
    </p>
    <p>
      The result is a sky that changes throughout the day without needing a
      separate image for every possible condition.
    </p>
  </>
);

export default CloudShader;
