import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PageWithFooter from "~components/layout/footer";
import { ownPages } from "~/data/pages";
import { postAt, posts } from "~/data/posts";
import PostLayout from "~/modules/blog/components/post-layout";
import { postBodies, postHeroes } from "~/modules/blog/posts";
import { describedPageMetadata } from "~/utils/page-metadata";

interface Props {
  params: Promise<{ slug: string }>;
}

export const generateStaticParams = () => posts.map(({ slug }) => ({ slug }));
export const dynamicParams = false;

export const generateMetadata = async ({ params }: Props): Promise<Metadata> => {
  const post = postAt((await params).slug);
  if (!post) return {};
  return describedPageMetadata({
    path: `${ownPages.blog.path}/${post.slug}`,
    title: post.title,
    description: post.summary,
    isArticle: true,
  });
};

const PostPage = async ({ params }: Props) => {
  const { slug } = await params;
  const post = postAt(slug);
  const Body = postBodies[slug];
  const Hero = postHeroes[slug];
  if (!post || !Body) notFound();

  return (
    <PageWithFooter className="min-h-screen">
      <PostLayout post={post} hero={Hero && <Hero />}>
        <Body />
      </PostLayout>
    </PageWithFooter>
  );
};

export default PostPage;
