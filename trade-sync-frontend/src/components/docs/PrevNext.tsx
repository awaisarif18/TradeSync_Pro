import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { DocMeta } from "@/lib/docs";

type PrevNextProps = {
  prev: DocMeta | null;
  next: DocMeta | null;
};

export default function PrevNext({ prev, next }: PrevNextProps) {
  if (!prev && !next) {
    return null;
  }

  return (
    <div className="docs-prev-next">
      {prev ? (
        <Link href={`/docs/${prev.slug}`} className="docs-prev-next-link prev">
          <span className="docs-prev-next-label">
            <ArrowLeft size={14} />
            Previous
          </span>
          <span className="docs-prev-next-title">{prev.title}</span>
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link href={`/docs/${next.slug}`} className="docs-prev-next-link next">
          <span className="docs-prev-next-label">
            Next
            <ArrowRight size={14} />
          </span>
          <span className="docs-prev-next-title">{next.title}</span>
        </Link>
      ) : null}
    </div>
  );
}
