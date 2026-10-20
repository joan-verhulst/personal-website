import type { Metadata } from "next";
import AboutForm from "~/modules/cms/components/about-form";
import { readSite } from "~/modules/cms/utils/read-site";

export const metadata: Metadata = { title: "About" };

const AboutAdmin = async () => <AboutForm site={await readSite()} />;

export default AboutAdmin;
