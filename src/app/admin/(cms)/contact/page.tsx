import type { Metadata } from "next";
import ContactForm from "~/modules/cms/components/contact-form";
import { readSite } from "~/modules/cms/utils/read-site";

export const metadata: Metadata = { title: "Contact" };

const ContactAdmin = async () => <ContactForm site={await readSite()} />;

export default ContactAdmin;
