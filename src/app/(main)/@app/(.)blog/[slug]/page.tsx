import PostPage from "~app/(main)/blog/[slug]/page";
import AppScreen from "~components/layout/app-screen";
import { postAt, posts } from "~/data/posts";

interface Props {
  params: Promise<{ slug: string }>;
}

// Built ahead like the post itself, so opening one never waits on a server
export const generateStaticParams = () => posts.map(({ slug }) => ({ slug }));
export const dynamicParams = false;

const PostApp = async ({ params }: Props) => {
  const post = postAt((await params).slug);

  return (
    <AppScreen title={post?.title ?? "Blog"}>
      <PostPage params={params} />
    </AppScreen>
  );
};

export default PostApp;
