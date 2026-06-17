import Link from "next/link";
import type { AnchorHTMLAttributes, ComponentPropsWithoutRef } from "react";

type AnchorProps = AnchorHTMLAttributes<HTMLAnchorElement>;

function DocsLink({ href, children, ...props }: AnchorProps) {
  if (href?.startsWith("/")) {
    return (
      <Link href={href} {...props}>
        {children}
      </Link>
    );
  }

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
      {children}
    </a>
  );
}

function DocsPre({ children, ...props }: ComponentPropsWithoutRef<"pre">) {
  return <pre {...props}>{children}</pre>;
}

function DocsCode({ children, ...props }: ComponentPropsWithoutRef<"code">) {
  return <code {...props}>{children}</code>;
}

export const mdxComponents = {
  a: DocsLink,
  pre: DocsPre,
  code: DocsCode,
};
