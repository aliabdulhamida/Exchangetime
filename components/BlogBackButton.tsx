import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BlogBackButtonProps = {
  href?: string;
  label?: string;
  className?: string;
};

export default function BlogBackButton({
  href = "/blog",
  label = "Back to Blog",
  className,
}: BlogBackButtonProps) {
  return (
    <Button
      asChild
      variant="outline"
      size="sm"
      className={cn(
        "group not-prose rounded-full pl-2 pr-3 gap-1 shadow-sm hover:shadow focus-visible:ring-2 !no-underline hover:!no-underline focus:!no-underline decoration-transparent [&_*]:!no-underline",
        className
      )}
      aria-label={label}
    >
      <Link
        href={href}
        className="blog-back-link !no-underline decoration-transparent"
        data-no-underline
      >
        <ArrowLeft className="mr-1 transition-transform duration-200 group-hover:-translate-x-0.5" />
        <span>{label}</span>
      </Link>
    </Button>
  );
}
