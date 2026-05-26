import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Calendar({ selected, onSelect }) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    return selected ? new Date(selected.getTime()) : new Date()
  })

  // Synchronize internal month view when selected date changes externally
  useEffect(() => {
    if (selected) {
      setCurrentMonth(new Date(selected.getTime()))
    }
  }, [selected])

  const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const currentYear = new Date().getFullYear()
  // Generate scrollable year range: 15 years back and 5 years forward
  const YEARS = Array.from({ length: 21 }).map((_, i) => currentYear - 15 + i)

  const handleMonthChange = (e) => {
    const newMonth = new Date(currentMonth.getTime())
    newMonth.setMonth(parseInt(e.target.value))
    setCurrentMonth(newMonth)
  }

  const handleYearChange = (e) => {
    const newMonth = new Date(currentMonth.getTime())
    newMonth.setFullYear(parseInt(e.target.value))
    setCurrentMonth(newMonth)
  }

  const prevMonth = () => {
    const newMonth = new Date(currentMonth.getTime())
    newMonth.setMonth(currentMonth.getMonth() - 1)
    setCurrentMonth(newMonth)
  }

  const nextMonth = () => {
    const newMonth = new Date(currentMonth.getTime())
    newMonth.setMonth(currentMonth.getMonth() + 1)
    setCurrentMonth(newMonth)
  }

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()

  const firstDay = new Date(year, month, 1)
  const startDay = firstDay.getDay()
  const totalDays = new Date(year, month + 1, 0).getDate()
  const prevMonthTotalDays = new Date(year, month, 0).getDate()

  const days = []
  
  // Previous month padding days
  for (let i = startDay - 1; i >= 0; i--) {
    days.push({
      date: new Date(year, month - 1, prevMonthTotalDays - i),
      isOutside: true
    })
  }

  // Current month days
  for (let i = 1; i <= totalDays; i++) {
    days.push({
      date: new Date(year, month, i),
      isOutside: false
    })
  }

  // Next month padding days to fill 42 cells grid
  const totalCells = 42
  const nextDaysCount = totalCells - days.length
  for (let i = 1; i <= nextDaysCount; i++) {
    days.push({
      date: new Date(year, month + 1, i),
      isOutside: true
    })
  }

  const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

  return (
    <div className="p-3 select-none bg-surface">
      {/* Calendar Header with dropdowns and arrows near the top */}
      <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-border">
        {/* Month & Year dropdowns */}
        <div className="flex items-center gap-1.5">
          <select
            value={month}
            onChange={handleMonthChange}
            className="bg-surface-2 border border-border text-text-strong text-[11px] font-sans font-semibold px-2 py-1 rounded-md outline-none cursor-pointer hover:border-border-3 transition-colors select-none"
          >
            {MONTHS.map((m, idx) => (
              <option key={m} value={idx}>
                {m}
              </option>
            ))}
          </select>

          <select
            value={year}
            onChange={handleYearChange}
            className="bg-surface-2 border border-border text-text-strong text-[11px] font-sans font-semibold px-2 py-1 rounded-md outline-none cursor-pointer hover:border-border-3 transition-colors select-none"
          >
            {YEARS.map(y => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        {/* Navigation Arrows near the top next to dropdowns */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={prevMonth}
            className="p-1 border border-border bg-surface text-text-3 hover:bg-surface-2 hover:text-text-strong rounded-md transition-colors cursor-pointer"
          >
            <ChevronLeft size={13} />
          </button>
          <button
            onClick={nextMonth}
            className="p-1 border border-border bg-surface text-text-3 hover:bg-surface-2 hover:text-text-strong rounded-md transition-colors cursor-pointer"
          >
            <ChevronRight size={13} />
          </button>
        </div>
      </div>

      {/* Weekdays */}
      <div className="grid grid-cols-7 mb-1 text-center">
        {WEEKDAYS.map(d => (
          <span 
            key={d} 
            className="font-mono text-[9px] uppercase tracking-wider text-text-3 py-1 block"
          >
            {d}
          </span>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 text-center gap-0.5">
        {days.map((day, idx) => {
          const isSelected = selected && 
            day.date.getDate() === selected.getDate() && 
            day.date.getMonth() === selected.getMonth() && 
            day.date.getFullYear() === selected.getFullYear()
          
          const today = new Date()
          const isToday = 
            day.date.getDate() === today.getDate() && 
            day.date.getMonth() === today.getMonth() && 
            day.date.getFullYear() === today.getFullYear()

          return (
            <button
              key={idx}
              onClick={() => onSelect(day.date)}
              className={cn(
                "w-8 h-8 font-mono text-[11px] cursor-pointer transition-colors border-0 outline-none rounded-md",
                day.isOutside ? "opacity-30 text-text-3" : "text-text-2",
                isSelected 
                  ? "bg-text-strong text-background font-bold" 
                  : "bg-transparent hover:bg-surface-2 hover:text-text-strong",
                isToday && !isSelected ? "text-green font-bold underline underline-offset-2" : ""
              )}
            >
              {day.date.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}
