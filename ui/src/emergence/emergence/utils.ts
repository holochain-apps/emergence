import type { TimeWindow } from "./types"

export const calcDays = (windows, slotTypeFilter, dayFilter): Array<Date> => {
    const days = []
    const dayStrings = {}
    
    windows.forEach(w=> {
      if ((!slotTypeFilter || w.tags.includes(slotTypeFilter)) &&
          (!dayFilter || w.start == dayFilter))
       {
        dayStrings[new Date(w.start).toDateString()] = new Date(w.start)
      }
    })
    Object.values(dayStrings).forEach((d:Date)=>days.push(d))
    days.sort((a,b)=> a-b)
    return days
}

// @ts-ignore
export const sortWindows = (a,b) : number => {return new Date(a.start) - new Date(b.start)}

export const windowsInDay = (windows, day, type) : Array<TimeWindow> => {
    return windows.filter(w=>{
                // @ts-ignore
                return new Date(w.start).toDateString()  == day.toDateString()
              }).filter(w => w.tags.includes(type) || !type )
}

export const dayToStr = (day) => {
    return `${day.getMonth()+1}/${day.getDate()}`
  }