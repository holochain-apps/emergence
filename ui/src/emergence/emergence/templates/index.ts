import workshop1day from './workshop-1day.json';
import unconference2day from './unconference-2day.json';
import type { Amenity, SessionType } from '../types';

export interface TemplateWindow {
  dayOffset: number;
  hour: number;
  minute: number;
  duration: number;
  tags: string[];
}

export interface TemplateMapEntry {
  text: string;
  tags: string[];
  pic_hash: string;
  pic_data: string;
  pic_file: {
    name: string;
    size: number;
    file_type: string;
    last_modified: number;
  };
}

export interface TemplateMap {
  original_hash: string;
  entry: TemplateMapEntry;
  relations: any[];
}

export interface Template {
  id: string;
  name: string;
  description: string;
  maps: TemplateMap[];
  windows: TemplateWindow[];
  sessionTypes?: SessionType[];
  amenities?: Amenity[];
}

export const templates: Template[] = [workshop1day, unconference2day] as Template[];

export function computeWindowTimestamps(template: Template, startDate: Date) {
  return {
    ...template,
    windows: template.windows.map(w => {
      const windowStart = new Date(startDate);
      windowStart.setDate(windowStart.getDate() + w.dayOffset);
      windowStart.setHours(w.hour, w.minute, 0, 0);
      return { start: windowStart.getTime(), duration: w.duration, tags: w.tags };
    })
  };
}
