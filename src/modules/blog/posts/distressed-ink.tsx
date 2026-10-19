import { InkPlayground } from "~/modules/blog/demos/ink-demos";

/**
 * The distressed ink shader: the Photoshop routine it started as, what
 * changed when it became a shader, and the four settings to play with.
 */
const DistressedInk = () => (
  <>
    <p>
      I've always liked the look of distressed prints. The uneven ink, rough
      edges and grain give an image a quality that a perfectly clean digital
      image doesn't have. It's a bit imperfect, but in a way that makes the
      image more interesting.
    </p>
    <p>
      For a long time, I've recreated this look in Photoshop using the same
      three filters: Field Blur, Graphic Pen and Torn Edges. It's a fairly
      simple process, but the combination works surprisingly well.
    </p>
    <p>Recently, I decided to turn it into a shader.</p>

    <h2>From filters to shader</h2>
    <p>
      The idea was to take something I already knew how to make and see what
      would happen if I made it interactive.
    </p>
    <p>
      Instead of running a series of filters on a flattened image, I wanted to
      be able to change the effect itself. Move the focal point, change the
      texture, adjust how much ink covers the image, or change the colors
      entirely. All without having to start over.
    </p>
    <p>
      I first built it in Figma, then brought it to my website. It now runs
      directly on the image, with the settings exposed as controls.
    </p>
    <p>
      The result is much more flexible than the original Photoshop routine. A
      photograph can become a fine, grainy print or something much heavier,
      with large patches of ink and barely any detail left in the highlights.
    </p>

    <h2>Making it work</h2>
    <p>
      The original process is still the foundation. Blur the image, break it
      into pen strokes, then tear those strokes into irregular patches.
    </p>
    <p>
      What makes the shader interesting is that these steps are no longer
      fixed filters. Each one has its own parameters, and they interact in
      ways that aren't always obvious until you start playing with them.
    </p>
    <p>
      The blur, for example, isn't completely uniform. Noise breaks it up so
      that some areas soften more than others. The pen strokes use directional
      noise to create streaks, while the final pass merges them into larger
      patches and roughens their edges.
    </p>
    <p>
      Most of the work was in finding a balance between preserving the
      original image and letting the texture take over. Too much detail and it
      looks like a regular photograph with a filter applied. Too little, and
      the image becomes an indistinguishable mass of ink.
    </p>

    <h2>Playing with it</h2>
    <InkPlayground />
    <p>
      These are the four settings that have the biggest impact on the result.
    </p>
    <p>
      <strong>Blur</strong> controls how far the image softens around the
      focal point.
    </p>
    <p>
      <strong>Stroke length</strong> determines whether the texture looks like
      fine grain or longer pen strokes.
    </p>
    <p>
      <strong>Clump size</strong> changes the scale of the ink patches.
    </p>
    <p>
      <strong>Ink weight</strong> determines how much of the image remains
      visible.
    </p>
    <p>
      The focal point is draggable, so the effect can be directed toward a
      particular part of the image rather than applied uniformly.
    </p>
    <p>
      I like that the same settings can produce such different results
      depending on the photograph. It's a small effect, but one that gives me
      another way to work with images on the site.
    </p>
    <p>
      The shader runs in WGSL on WebGPU, with a WebGL version for the demos.
    </p>
  </>
);

export default DistressedInk;
