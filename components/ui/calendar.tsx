"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {

  return (
    <div className={className}>
      <label>
        Datum wählen:
        <input
          type="date"
          value={props.value || ""}
          onChange={e => props.onChange?.(e.target.value)}
          className="border rounded px-2 py-1 ml-2"
        />
      </label>
    </div>
  );
};
Calendar.displayName = "Calendar";

export { Calendar };
