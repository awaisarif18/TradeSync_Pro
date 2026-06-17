import Link from "next/link";
import type { DocHeading } from "@/lib/docs";

type TableOfContentsProps = {
  headings: DocHeading[];
};

export default function TableOfContents({ headings }: TableOfContentsProps) {
  if (headings.length === 0) {
    return null;
  }

  return (
    <aside className="docs-toc">
      <div className="docs-toc-inner">
        <p className="docs-toc-label">On this page</p>
        <ul className="docs-toc-list">
          {headings.map((heading) => (
            <li
              key={heading.id}
              className={heading.level === 3 ? "docs-toc-item nested" : "docs-toc-item"}
            >
              <Link href={`#${heading.id}`}>{heading.text}</Link>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
