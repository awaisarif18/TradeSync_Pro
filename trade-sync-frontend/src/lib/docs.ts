import fs from "fs";
import path from "path";
import matter from "gray-matter";

export const SECTION_ORDER = [
  "Getting Started",
  "Account & Web App",
  "For Copiers",
  "For Providers",
  "Trading & Risk",
  "Reference",
] as const;

export type DocFrontmatter = {
  title: string;
  description: string;
  section: string;
  order: number;
};

export type DocHeading = {
  id: string;
  text: string;
  level: 2 | 3;
};

export type DocMeta = DocFrontmatter & {
  slug: string;
  slugParts: string[];
};

export type DocPage = {
  frontmatter: DocFrontmatter;
  content: string;
  slug: string;
  slugParts: string[];
  headings: DocHeading[];
};

export const DOCS_HOME_SLUG = "getting-started/introduction";

const DOCS_DIR = path.join(process.cwd(), "src/content/docs");

function slugFromRelativePath(relativePath: string): string {
  return relativePath.replace(/\.mdx$/, "").replace(/\\/g, "/");
}

function walkMdxFiles(dir: string, base = ""): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...walkMdxFiles(path.join(dir, entry.name), rel));
    } else if (entry.name.endsWith(".mdx")) {
      files.push(rel);
    }
  }

  return files;
}

function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export function extractHeadings(content: string): DocHeading[] {
  const headings: DocHeading[] = [];

  for (const line of content.split("\n")) {
    const match = /^(#{2,3})\s+(.+)$/.exec(line.trim());
    if (!match) continue;

    const level = match[1].length as 2 | 3;
    const text = match[2].replace(/\*\*/g, "").trim();
    headings.push({ id: slugifyHeading(text), text, level });
  }

  return headings;
}

function readDocFile(relativePath: string): DocPage {
  const fullPath = path.join(DOCS_DIR, relativePath);
  const raw = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(raw);
  const slug = slugFromRelativePath(relativePath);

  return {
    frontmatter: data as DocFrontmatter,
    content: content.trim(),
    slug,
    slugParts: slug.split("/"),
    headings: extractHeadings(content),
  };
}

export function getAllDocs(): DocMeta[] {
  const files = walkMdxFiles(DOCS_DIR).sort();

  return files.map((file) => {
    const doc = readDocFile(file);
    return { ...doc.frontmatter, slug: doc.slug, slugParts: doc.slugParts };
  });
}

export function getAllDocSlugs(): string[][] {
  return getAllDocs().map((doc) => doc.slugParts);
}

export function getDocBySlug(slugParts: string[]): DocPage | null {
  const slug = slugParts.join("/");
  const relativePath = `${slug}.mdx`;
  const fullPath = path.join(DOCS_DIR, relativePath);

  if (!fs.existsSync(fullPath)) {
    return null;
  }

  return readDocFile(relativePath);
}

export type DocsNavGroup = {
  section: string;
  items: { title: string; slug: string }[];
};

export function getDocsNavTree(): DocsNavGroup[] {
  const docs = getAllDocs();

  return SECTION_ORDER.map((section) => ({
    section,
    items: docs
      .filter((doc) => doc.section === section)
      .sort((left, right) => left.order - right.order)
      .map((doc) => ({ title: doc.title, slug: doc.slug })),
  })).filter((group) => group.items.length > 0);
}

export function getOrderedDocs(): DocMeta[] {
  return SECTION_ORDER.flatMap((section) =>
    getAllDocs()
      .filter((doc) => doc.section === section)
      .sort((left, right) => left.order - right.order),
  );
}

export function getAdjacentDocs(slug: string): {
  prev: DocMeta | null;
  next: DocMeta | null;
} {
  const ordered = getOrderedDocs();
  const index = ordered.findIndex((doc) => doc.slug === slug);

  if (index === -1) {
    return { prev: null, next: null };
  }

  return {
    prev: index > 0 ? ordered[index - 1] : null,
    next: index < ordered.length - 1 ? ordered[index + 1] : null,
  };
}
