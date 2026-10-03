import { siteData } from "~/data/site";
import { OG_SIZE } from "~/modules/og/components/home-screen-card";
import { renderHomeOg } from "~/modules/og/utils/render-home-og";

// Every page shares the home screen. The sections light up their own tile
export const alt = `The home screen of ${siteData.owner.name}'s website`;
export const size = OG_SIZE;
export const contentType = "image/png";

const Image = () => renderHomeOg();

export default Image;
