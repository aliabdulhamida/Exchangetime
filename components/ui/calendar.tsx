'use client';

import type React from 'react';
import CalendarComponent from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

export type CalendarProps = React.ComponentProps<typeof CalendarComponent>;

export function CustomCalendar(props: CalendarProps) {
  return <CalendarComponent {...props} />;
}
