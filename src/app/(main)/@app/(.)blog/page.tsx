import BlogPage from "~app/(main)/blog/page";
import AppScreen from "~components/layout/app-screen";
import { ownPages } from "~/data/pages";

const BlogApp = () => {
  return (
    <AppScreen title={ownPages.blog.title}>
      <BlogPage />
    </AppScreen>
  );
};

export default BlogApp;
