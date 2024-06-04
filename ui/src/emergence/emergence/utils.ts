import { CellType, type AppClient, type DnaHash, type EntryHash, type Timestamp } from "@holochain/client"
import type { Info, InfoSession, Session, SessionsFilter, Slot, TimeWindow } from "./types"

// @ts-ignore
export const sortWindows = (a,b) : number => {return new Date(a.start) - new Date(b.start)}

export const windowsInDay = (windows, day, type) : Array<TimeWindow> => {
    return windows.filter(w=>{
                return windowDayAsTimestamp(w) === day.getTime()
              }).filter(w => w.tags.includes(type) || !type )
}

export const dayToStr = (day: Date) => {
    return `${day.getMonth()+1}/${day.getDate()}`
}


export const ONE_HOUR_OF_MS = 60*60*60
export const ONE_MINUTE_OF_MS = 60*60*60

export const windowDayAsTimestamp = (window: TimeWindow) : Timestamp => {
  return timestampDay(window.start)
}

export const windowDay = (window: TimeWindow) : Date => {
  return new Date(timestampDay(window.start))
}

export const timestampDay = (timestamp: Timestamp) : Timestamp => {
  return new Date(timestamp).setHours(0,0,0,0)
}

export const filterTime = (now: number, filter:SessionsFilter, window: TimeWindow): boolean => {
  const windowStart = window.start
  const windowEnd = window.start + window.duration*ONE_MINUTE_OF_MS
  if (!filter.timeNow && !filter.timeToday && !filter.timeNext && !filter.timePast && !filter.timeFuture && filter.timeDays.length==0) {
    if (windowEnd < now) return false
    return true
  }

  const wDay = windowDayAsTimestamp(window)

  if ( filter.timeNow && (windowStart >= now && windowEnd <= now)) return true
  if ( filter.timeToday && (wDay == timestampDay(now))) return true
  if ( filter.timeNext && (windowEnd > now  && (windowEnd + ONE_HOUR_OF_MS) < now )) return true
  if ( filter.timeFuture && (windowStart > now)) return true
  if ( filter.timePast && (windowStart < now)) return true
  if ( filter.timeDays.length > 0) {
    if (filter.timeDays.includes(wDay)) return true
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

export const truncateText = (text, len) => {
  if (text.length <= len) return text
  return `${text.slice(0,len)}...`
}

export const sessionHasTags = (session: InfoSession, tags: string[]) : boolean => {
  let found = false
  for (let tag of tags) {
      tag = tag.toLowerCase()
      if (session.relations.find(ri=>
          ri.relation.content.path == "session.tag" &&
          ri.relation.content.data.toLowerCase() == tag
          )) {
          found = true;
          break;
      }
  }
  return found
}

export const sortSlot = (a:Slot|undefined, b: Slot|undefined) => {
  const valA = a == undefined ? 0 : a.window.start
  const valB = b == undefined ? 0 : b.window.start
  return valA - valB
}

export const errorText = (e) => {
  return e.data ? e.data : e
} 

export const wait = (milliseconds) => {
  return new Promise(resolve => {
      setTimeout(resolve, milliseconds);
  });
}

export const elapsed = (startTime) => {
  const endTime = performance.now();
  var timeDiff = endTime - startTime; //in ms 
  return Math.round(timeDiff);
}


export type WALUrl = string

export const hashEqual = (a:EntryHash, b:EntryHash) : boolean => {
  if (!a || !b) {
    return !a && !b
  }
  for (let i = a.length; -1 < i; i -= 1) {
    if ((a[i] !== b[i])) return false;
  }
  return true;
}

export const getMyDna = async (role:string, client: AppClient) : Promise<DnaHash>  => {
  const appInfo = await client.appInfo();
  const dnaHash = (appInfo.cell_info[role][0] as any)[
    CellType.Provisioned
  ].cell_id[0];
  return dnaHash
} 
