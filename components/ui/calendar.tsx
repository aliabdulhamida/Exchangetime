"use client"

"use client";

import React from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

export type CalendarProps = React.ComponentProps<typeof Calendar>;

export function CustomCalendar(props: CalendarProps) {
  return <Calendar {...props} />;
}
