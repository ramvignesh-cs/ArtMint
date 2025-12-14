"use client";

import { useState, useEffect } from "react";

interface FormattedDateProps {
  date: Date | string | number;
  className?: string;
}

/**
 * Client-side date formatter to prevent hydration mismatches
 */
export function FormattedDate({ date, className }: FormattedDateProps) {
  const [formatted, setFormatted] = useState<string>("");

  useEffect(() => {
    const dateObj = new Date(date);
    const formattedDate = new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(dateObj);
    setFormatted(formattedDate);
  }, [date]);

  return <span className={className}>{formatted || "—"}</span>;
}

