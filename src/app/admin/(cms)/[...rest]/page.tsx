import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = { title: "Not found" };

// Matches every address under the admin that no page has. Without it Next
// answers with the public site's 404. This one stays inside the CMS layout,
// so the sidebar is still there. On the admin host that's any unknown path
const UnknownAdminPage = () => notFound();

export default UnknownAdminPage;
