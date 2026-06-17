import Link from "next/link";

type BreadcrumbProps = {
  section: string;
  title: string;
};

export default function Breadcrumb({ section, title }: BreadcrumbProps) {
  return (
    <nav className="docs-breadcrumb" aria-label="Breadcrumb">
      <Link href="/docs">Docs</Link>
      <span aria-hidden="true">›</span>
      <span>{section}</span>
      <span aria-hidden="true">›</span>
      <span className="docs-breadcrumb-current">{title}</span>
    </nav>
  );
}
