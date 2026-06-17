import { compileMDX } from "next-mdx-remote/rsc";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import Breadcrumb from "@/components/docs/Breadcrumb";
import PrevNext from "@/components/docs/PrevNext";
import Sidebar from "@/components/docs/Sidebar";
import TableOfContents from "@/components/docs/TableOfContents";
import { mdxComponents } from "@/components/docs/MdxComponents";
import {
  DOCS_HOME_SLUG,
  getAdjacentDocs,
  getAllDocSlugs,
  getDocBySlug,
  getDocsNavTree,
} from "@/lib/docs";

type DocPageProps = {
  params: Promise<{ slug?: string[] }>;
};

export async function generateStaticParams() {
  return getAllDocSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: DocPageProps): Promise<Metadata> {
  const { slug } = await params;
  const doc = getDocBySlug(slug ?? []);

  if (!doc) {
    return {};
  }

  return {
    title: `${doc.frontmatter.title} | TradeSync Pro Docs`,
    description: doc.frontmatter.description,
  };
}

export default async function DocPage({ params }: DocPageProps) {
  const { slug } = await params;

  if (!slug || slug.length === 0) {
    redirect(`/docs/${DOCS_HOME_SLUG}`);
  }

  const doc = getDocBySlug(slug);

  if (!doc) {
    notFound();
  }

  const nav = getDocsNavTree();
  const { prev, next } = getAdjacentDocs(doc.slug);

  const { content } = await compileMDX({
    source: doc.content,
    options: {
      mdxOptions: {
        remarkPlugins: [remarkGfm],
        rehypePlugins: [rehypeSlug, rehypeAutolinkHeadings],
      },
    },
    components: mdxComponents,
  });

  return (
    <div className="docs-layout">
      <Sidebar nav={nav} />
      <article className="docs-content">
        <Breadcrumb
          section={doc.frontmatter.section}
          title={doc.frontmatter.title}
        />
        <div className="docs-prose">{content}</div>
        <PrevNext prev={prev} next={next} />
      </article>
      <TableOfContents headings={doc.headings} />
    </div>
  );
}
