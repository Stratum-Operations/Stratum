import * as React from "react"
import { DayPicker } from "react-day-picker"
import "react-day-picker/style.css"
import { cn } from "../../lib/utils"

export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3 bg-surface border border-border shadow-md", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-between pt-1 relative items-center px-8",
        caption_label: "text-sm font-semibold text-text-strong",
        nav: "space-x-1 flex items-center",
        nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 transition-opacity rounded-md border border-border cursor-pointer flex items-center justify-center text-text-strong hover:bg-surface-2",
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex justify-between mt-2",
        head_cell: "text-text-3 rounded-md w-8 font-normal text-[0.8rem] text-center",
        row: "flex w-full mt-1 justify-between",
        cell: "h-8 w-8 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
        day: cn(
          "h-8 w-8 p-0 font-normal hover:bg-surface-3 rounded-md transition-colors cursor-pointer flex items-center justify-center text-text-strong"
        ),
        day_selected:
          "bg-primary text-white hover:bg-primary hover:text-white focus:bg-primary focus:text-white font-bold rounded-md",
        day_today: "bg-surface-2 border border-border text-text-strong font-semibold",
        day_outside: "text-text-3 opacity-30",
        day_disabled: "text-text-3 opacity-30 cursor-not-allowed",
        day_hidden: "invisible",
        ...classNames,
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"
