import type { Metadata } from "next";
import PageWithFooter from "~components/layout/footer";
import { ownPages } from "~/data/pages";
import BlogIndex from "~/modules/blog/components/blog-index";
import { describedPageMetadata } from "~/utils/page-metadata";

export const metadata: Metadata = describedPageMetadata(ownPages.blog);

const BlogPage = () => {
  return (
    <PageWithFooter className="min-h-screen">
      <BlogIndex />
    </PageWithFooter>
  );
};

export default BlogPage;
