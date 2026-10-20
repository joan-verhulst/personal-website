import { postAt, posts } from "~/data/posts";
import { OG_SIZE } from "~/modules/og/components/home-screen-card";
import { renderHomeOg } from "~/modules/og/utils/render-home-og";
import { renderPostOg } from "~/modules/og/utils/render-post-og";

interface Props {
  params: Promise<{ slug: string }>;
}

export const alt = "The cover and title of a post on the blog";
export const size = OG_SIZE;
export const contentType = "image/png";

export const generateStaticParams = () => posts.map(({ slug }) => ({ slug }));

const Image = async ({ params }: Props) => {
  const post = postAt((await params).slug);
  return post ? renderPostOg(post) : renderHomeOg("blog");
};

export default Image;
