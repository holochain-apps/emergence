import type { SessionsFilter, TimeWindow } from "./types"

// @ts-ignore
export const sortWindows = (a,b) : number => {return new Date(a.start) - new Date(b.start)}

export const windowsInDay = (windows, day, type) : Array<TimeWindow> => {
    return windows.filter(w=>{
                return windowDay(w).getTime() === day.getTime()
              }).filter(w => w.tags.includes(type) || !type )
}

export const dayToStr = (day: Date) => {
    return `${day.getMonth()+1}/${day.getDate()}`
}


export const ONE_HOUR_OF_MS = 60*60*60
export const ONE_MINUTE_OF_MS = 60*60*60

export const windowDay = (window: TimeWindow) : Date => {
  return new Date(new Date(window.start).setHours(0,0,0))
}

export const filterTime = (now: number, filter:SessionsFilter, window: TimeWindow): boolean => {
  if (!filter.timeNow && !filter.timeNext && !filter.timePast && !filter.timeFuture && filter.timeDays.length==0) return true

  const windowStart = window.start
  const windowEnd = window.start + window.duration*ONE_MINUTE_OF_MS

  if ( filter.timeNow && (windowStart >= now && windowEnd <= now)) return true
  if ( filter.timeNext && (windowEnd > now  && (windowEnd + ONE_HOUR_OF_MS) < now )) return true
  if ( filter.timeFuture && (windowStart > now)) return true
  if ( filter.timePast && (windowStart < now)) return true
  if ( filter.timeDays.length > 0) {
    if (filter.timeDays.includes(windowDay(window).getTime())) return true
  }

  return false
}

export const calcDays = (windows, slotTypeFilter, filter: SessionsFilter): Array<Date> => {
 const days = []
 const dayStrings = {}

 const now = (new Date).getTime()
 windows.forEach(w=> {
       if ((!slotTypeFilter || w.tags.includes(slotTypeFilter)) &&
       filterTime(now, filter, w )
   )
    {
      const d = windowDay(w)
      dayStrings[d.toDateString()] = d
    }
 })
 Object.values(dayStrings).forEach((d:Date)=>days.push(d))
 days.sort((a,b)=> a-b)
 return days
}
