type Color = [number, number, number];

const EARTH = 6360;
const ATMOSPHERE = 6460;
const ALTITUDE = 0.5;

const RAYLEIGH: Color = [0.0058, 0.0135, 0.0331];
const RAYLEIGH_HEIGHT = 8;
const MIE_EXTINCTION = 0.00444;
const MIE_HEIGHT = 1.2;
const OZONE: Color = [0.00065, 0.00188, 0.00008];

const STEPS = 6;

export const sunTransmittance = (
  heightKm: number,
  sunElevationDeg: number,
): Color => {
  const radians = (sunElevationDeg * Math.PI) / 180;
  const sunY = Math.sin(radians);
  const sunZ = Math.cos(radians);
  const pointY = EARTH + ALTITUDE + heightKm;

  const b = pointY * sunY;
  const groundGap = b * b - (pointY * pointY - EARTH * EARTH);
  if (groundGap >= 0 && -b - Math.sqrt(groundGap) > 0) return [0, 0, 0];
  const airGap = b * b - (pointY * pointY - ATMOSPHERE * ATMOSPHERE);
  const stride = (-b + Math.sqrt(airGap)) / STEPS;

  let air = 0;
  let haze = 0;
  let ozone = 0;
  for (let i = 0; i < STEPS; i++) {
    const along = (i + 0.5) * stride;
    const height = Math.hypot(pointY + sunY * along, sunZ * along) - EARTH;
    air += Math.exp(-height / RAYLEIGH_HEIGHT) * stride;
    haze += Math.exp(-height / MIE_HEIGHT) * stride;
    ozone += Math.max(0, 1 - Math.abs(height - 25) / 15) * stride;
  }
  return RAYLEIGH.map((scatter, channel) =>
    Math.exp(-(scatter * air + MIE_EXTINCTION * haze + OZONE[channel] * ozone)),
  ) as Color;
};
