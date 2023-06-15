import type { EntryRecord, HoloHashMap } from '@holochain-open-dev/utils';
import { 
  type Record, 
  type ActionHash,
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
  encodeHashToBase64,
  decodeHashFromBase64
} from '@holochain/client';


export const NULL_HASHB64 = "uhCkk______________________"
export const NULL_HASH = decodeHashFromBase64(NULL_HASHB64)

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
| ({ type: 'Map'; } & SiteMap)
| ({ type: 'Note'; } & Note)
| ({  type: 'Session'; } & Session);

// export type AnyAgent = 
// EntryHash | AgentPubKey

export type AnyAgent = 
{type: 'ProxyAgent', hash: ActionHash} |
{type: 'Agent', hash: AgentPubKey}

export type AnyAgentDetailed = 
{type: 'ProxyAgent', hash: ActionHash, bio:string, location: string, nickname: string, avatarImage: EntryHash} |
{type: 'Agent', hash: AgentPubKey, bio:string, location: string, nickname: string}

export type SessionTypeID = number
export type SessionType  = {
  name: string,
  color: string,
  can_rsvp: boolean,
  can_any_time: boolean,
  can_leaderless: boolean
}

export interface Session { 
  key: string;
  session_type: SessionTypeID,
  title: string;
  description: string;
  leaders: Array<AnyAgent>,
  smallest: number;
  largest: number;
  duration: number;
  amenities: number;
  trashed: boolean;
}
// export interface SessionRust { 
//   key: string;
//   title: string;
//   description: string;
//   leaders: Array<AnyAgentRust>,
//   smallest: number;
//   largest: number;
//   duration: number;
//   amenities: number;
//   trashed: boolean;
// }

export interface Info<T> {
  original_hash: ActionHash,
  record: EntryRecord<T>,
  relations: Array<RelationInfo>,
}

export interface RawInfo {
  original_hash: ActionHash,
  record: Record,
  relations: Array<RelationInfo>,
}


export interface UpdateSessionInput {
  original_session_hash: ActionHash,
  previous_session_hash: ActionHash,
  updated_type: SessionTypeID,
  updated_title: string,
  updated_description: string;
  updated_leaders: Array<AnyAgent>,
  updated_smallest: number;
  updated_largest: number;
  updated_duration: number;
  updated_amenities: number,
  updated_trashed: boolean,
}

export interface Space {
  key: string,
  name: string;
  description: string;
  stewards: Array<AgentPubKey>;
  capacity: number;
  amenities: number;
  trashed: boolean;
  pic?: EntryHash;
  tags: Array<string>;
}


export interface UpdateSpaceInput {
  original_space_hash: ActionHash,
  previous_space_hash: ActionHash,
  updated_space: Space,
}

export interface Note {
  text: string,
  session: ActionHash,
  pic?: EntryHash,
  tags: Array<string>,
  trashed: boolean,
}

export interface UpdateNoteInput {
  original_note_hash: ActionHash,
  previous_note_hash: ActionHash,
  updated_note: Note,
}

export interface SiteMap {
  text: string,
  pic: EntryHash,
  tags: Array<string>,
}

export interface ProxyAgent {
  nickname: string,
  bio: string,
  location: string,
  pic?: EntryHash,
}

export interface UpdateProxyAgentInput {
  original_hash: ActionHash,
  previous_hash: ActionHash,
  updated_proxy_agent: ProxyAgent,
}


export interface UpdateSiteMapInput {
  original_map_hash: ActionHash,
  previous_map_hash: ActionHash,
  updated_map: SiteMap,
}

export type Slot = {
  space?: ActionHash
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
  duration: number;
  tags: Array<string>;
}

export const timeWindowStartToStr = (window: TimeWindow) : string => {
  const start = new Date(window.start)
  return `${start.toDateString()} @ ${start.toTimeString().slice(0,5)}`
}

export const timeWindowDurationToStr = (window: TimeWindow) : string => {
  return durationToStr(window.duration)
}

export const durationToStr = (duration: number) : string => {
  return duration >=60 ? `${duration/60} hour${duration>60?'s':''}` : `${duration} minutes`
}

export const timestampToStr = (timestamp: Timestamp) : string => {
    const d = new Date(timestamp)
    return `${d.toDateString()} @ ${d.toTimeString().slice(0,5)}`
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

export interface RelationInfo {
  create_link_hash: ActionHash,
  author: AgentPubKey,
  timestamp: Timestamp,
  relation: Relation,
}

export const sessionInterestToString = (interest: SessionInterest) => {
  let interests = []
  if (interest & SessionInterestBit.Interested) interests.push("Interested")
  if (interest & SessionInterestBit.Going) interests.push("Going")
  if (interest & SessionInterestBit.Hidden) interests.push("Hidden")
  if (interests.length == 0) interests.push("No Opinion")
  return interests.join(", ")
}

export type SessionInterest = number

export const SessionInterestDefault = 0

export enum SessionInterestBit {
  NoOpinion = 0,
  Interested = 1,
  Going = 2,
  Hidden = 4,
}

export const setInterestBit = (interest:SessionInterest, i:SessionInterestBit, value:boolean) : SessionInterest => {
  if (value) {
    interest |= 1 << i
  } else {
    interest &= ~(1 << i)
  }
  return interest
}

export const Amenities = [
  "Electricity",
  "Whiteboard",
  "Table",
  "Screen",
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

export interface SessionRelationData {
  myInterest: SessionInterest
  interest: HoloHashMap<AgentPubKey,SessionInterest>,
  slot: undefined | Slot
}

export interface GetFeedInput {
  agent_filter?: AgentPubKey
}

export enum FeedType {
   SetSettings = 0,
   SessionNew,
   SessionUpdate,
   SessionDelete,
   SessionSetInterest,
   SpaceNew,
   SpaceUpdate,
   SpaceDelete,
   SlotSession,
   NoteNew,
   NoteUpdate,
   NoteDelete,
   SiteMapNew,
   SiteMapUpdate,
   SiteMapDelete,
   TimeWindowNew,
   Sense,
   ProxyAgentNew,
   ProxyAgentUpdate,
   ProxyAgentDelete,
}

export interface FeedElem {
  timestamp: Timestamp,
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
    case FeedType.SessionSetInterest: return "Set Session Interest"
    case FeedType.SpaceNew: return "New Space"
    case FeedType.SpaceUpdate: return "Update Space"
    case FeedType.SpaceDelete: return "Delete Space"
    case FeedType.NoteNew: return "New Note"
    case FeedType.NoteUpdate: return "Update Note"
    case FeedType.NoteDelete: return "Delete Note"
    case FeedType.SiteMapNew: return "New SiteMap"
    case FeedType.SiteMapUpdate: return "Update SiteMap"
    case FeedType.SiteMapDelete: return "Delete SiteMap"
    case FeedType.SlotSession: return "Scheduled Session"
    case FeedType.TimeWindowNew: return "New Slot"
    case FeedType.Sense: return "Sense Added"
    case FeedType.SetSettings: return "Global State Set"
    case FeedType.ProxyAgentNew: return "New Proxy Agent"
    case FeedType.ProxyAgentUpdate: return "Update Proxy Agent"
    case FeedType.ProxyAgentDelete: return "Delete Proxy Agent"
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

export interface Coordinates {
  x: number,
  y: number,
}

export interface SiteLocation {
  imageHash: ActionHash,
  location: Coordinates
}



export function setCharAt(str:string,index:number,chr:string) {
  if(index > str.length-1) return str;
  return str.substring(0,index) + chr + str.substring(index+1);
}

export interface SlottedSession {
  session: Info<Session>,
  window: TimeWindow,
}


export interface SessionAgent {
  agent: AgentPubKey,
  session: ActionHash,
}
export interface TagUse {
  tag: string,
  session_agents: Array<SessionAgent>,
}

export const sessionNotes = (session: Info<Session>):Array<ActionHash> => {
  return session.relations.filter(r=>r.relation.content.path == "session.note").map(r=> r.relation.dst)
}

export const sessionTags = (session: Info<Session>):Array<string> => {
  const tagsMap = {}
  session.relations.filter(r=>r.relation.content.path == "session.tag").forEach(r=> tagsMap[r.relation.content.data] = tagsMap[r.relation.content.data] ? tagsMap[r.relation.content.data] += 1 : 1)
  const tags = Object.keys(tagsMap)
  return tags.sort((a,b)=>tagsMap[a]-tagsMap[b])
}

export const sessionSelfTags = (session: Info<Session>):Array<string> => {
  const hashB64 = encodeHashToBase64(session.original_hash)
  return session.relations.filter(r=>r.relation.content.path == "session.tag"  && 
    encodeHashToBase64(r.relation.dst) === hashB64
  )
  .map(r=> r.relation.content.data)
}

export const dedupHashes = (hashes: Array<HoloHash>) : Array<HoloHash> => {
  return [ ... new Set(hashes.map(s=>encodeHashToBase64(s)))].map(s=>decodeHashFromBase64(s))
}

export enum SessionSortOrder {
  Ascending = 0,
  Descending
}

export enum SpaceSortOrder {
  Key = "key",
  Capacity = "cap"
}

export interface UIProps {
  amSteward: boolean
  debuggingEnabled: boolean
  youPanel: string
  discoverPanel: string
  sessionsFilter: SessionsFilter
  feedFilter: FeedFilter
  peopleFilter: PeopleFilter
  detailsStack: Array<Details>,
  sessionListMode: string,
  pane:string,
  sessionSort: SessionSortOrder,
  spaceSort: SpaceSortOrder,
  confirmHide: boolean,
  searchVisible: boolean,
}

export enum SessionListMode {
  List = "",
  ListDetail = "detail",
  GridTime = "grid-time",
  GridSpace = "grid-space",
}


export enum DetailsType {
  Session = 0,
  Space,
  Folk,
  ProxyAgent,
}

export interface Details {
  type: DetailsType
  hash: ActionHash
}

export interface PeopleFilter {
  keyword: string,
}

export const defaultPeopleFilter = () : PeopleFilter => {
  return {
    keyword: "",
  }
}


export interface FeedFilter {
  tags: Array<string>,
  space: Array<ActionHash>,
  sessions: Array<ActionHash>,
  author: AgentPubKey | undefined
  keyword: string,
}

export const defaultFeedFilter = () : FeedFilter => {
  return {
    tags: [],
    sessions: [],
    space: [],
    author: undefined,
    keyword: "",
  }
}

export interface SessionsFilter {
  timeNow: boolean,
  timeToday: boolean,
  timeNext: boolean,
  timePast: boolean,
  timeFuture: boolean,
  timeDays: Array<number>,
  timeUnscheduled: boolean,
  involvementLeading: boolean,
  involvementGoing: boolean,
  involvementInterested: boolean,
  involvementNoOpinion: boolean,
  involvementHidden: boolean,
  tags: Array<string>,
  space: Array<ActionHash>,
  keyword: string,
  types: number
}

export const defaultSessionsFilter = () : SessionsFilter => {
  return {
    timeNow: false,
    timeToday: false,
    timeNext: false,
    timePast: false,
    timeFuture: false,
    timeUnscheduled: false,
    timeDays: [],
    involvementLeading: false,
    involvementGoing: false,
    involvementInterested: false,
    involvementHidden: false,
    involvementNoOpinion: false,
    tags: [],
    space: [],
    keyword: "",
    types: 0,
  }
}


export interface Settings {
  game_active: boolean,
  current_sitemap?: ActionHash,
  session_types: Array<SessionType>,
}

export interface InterestData {
  session:Info<Session>, 
  estimatedAttendance:number,
  percentInterest:number,
  assesments:number,
  passCount:number,
  goingCount:number,
  bookmarkedCount:number,
}

export interface Projection {
  totalAssesments: number,
  peopleCount: number,
  likelyCount: number,
  maxAttendance: number,
  minAttendance: number,
  interestData: Array<InterestData>
}


export interface DownloadedFile {
  file: File,
  data?: string,
}

export interface PersonData {
  type: string, 
  hash: ActionHash, 
  nickname: string,
  bio: string,
  location: string
  avatarImage: EntryHash,
}
