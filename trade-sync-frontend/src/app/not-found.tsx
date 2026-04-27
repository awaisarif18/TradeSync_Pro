import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button, Card, CardBody } from "../components/ui";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-[var(--color-bg)] px-4">
      <Card>
        <CardBody>
          <div className="mx-auto flex max-w-[520px] flex-col items-center py-10 text-center">
            <div className="font-mono-tnum text-[64px] font-semibold leading-none text-[var(--color-text-3)]">
              404
            </div>
            <h1 className="mt-6 text-[32px] font-semibold tracking-[-0.025em]">
              We couldn&apos;t find that page.
            </h1>
            <p className="mt-3 max-w-[360px] text-sm leading-6 text-[var(--color-text-2)]">
              The provider, page, or resource you requested doesn&apos;t exist or
              has been removed.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link href="/traders">
                <Button rightIcon={<ArrowRight size={15} />}>
                  Browse providers
                </Button>
              </Link>
              <Link href="/">
                <Button variant="ghost">Back to home</Button>
              </Link>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
