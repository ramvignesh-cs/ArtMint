"use client";

import { useState, useEffect } from "react";

interface FormattedDateProps {
  date: Date | string | number | { seconds?: number; nanoseconds?: number; toDate?: () => Date } | null | undefined;
  className?: string;
}

/**
 * Client-side date formatter to prevent hydration mismatches
 * Handles Firestore Timestamp objects, Date objects, strings, and numbers
 */
export function FormattedDate({ date, className }: FormattedDateProps) {
  const [formatted, setFormatted] = useState<string>("");

  useEffect(() => {
    if (!date) {
      setFormatted("—");
      return;
    }

    let dateObj: Date;

    try {
      // Handle Firestore Timestamp objects
      if (typeof date === "object" && date !== null && "toDate" in date && typeof date.toDate === "function") {
        dateObj = date.toDate();
      } else if (typeof date === "object" && date !== null && "seconds" in date) {
        // Handle Firestore Timestamp-like objects with seconds
        dateObj = new Date((date as any).seconds * 1000);
      } else {
        // Handle Date, string, or number
        dateObj = new Date(date as any);
      }

      // Check if date is valid
      if (isNaN(dateObj.getTime())) {
        setFormatted("—");
        return;
      }

      const formattedDate = new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(dateObj);
      setFormatted(formattedDate);
    } catch (error) {
      console.error("Error formatting date:", error, date);
      setFormatted("—");
    }
  }, [date]);

  return <span className={className}>{formatted || "—"}</span>;
}

