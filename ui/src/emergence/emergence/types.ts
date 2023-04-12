import type { EntryRecord } from '@holochain-open-dev/utils';
import { 
  type Record, 
  type ActionHash,
  type DnaHash,
  type SignedActionHashed,
  type EntryHash, 
  type AgentPubKey,
  type Create,
  type Update,
  type Delete,
  type CreateLink,
  type DeleteLink,
  type Timestamp,
  type HoloHash,
  encodeHashToBase64
} from '@holochain/client';

export type EmergenceSignal = {
  type: 'EntryCreated';
  action: SignedActionHashed<Create>;
  app_entry: EntryTypes;
} | {
  type: 'EntryUpdated';
  action: SignedActionHashed<Update>;
  app_entry: EntryTypes;
  original_app_entry: EntryTypes;
} | {
  type: 'EntryDeleted';
  action: SignedActionHashed<Delete>;
  original_app_entry: EntryTypes;
} | {
  type: 'LinkCreated';
  action: SignedActionHashed<CreateLink>;
  link_type: string;
} | {
  type: 'LinkDeleted';
  action: SignedActionHashed<DeleteLink>;
  link_type: string;
};

export type EntryTypes =
 | ({ type: 'Space'; } & Space)
 | ({  type: 'Session'; } & Session);


export interface Session { 
  key: string;
  title: string;
  description: string;
  leaders: Array<AgentPubKey>,
  smallest: number;
  largest: number;
  duration: number;
  amenities: number;
}

export interface Info<T> {
  original_hash: ActionHash,
  record: EntryRecord<T>,
  relations: Array<Relation>,
}

export interface RawInfo {
  original_hash: ActionHash,
  record: Record,
  relations: Array<Relation>,
}


export interface UpdateSessionInput {
  original_session_hash: ActionHash,
  previous_session_hash: ActionHash,
  updated_title: string,
  updated_description: string;
  updated_leaders: Array<AgentPubKey>,
  updated_smallest: number;
  updated_largest: number;
  updated_duration: number;
  updated_amenities: number,
}

export interface Space { 
  name: string;
  description: string;
  capacity: number;
  amenities: number;
}


export interface UpdateSpaceInput {
  original_space_hash: ActionHash,
  previous_space_hash: ActionHash,
  updated_space: Space,
}

export interface Note {
  text: string,
}


export interface UpdateNoteInput {
  original_note_hash: ActionHash,
  previous_note_hash: ActionHash,
  updated_note: Note,
}


export interface Slot {
  space: ActionHash
  window: TimeWindow
}

export const slotEqual = (slota: Slot| undefined, slotb: Slot|undefined) : boolean => {
  if (slota === undefined && slotb !== undefined) return false
  if (slotb === undefined && slota !== undefined) return false
  if (slota === undefined && slotb === undefined) return true
  return encodeHashToBase64(slota.space) === encodeHashToBase64(slotb.space)  &&
    JSON.stringify(slota.window) === JSON.stringify(slotb.window)
}

export interface TimeWindow { 
  start: Timestamp;
  length: number;
}

export const timeWindowStartToStr = (window: TimeWindow) : string => {
  const start = new Date(window.start)
  return `${start.toDateString()} @ ${start.toTimeString().slice(0,5)}`
}

export const timeWindowDurationToStr = (window: TimeWindow) : string => {
  return durationToStr(window.length)
}

export const durationToStr = (duration: number) : string => {
  return duration >=60 ? `${duration/60} hour${duration>60?'s':''}` : `${duration} minutes`
}

export interface RelationContent {
  path: string
  data: string
}

export interface Relation {
    src: HoloHash,
    dst: HoloHash,
    content: RelationContent,
}

export const Amenities = [
  "Electricty",
  "Whiteboard",
  "Screen/Proj",
  "Seating",
  "Wifi",
  "Indoor",
  "Outdoor",]

export const amenitiesList = (bits: number) : Array<string> => {
  const a = []
  for (let  i=0; i<32; i+=1) {
    if (bits & 1) a.push(Amenities[i])
    bits = bits >> 1
  }
  return a
}

export const setAmenity = (amenities:number, i:number, value:boolean) : number => {
  if (value) {
    amenities |= 1 << i
  } else {
    amenities &= ~(1 << i)
  }
  return amenities
}

export enum FeedType {
   SessionNew = 1,
   SessionUpdate,
   SessionDelete,
   SpaceNew,
   SpaceUpdate,
   SpaceDelete,
   SlotSession,
   NoteNew,
   NoteUpdate,
   NoteDelete,
}

export interface FeedElem {
  author: AgentPubKey,
  about: ActionHash,
  type: FeedType,
  detail: any,
}

export const getTypeName = (type: FeedType) : string  => {
  switch(type) {
    case FeedType.SessionNew: return "New Session"
    case FeedType.SessionUpdate: return "Update Session"
    case FeedType.SessionDelete: return "Delete Session"
    case FeedType.SpaceNew: return "New Space"
    case FeedType.SpaceUpdate: return "Update Space"
    case FeedType.SpaceDelete: return "Delete Space"
    case FeedType.NoteNew: return "New Note"
    case FeedType.NoteUpdate: return "Update Note"
    case FeedType.NoteDelete: return "Delete Note"
    case FeedType.SlotSession: return "Scheduled Session"
  }
  return "Unknown feed type"
}

export interface GetStuffInput {
  sessions?: Array<ActionHash>,
  spaces?: Array<ActionHash>,
  notes?: Array<ActionHash>,
}

export interface GetStuffOutput {
  sessions?: Array<Info<Session>|undefined>,
  spaces?: Array<Info<Space>|undefined>,
  notes?: Array<Info<Note>|undefined>,
}