import type { Metadata } from "next";
import AboutForm from "~/modules/cms/components/about-form";
import { readSite } from "~/modules/cms/utils/read-site";

export const metadata: Metadata = { title: "About" };

// The form renders the whole page: its header, and Save in the bottom bar
const AboutAdmin = async () => <AboutForm site={await readSite()} />;

export default AboutAdmin;
