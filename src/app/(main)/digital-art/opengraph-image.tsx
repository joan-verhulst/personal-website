import { siteData } from "~/data/site";
import { OG_SIZE } from "~/modules/og/components/home-screen-card";
import { renderHomeOg } from "~/modules/og/utils/render-home-og";

export const alt = `The home screen of ${siteData.owner.name}'s website, with Digital Art lit up`;
export const size = OG_SIZE;
export const contentType = "image/png";

const Image = () => renderHomeOg("digital-art");

export default Image;
