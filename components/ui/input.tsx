import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    // Workaround: Verhindere Scrollen bei Fokus auf mobilen Geräten
    const inputRef = React.useRef<HTMLInputElement>(null);
    React.useEffect(() => {
      const el = inputRef.current;
      if (!el) return;
      const handleFocus = () => {
        if (typeof window !== "undefined" && window.innerWidth < 900) {
          // Merke aktuelle Scrollposition
          const x = window.scrollX;
          const y = window.scrollY;
          setTimeout(() => {
            window.scrollTo(x, y);
          }, 1);
        }
      };
      el.addEventListener("focus", handleFocus);
      return () => {
        el.removeEventListener("focus", handleFocus);
      };
    }, []);
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={(node) => {
          if (typeof ref === "function") ref(node);
          else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = node;
          inputRef.current = node;
        }}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
