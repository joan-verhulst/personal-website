import type { Metadata } from "next";
import ContactForm from "~/modules/cms/components/contact-form";
import { readSite } from "~/modules/cms/utils/read-site";

export const metadata: Metadata = { title: "Contact" };

// The form renders the whole page: its header, and Save in the bottom bar
const ContactAdmin = async () => <ContactForm site={await readSite()} />;

export default ContactAdmin;
