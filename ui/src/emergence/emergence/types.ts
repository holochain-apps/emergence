import type { EntryRecord } from '@holochain-open-dev/utils';
import type { 
  Record, 
  ActionHash,
  DnaHash,
  SignedActionHashed,
  EntryHash, 
  AgentPubKey,
  Create,
  Update,
  Delete,
  CreateLink,
  DeleteLink,
  Timestamp,
  HoloHash
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
  amenities: number;
}

export interface SessionPlus {
  original_session_hash: ActionHash,
  session: EntryRecord<Session>,
  relations: Array<Relation>,
}

export interface UpdateSessionInput {
  original_session_hash: ActionHash,
  previous_session_hash: ActionHash,
  updated_title: String,
  updated_amenities: number,
}

export interface Space { 
  name: string;
  description: string;
  amenities: number;
}


export interface UpdateSpaceInput {
  original_space_hash: ActionHash,
  previous_space_hash: ActionHash,
  updated_space: Space,
}


export interface Slot {
  space: ActionHash
  window: TimeWindow
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
  return window.length >=60 ? `${window.length/60} hour${window.length>60?'s':''}` : `${window.length} minutes`
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

export enum FeedType {
   SessionNew = 1,
   SessionUpdate,
   SpaceNew,
   SpaceUpdate,
   SlotSession,
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
    case FeedType.SpaceNew: return "New Space"
    case FeedType.SpaceUpdate: return "Update Space"
    case FeedType.SlotSession: return "Scheduled Session"
  }
}