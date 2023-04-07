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
}

export interface Space { 
  name: string;

  description: string;
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