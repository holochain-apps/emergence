// import {  } from './types';

import {
    encodeHashToBase64,
    type ActionHash,
    type AgentPubKey,
    decodeHashFromBase64,
    type EntryHash,
} from '@holochain/client';

import type { EmergenceClient } from './emergence-client';

import TimeAgo from "javascript-time-ago"
import en from 'javascript-time-ago/locale/en'
import type { ProfilesStore } from '@holochain-open-dev/profiles';
import { derived, get, writable, type Readable, type Writable } from 'svelte/store';
import { HoloHashMap, type EntryRecord, ActionHashMap } from '@holochain-open-dev/utils';
import { FeedType, type FeedElem, type Info, type Session, type Slot, type Space, type TimeWindow, type UpdateSessionInput, type UpdateSpaceInput, slotEqual, type UpdateNoteInput, type Note, type GetStuffInput, type RawInfo, SessionInterest, type SessionRelationData, type SiteMap, type UpdateSiteMapInput, type SiteLocation, type Coordinates, setCharAt, type SlottedSession, type TagUse, sessionSelfTags, type UIProps, type SessionsFilter, defaultSessionsFilter, defaultFeedFilter, type FeedFilter } from './emergence/emergence/types';
import type { AsyncReadable, AsyncStatus } from '@holochain-open-dev/stores';
import type { FileStorageClient } from '@holochain-open-dev/file-storage';
import { Marked, Renderer } from "@ts-stack/markdown";
import type Feed from './emergence/emergence/Feed.svelte';
Marked.setOptions
({
  renderer: new Renderer,
  gfm: true,
  tables: true,
  breaks: false,
  pedantic: false,
  sanitize: true,
  smartLists: true,
  smartypants: false
});

TimeAgo.addDefaultLocale(en)
const ONE_HOUR = 60*60*60

export const neededStuffStore = (client: EmergenceClient) => {
    const notes = writable(new HoloHashMap<ActionHash, Info<Note>| undefined>())
    const neededStuff: GetStuffInput = {}

    setInterval(async ()=>{
        if(neededStuff.notes ? true : false) {
            const stuff = await client.getStuff(neededStuff)
            if (stuff.notes) {
                notes.update(oldNotes=>{
                    stuff.notes.forEach(n=>{
                    if (n) {
                        oldNotes.set(n.original_hash,n)
                    }
                    })
                    return oldNotes
                })
                neededStuff.notes = undefined
            }
        }}
    , 1000);
    return {
        notes: {
            get: (actionHash:ActionHash) : AsyncReadable<Info<Note>|undefined> =>{
                if (neededStuff.notes) {
                    neededStuff.notes.push(actionHash)
                } else {
                    neededStuff.notes = [actionHash]
                }
                return derived(notes, map=> {
                    const hasAction = map.has(actionHash)
                    if (hasAction) return {
                        status: "complete",
                        value: map.get(actionHash) 
                    } as AsyncStatus<Info<Note>|undefined>
                    return {status: "pending"} as AsyncStatus<Info<Note>|undefined>
                }
            )},
            clear: (actionHashes: Array<ActionHash>)=>{
                console.log("CLEARING", actionHashes)
                notes.update(notes =>{
                     actionHashes.forEach(h=>notes.delete(h))
                     return notes
                    }
                )
            }
        },
    }
}



export class EmergenceStore {
  timeAgo = new TimeAgo('en-US')
  timeWindows: Writable<Array<TimeWindow>> = writable([])
  sessions: Writable<Array<Info<Session>>> = writable([])
  spaces: Writable<Array<Info<Space>>> = writable([])
  notes: Writable<Array<Info<Note>>> = writable([])
  maps: Writable<Array<Info<SiteMap>>> = writable([])
  noteHashes: Writable<Array<ActionHash>> = writable([])
  feed: Writable<Array<FeedElem>> = writable([])
  allTags: Writable<Array<TagUse>> = writable([])
  myNotes: Writable<Array<ActionHash>> = writable([])
  mySessions: Writable<HoloHashMap<ActionHash,SessionInterest>> = writable(new HoloHashMap())
  neededStuff: GetStuffInput = {}
  myPubKeyBase64: string
  loader = undefined
  neededStuffStore = undefined
  uiProps: Writable<UIProps> = writable({
    amSteward: true,
    debuggingEnabled: false,
    youPanel: "sessions",
    discoverPanel: "cloud",
    sessionsFilter: defaultSessionsFilter(),
    feedFilter: defaultFeedFilter(),
    sensing: false,
    sessionDetails: undefined,
    sessionListMode: true,
  })

  setUIprops(props:{}) {
    this.uiProps.update((n) => {
        Object.keys(props).forEach(key=>n[key] = props[key])
        return n
    })
  }

  stuffIsNeeded() {
    return this.neededStuff.notes ? true : false
  }
  
  constructor(public client: EmergenceClient, public profilesStore: ProfilesStore, public fileStorageClient:FileStorageClient, public myPubKey: AgentPubKey) {
    this.loader = setInterval(()=>{if(this.stuffIsNeeded()) this.fetchStuff()}, 1000);
    this.neededStuffStore =  neededStuffStore(client)
    this.myPubKeyBase64 = encodeHashToBase64(myPubKey)
  }
  
  getSessionIdx(sessionHash: ActionHash) : number {
    const b64 = encodeHashToBase64(sessionHash)
    const sessions = get(this.sessions)
    return sessions.findIndex((s)=> encodeHashToBase64(s.original_hash) === b64)
  }

  getSession(sessionHash: ActionHash) : Info<Session> | undefined {
    const sessionIdx = this.getSessionIdx(sessionHash)
    if (sessionIdx == -1) return undefined
    return get(this.sessions)[sessionIdx]
  }

  sessionStore(sessionHash) : Readable<Info<Session>|undefined>{
    return derived(this.sessions, $sessions => $sessions.find(s=>encodeHashToBase64(sessionHash) == encodeHashToBase64(s.original_hash)))
  }

  getSpaceIdx(spaceHash: ActionHash) : number {
    const b64 = encodeHashToBase64(spaceHash)
    const spaces = get(this.spaces)
    return spaces.findIndex((s)=> encodeHashToBase64(s.original_hash) === b64)
  }

  getSpace(spaceHash: ActionHash) : Info<Space> | undefined {
    const spaceIdx = this.getSpaceIdx(spaceHash)
    if (spaceIdx == -1) return undefined
    return get(this.spaces)[spaceIdx]
  }

  getNoteIdx(noteHash: ActionHash) : number {
    const b64 = encodeHashToBase64(noteHash)
    const notes = get(this.notes)
    return notes.findIndex((s)=> encodeHashToBase64(s.original_hash) === b64)
  }

  getNote(noteHash: ActionHash) : Info<Note> | undefined {
    const noteIdx = this.getNoteIdx(noteHash)
    if (noteIdx == -1) return undefined
    return get(this.notes)[noteIdx]
  }

  getSiteMapIdx(mapHash: ActionHash) : number {
    const b64 = encodeHashToBase64(mapHash)
    const maps = get(this.maps)
    return maps.findIndex((s)=> encodeHashToBase64(s.original_hash) === b64)
  }

  getSiteMap(mapHash: ActionHash) : Info<SiteMap> | undefined {
    const mapIdx = this.getSiteMapIdx(mapHash)
    if (mapIdx == -1) return undefined
    return get(this.maps)[mapIdx]
  }

  getCurrentSiteMap() : Info<SiteMap> | undefined {
    const maps = get(this.maps)
    if (maps.length>0) {
      return maps[0]
    }
    return undefined
  }

  getSessionSlot(session: Info<Session>) : Slot|undefined {
    const rels = session.relations.filter(r=>r.relation.content.path == "session.space")
    if (rels.length == 0) return undefined
    rels.sort((a,b)=>b.timestamp - a.timestamp)
    const rel = rels[0]
    const window = JSON.parse(rel.relation.content.data) as TimeWindow
    return {
        space: rel.relation.dst,
        window
    }
  }

  getSpaceSiteLocation(space: Info<Space>) : SiteLocation|undefined {
    const rels = space.relations.filter(r=>r.relation.content.path == "space.location")
    if (rels.length == 0) return undefined
    rels.sort((a,b)=>b.timestamp - a.timestamp)
    const rel = rels[0]
    const location = JSON.parse(rel.relation.content.data) as Coordinates
    return {
        imageHash: rel.relation.dst,
        location
    }
  }

  getSessionReleationData(session: Info<Session>) : SessionRelationData {
    const rel: SessionRelationData = {
        myInterest: SessionInterest.NoOpinion,
        interest: new HoloHashMap(),
        slot: undefined
    }
    const spaces = session.relations.filter(r=>r.relation.content.path === "session.space")
    if (spaces.length > 0) {
      let ri = spaces[spaces.length-1]
      const r = ri.relation
      const window = JSON.parse(r.content.data) as TimeWindow
              rel.slot = {
                  space: r.dst,
                  window
              }
    }

    const interest = session.relations.filter(r=>r.relation.content.path === "session.interest")
    interest.forEach(ri=>{
        const r = ri.relation
        const who = r.dst
        who[1] = 32 //temporary workaround because of linkable hash problem
        const whoB64 = encodeHashToBase64(who)
        const i : SessionInterest = JSON.parse(r.content.data)
        if (whoB64 === this.myPubKeyBase64) {
            rel.myInterest = i
        }
        rel.interest.set(who, i)
    })

    return rel
  }

  sessionReleationDataStore(sessionStore: Readable<Info<Session>>) : Readable<SessionRelationData> {
    return derived(sessionStore, $session=> this.getSessionReleationData($session))
  }

  sessionSlotStore(sessionStore: Readable<Info<Session>>) : Readable<Slot|undefined> {
    return derived(sessionStore, $session=> {
        const spaces = $session.relations.filter(r=>r.relation.content.path == "session.space")
        if (spaces.length > 0) {
          let ri = spaces[spaces.length-1]
          const r = ri.relation
          const window = JSON.parse(r.content.data) as TimeWindow
                  return {
                      space: r.dst,
                      window
                  }
        }
        return undefined
      })
  }

  sessionNoteStore(sessionStore: Readable<Info<Session>>) : Readable<Array<Info<Note>|undefined>> {
    return derived(sessionStore, $session=> {
        return $session.relations.filter(r=>r.relation.content.path == "session.note").map(r=> {
            const note = this.getNote(r.relation.dst)
            if (note) return note
            return undefined
      })})
  }

  getSessionNotes(session: Info<Session>) : Array<Info<Note>> {
    const notes: Array<Info<Note>> = []
    for (const ri of session.relations) {
        const r = ri.relation
        if (r.content.path == "session.note") {
            const note = this.getNote(r.dst)
            if (note) notes.push(note)
        }
    }
    return notes
  }
  

  async slot(session: ActionHash, slot: Slot) {
    const space = this.getSpace(slot.space)
    if (space) {
        await this.client.createRelations([
            {   src: session,
                dst: slot.space,
                content:  {
                    path: "session.space",
                    data: JSON.stringify(slot.window)
                }
            },
            {   src: slot.space,
                dst: session,
                content:  {
                    path: "space.sessions",
                    data: JSON.stringify(slot.window)
                }
            },
            {   src: session, // should be agent key
                dst: session,
                content:  {
                    path: `feed.${FeedType.SlotSession}`,
                    data: JSON.stringify({space:space.record.entry.name, window: slot.window})
                }
            },
        ]
        )
        await this.fetchSessions()
    } else {
        console.log("Couldn't find space", encodeHashToBase64(slot.space))
    }
  }

  async createTimeWindow(start: Date, duration: number, tags: Array<string>) : Promise<ActionHash> {
    const timeWindow: TimeWindow = { 
        start: parseInt((start.getTime()).toFixed(0)),
        duration,
        tags,
      };
    const actionHash = await this.client.createTimeWindow(timeWindow)
    await this.client.createRelations([
        {   src: actionHash, // should be agent key
            dst: actionHash,
            content:  {
                path: `feed.${FeedType.TimeWindowNew}`,
                data: JSON.stringify(timeWindow)
            }
        },
    ])
    this.fetchTimeWindows()
    return actionHash
  }

  async deleteTimeWindow(window: TimeWindow) : Promise<undefined> {
    await this.client.deleteTimeWindow(window)
    return undefined
  }

  async fetchTimeWindows() {
    const timeWindows = await this.client.getTimeWindows()
    this.timeWindows.update((n) => {return timeWindows} )
  }

  getSlotTypeTags(): Array<string> {
    const tags = new Set()
    get(this.timeWindows).forEach(w=> w.tags.forEach(t=>tags.add(t)))
    get(this.spaces).forEach(s=> s.record.entry.tags.forEach(t=>tags.add(t)))
    return Array.from(tags) as Array<string>
  }

  async createSession(title: string, description: string, leaders:Array<AgentPubKey>,  smallest: number, largest: number, duration: number, amenities: number, slot: Slot|undefined, tags: Array<string>): Promise<EntryRecord<Session>> {
    const record = await this.client.createSession(title, amenities, description, leaders, smallest, largest, duration)
    const sessionHash = record.actionHash
    if (slot) {
        await this.slot(sessionHash, slot)
    }
  
    const relations = [
        {   src: sessionHash, // should be agent key
            dst: sessionHash,
            content:  {
                path: `feed.${FeedType.SessionNew}`,
                data: JSON.stringify(title)
            }
        },
    ]
    tags.forEach(tag=>relations.push(
        {   src: sessionHash,
            dst: sessionHash,
            content:  {
                path: "session.tag",
                data: tag
            }
        },        
    ))

    await this.client.createRelations(relations)

    this.fetchSessions()
    return record
  }

  async updateSession(sessionHash: ActionHash, props:any): Promise<EntryRecord<Session>> {
    const sessionIdx = this.getSessionIdx(sessionHash)
    if (sessionIdx >= 0) {
        const session = get(this.sessions)[sessionIdx]
        const sessionEntry = session.record.entry

        const changes = []
        const update: UpdateSessionInput = { 
            original_session_hash: session.original_hash,
            previous_session_hash: session.record.record.signed_action.hashed.hash,
            updated_title: sessionEntry.title,
            updated_description: sessionEntry.description,
            updated_leaders: sessionEntry.leaders,
            updated_smallest: sessionEntry.smallest,
            updated_largest: sessionEntry.largest,
            updated_duration: sessionEntry.duration,
            updated_amenities: sessionEntry.amenities,
            updated_trashed: sessionEntry.trashed,
        };

        if (props.hasOwnProperty("title")) {
            if (sessionEntry.title != props.title) {
                update.updated_title = props.title
                changes.push(`title -> ${props.title}`)
            }
        }
        if (props.hasOwnProperty("description")) {
            if (sessionEntry.description != props.description) {
                update.updated_description = props.description
                changes.push(`description`)
            }
        }
        if (props.hasOwnProperty("leaders")) {

           // if (sessionEntry.leaders != props.leaders) {
                update.updated_leaders = props.leaders
                changes.push(`leaders`)
          //  }
        }
        if (props.hasOwnProperty("smallest")) {
            if (sessionEntry.smallest != props.smallest) {
                update.updated_smallest = props.smallest
                changes.push(`smallest`)
            }
        }
        if (props.hasOwnProperty("largest")) {
            if (sessionEntry.largest != props.largest) {
                update.updated_largest = props.largest
                changes.push(`largest`)
            }
        }
        if (props.hasOwnProperty("duration")) {
            if (sessionEntry.duration != props.duration) {
                update.updated_duration = props.duration
                changes.push(`duration`)
            }
        }
        if (props.hasOwnProperty("amenities")) {
            if (sessionEntry.amenities != props.amenities) {
                update.updated_amenities = props.amenities
                changes.push(`amenities`)
            }
        }
        if (props.hasOwnProperty("trashed")) {
            if (sessionEntry.trashed != props.trashed) {
                update.updated_trashed = props.trashed
                changes.push(`trashed`)
            }
        }
        let doSlot = false
        if (props.hasOwnProperty("slot")) {
            const slot = this.getSessionSlot(session)
            if (!slotEqual(slot, props.slot)) {
                changes.push(`slot`)
                doSlot = true
            }
        }
        const relations = []
        const relationsToDelete = []
        if (props.hasOwnProperty("tags")) {
            const tags = sessionSelfTags(session).sort()
            const updatedTags = props.tags.sort()
            const updatedTagsJSON = JSON.stringify(updatedTags)
            if (JSON.stringify(tags)!=updatedTagsJSON) {
                changes.push(`tags -> ${updatedTagsJSON}`)
                for (const tag of updatedTags) {
                    if (!tags.includes(tag)) { 
                        relations.push({   
                            src: sessionHash,
                            dst: sessionHash,
                            content:  {
                                path: "session.tag",
                                data: tag
                            }
                        })
                    }
                }
                const hashB64 = encodeHashToBase64(session.original_hash)
                for (const tag of tags) {
                    if (!updatedTags.includes(tag)) { 
                        const ri = session.relations.find(ri=>
                            ri.relation.content.path == "session.tag" &&
                            ri.relation.content.data == tag &&
                            encodeHashToBase64(ri.relation.dst) === hashB64
                            )
                        if (ri) {
                            relationsToDelete.push(ri.create_link_hash)
                        }
                    }
                }
            }
        }

        if (changes.length > 0) {
            const record = await this.client.updateSession(update)
            relations.push(
                {   src: record.actionHash, // should be agent key
                    dst: record.actionHash,
                    content:  {
                        path: `feed.${FeedType.SessionUpdate}`,
                        data: JSON.stringify({title: sessionEntry.title, changes})
                    }
                },
            )
            await this.client.createRelations(relations)
            if (relationsToDelete.length>0) {
                await this.client.deleteRelations(relationsToDelete)
            }
            if (doSlot) {
                if (props.slot !== undefined) {
                    await this.slot(session.original_hash, props.slot)
                }
            }

            this.sessions.update((sessions) => {
                sessions[sessionIdx].record = record
                return sessions
            })
            return record
        } else {
            console.log("No changes detected ignoring...")
        }
    } else {
        throw new Error(`could not find session`)
    }
  }

  async deleteSession(sessionHash: ActionHash) {
    const idx = this.getSessionIdx(sessionHash)
    if (idx >= 0) {
        const session = get(this.sessions)[idx]
        await this.client.deleteSession(session.record.actionHash)
        this.sessions.update((sessions) => {
            sessions.splice(idx, 1);
            return sessions
        })
        this.client.createRelations([
            {   src: session.original_hash, // should be agent key
                dst: session.original_hash,
                content:  {
                    path: `feed.${FeedType.SessionDelete}`,
                    data: JSON.stringify(session.record.entry.title)
                }
            },
        ])
    }
  }
  async setSessionInterest(sessionHash: ActionHash, interest: SessionInterest) {

    const me = decodeHashFromBase64(setCharAt(this.myPubKeyBase64,3,'E'))
    await this.client.createRelations([
        {   src: sessionHash,
            dst: me,
            content:  {
                path: "session.interest",
                data: JSON.stringify(interest)
            }
        },
        {   src: sessionHash, // should be agent key
            dst: sessionHash,
            content:  {
                path: `feed.${FeedType.SessionSetInterest}`,
                data: JSON.stringify(interest)
            }
        },
    ])
    this.fetchSessions()
  }

  async fetchSessions() {
    try {
        await this.fetchSpaces()
        const sessions = await this.client.getSessions()
        this.sessions.update((n) => {return sessions} )
        const noteHashes = []
        sessions.forEach(s=> s.record.entry.leaders.forEach(l=> 
            {
                if (encodeHashToBase64(l) == this.myPubKeyBase64){
                    this.mySessions.update((n) => {
                        n.set(s.original_hash,SessionInterest.Interested)
                        return n
                    } )
                }
            }    
        ))
        sessions.forEach(s=>s.relations.filter(r=>r.relation.content.path === "session.space").forEach(r=>noteHashes.push(r.relation.dst)))
        this.noteHashes.update((n) => {return noteHashes} )

    }
    catch (e) {
        console.log("Error fetching sessions", e)
    }
  }

  getSlottedSessions(space: Info<Space>) :Array<SlottedSession> {

    const sessions:  ActionHashMap<SlottedSession> = new ActionHashMap()
    space.relations.forEach(ri => {
      if (ri.relation.content.path == "space.sessions") {
        const session = this.getSession(ri.relation.dst)
        if (session  && !session.record.entry.trashed) {
            const slot = this.getSessionSlot(session)
            if (encodeHashToBase64(slot.space) == encodeHashToBase64(space.original_hash)) {
            const s = sessions.set(session.original_hash, {session,window:JSON.parse(ri.relation.content.data)})
            }
        }
      }
    })
    return Array.from(sessions.values()).sort((a,b)=>a.window.start - b.window.start);
  }

  filterFeedElem(elem:FeedElem, filter: FeedFilter) : boolean {

    if (filter.tags.length > 0) {
        const elemTags: string[] = this.getFeedElementTags(elem)
        for (const tag of filter.tags) {
            if (!elemTags.includes(tag)) return false
        }
    }
    if (filter.author) {
        if (encodeHashToBase64(filter.author) !== encodeHashToBase64(elem.author)) return false
    }
    if (filter.space.length>0) {
        const space = this.getFeedElementSpace(elem)
        if (!space) return false
        const b64 = encodeHashToBase64(space)
        if (!filter.space.find(s=>encodeHashToBase64(s) === b64)) return false
    }
   
    return true
  }
  getFeedElementSpace(elem:FeedElem) : ActionHash|undefined {
    switch(elem.type) {
        case FeedType.SpaceNew: 
        case FeedType.SpaceUpdate: 
            return elem.about
    }
    return undefined
  }

  getFeedElementTags(elem:FeedElem) : string[] {
    switch(elem.type) {
        case FeedType.SessionNew: 
        case FeedType.SessionUpdate: 
            const session = this.getSession(elem.about)
            if (session) {
                return session.relations.filter(ri=>
                    ri.relation.content.path == "session.tag"
                    ).map(ri=>ri.relation.content.data)
            }
            break;
        case FeedType.NoteNew:
        case FeedType.NoteUpdate:

      }
    return []
  }

  filterSession(session:Info<Session>, filter: SessionsFilter) : boolean {
    const slot = this.getSessionSlot(session)
    if (!slot && (filter.timeNow || filter.timeNext || filter.timePast || filter.timeFuture)) return false
    if (slot && filter.timeUnscheduled) return false
    const now = (new Date).getTime()

    if ( filter.timeNow && (now < slot.window.start || now > (slot.window.start + slot.window.duration*60))) return false
    if ( filter.timeNext && (now < (slot.window.start + slot.window.duration*60) || now > (slot.window.start + slot.window.duration*60*60 + ONE_HOUR))) return false
    if ( filter.timeFuture && (now < (slot.window.start + slot.window.duration*60))) return false
    if ( filter.timeFuture && (now >= slot.window.start)) return false

    if (filter.involvementLeading && !session.record.entry.leaders.find(l=>encodeHashToBase64(l) === this.myPubKeyBase64))
        return false
    if (filter.involvementGoing || filter.involvementInterested || filter.involvementNoOpinion) {
        const rel: SessionRelationData = this.getSessionReleationData(session)
        if (filter.involvementGoing  && rel.myInterest != SessionInterest.Going) return false
        if (filter.involvementInterested  && rel.myInterest != SessionInterest.Interested) return false
        if (filter.involvementNoOpinion  && rel.myInterest != SessionInterest.NoOpinion) return false
    }
    for (const tag of filter.tags) {
        const foundTag = session.relations.find(ri=>
            ri.relation.content.path == "session.tag" &&
            ri.relation.content.data == tag
            )
        if (!foundTag) return false
    }
    if (filter.keyword) {
        if (session.record.entry.description.search(filter.keyword) < 0 &&
            session.record.entry.title.search(filter.keyword) < 0)
        return false
    }
    if (filter.space.length>0) {
        if (!slot) return false
        const b64 = encodeHashToBase64(slot.space)
        if (!filter.space.find(s=>encodeHashToBase64(s) === b64)) return false
    }
   
    return true

  }
  
  sessionsInSpace = (window: TimeWindow, space: Info<Space>) : Array<Info<Session>> | undefined => {
    let rel = space.relations.filter(r=>r.relation.content.path == "space.sessions")
    const sessions: HoloHashMap<ActionHash, Info<Session>> = new HoloHashMap
    rel.forEach(r=> {
        const session = this.getSession(r.relation.dst)
        if (session && !session.record.entry.trashed) {
        const slot = this.getSessionSlot(session)
        if (slotEqual({window,space:space.original_hash}, slot)) {
            sessions.set(session.original_hash, session)
        }
        }
    })
    return Array.from(sessions.values())
  }

  async createSpace(key:string, name: string, description: string, stewards:Array<AgentPubKey>, capacity: number, amenities: number, tags: Array<string>, pic: EntryHash | undefined, siteLocation: undefined | SiteLocation): Promise<EntryRecord<Space>> {
    const record = await this.client.createSpace(key, name, description, stewards, capacity, amenities, tags, pic)
    const relations = [
        {   src: record.actionHash, // should be agent key
            dst: record.actionHash,
            content:  {
                path: `feed.${FeedType.SpaceNew}`,
                data: JSON.stringify(name)
            }
        },
    ]
    if (siteLocation) {
        relations.push({   
            src: record.actionHash,
            dst: siteLocation.imageHash,
            content:  {
                path: `space.location`,
                data: JSON.stringify(siteLocation.location)
            }
        })
    }
    await this.client.createRelations(relations)
    this.fetchSpaces()
    return record
  }

  async updateSpace(spaceHash: ActionHash, props:any): Promise<EntryRecord<Space>> {
    const idx = this.getSpaceIdx(spaceHash)
    if (idx >= 0) {
        const space = get(this.spaces)[idx]
        const spaceEntry = space.record.entry

        let changes = []
        const update: UpdateSpaceInput = {
            original_space_hash: spaceHash,
            previous_space_hash: space.record.actionHash,
            updated_space: {
                key:spaceEntry.key,
                name:spaceEntry.name,
                description: spaceEntry.description,
                stewards: spaceEntry.stewards,
                amenities: spaceEntry.amenities,
                capacity: spaceEntry.capacity,
                trashed: spaceEntry.trashed,
                tags: spaceEntry.tags,
            }
        }
        if (props.hasOwnProperty("key")) {
            if (spaceEntry.key != props.key) {
                update.updated_space.key = props.key
                changes.push(`key -> ${props.key}`)
            }
        }
        if (props.hasOwnProperty("name")) {
            if (spaceEntry.name != props.name) {
                update.updated_space.name = props.name
                changes.push(`name -> ${props.name}`)
            }
        }
        if (props.hasOwnProperty("description")) {
            if (spaceEntry.description != props.description) {
                update.updated_space.description = props.description
                changes.push(`description -> ${props.description}`)
            }
        }
        if (props.hasOwnProperty("stewards")) {
           // if (spaceEntry.stewards != props.stewards) {
                update.updated_space.stewards = props.stewards
                changes.push(`stewards`)
           // }
        }
        if (props.hasOwnProperty("amenities")) {
            if (spaceEntry.amenities != props.amenities) {
                update.updated_space.amenities = props.amenities
                changes.push(`amenities -> ${props.amenities}`)
            }
        }
        if (props.hasOwnProperty("tags")) {
            if (spaceEntry.tags != props.tags) {
                update.updated_space.tags = props.tags
                changes.push(`tags -> ${props.tags}`)
            }
        }
        if (props.hasOwnProperty("capacity")) {
            if (spaceEntry.capacity != props.capacity) {
                update.updated_space.capacity = props.capacity
                changes.push(`capacity -> ${props.capacity}`)
            }
        }
        if (props.hasOwnProperty("trashed")) {
            if (spaceEntry.trashed != props.trashed) {
                update.updated_space.trashed = props.trashed
                changes.push(`trashed -> ${props.trashed}`)
            }
        }
        if (props.hasOwnProperty("pic")) {
            if (spaceEntry.pic != props.pic) {
                update.updated_space.pic = props.pic
                changes.push(`pic`)
            }
        }
        let location :SiteLocation | undefined;
        if (props.hasOwnProperty("location")) {
            const currentSiteLocation = this.getSpaceSiteLocation(space)

            if (JSON.stringify(currentSiteLocation) !== JSON.stringify(props.location)) {
                changes.push(`site`)
                location = props.location
            }
        }
        if (changes.length > 0) {
            const record = await this.client.updateSpace(update)
            const relations = [
                {   src: record.actionHash, // should be agent key
                    dst: record.actionHash,
                    content:  {
                        path: `feed.${FeedType.SpaceUpdate}`,
                        data: JSON.stringify({name: spaceEntry.name, changes})
                    }
                },
            ]
            if (location) {
                relations.push({   
                    src: space.original_hash,
                    dst: location.imageHash,
                    content:  {
                        path: `space.location`,
                        data: JSON.stringify(location.location)
                    }
                })
            }
            this.client.createRelations(relations)
            if (location) {
                // FIXME we could get more sophisticated and fiture out out to update the state
                // without calling fetch spaces.  i.e. at least only fetch one space!!
                // but preferably be able to do so with what's returned by create relations.
                this.fetchSpaces()
            } else {
                this.spaces.update((spaces) => {
                    spaces[idx].record = record
                    return spaces
                })
            }
            return record
        }
        else {
            console.log("No changes detected ignoring...")
        }
    } else {
        throw new Error(`could not find space`)
    }
  }

  async deleteSpace(spaceHash: ActionHash) {
    const idx = this.getSpaceIdx(spaceHash)
    if (idx >= 0) {
        const space = get(this.spaces)[idx]
        await this.client.deleteSpace(space.record.actionHash)
        this.spaces.update((spaces) => {
            spaces.splice(idx, 1);
            return spaces
        })
        this.client.createRelations([
            {   src: space.original_hash, // should be agent key
                dst: space.original_hash,
                content:  {
                    path: `feed.${FeedType.SpaceDelete}`,
                    data: JSON.stringify(space.record.entry.name)
                }
            },
        ])
    }
  }

  async createNote(sessionHash: ActionHash, text: string, tags: Array<string>, pic: EntryHash | undefined): Promise<EntryRecord<Note>> {
    const record = await this.client.createNote(text, sessionHash, tags, pic)
    const relations = [
        {   src: sessionHash,
            dst: record.actionHash,
            content:  {
                path: "session.note",
                data: ""
            }
        },
        {   src: record.actionHash, // should be agent key
            dst: record.actionHash,
            content:  {
                path: `feed.${FeedType.NoteNew}`,
                data: JSON.stringify("")
            }
        },
    ]
    tags.forEach(tag=>relations.push(
        {   src: sessionHash,
            dst: record.actionHash,
            content:  {
                path: "session.tag",
                data: tag
            }
        },        
    ))
    await this.client.createRelations(relations)
    this.needNote(record.actionHash)
    this.fetchSessions()
    return record
  }

  async updateNote(noteHash: ActionHash, text: string, tags: Array<string>, pic: EntryHash | undefined): Promise<EntryRecord<Note>> {
    const anote = get(this.neededStuffStore.notes.get(noteHash))
    // @ts-ignore
    if (anote.status == "complete") {
        // @ts-ignore
        const note = anote.value
        const updatedNote: UpdateNoteInput = {
            original_note_hash: noteHash,
            previous_note_hash: note.record.actionHash,
            updated_note: {
                text,
                session: note.record.entry.session,
                tags,
                trashed: false,
                pic,
            }
        }
        const noteEntry = note.record.entry
        let changes = []
        if (noteEntry.text != text) {
            changes.push(`text`)
        }
        if (noteEntry.pic != pic) {
            changes.push(`pic`)
        }
        if (JSON.stringify(noteEntry.tags.sort()) != JSON.stringify(tags.sort())) {
            changes.push(`tags`)
        }
        if (changes.length > 0) {
            const record = await this.client.updateNote(updatedNote)
            this.client.createRelations([
                {   src: record.actionHash, // should be agent key
                    dst: record.actionHash,
                    content:  {
                        path: `feed.${FeedType.NoteUpdate}`,
                        data: JSON.stringify("")
                    }
                },
            ])
            return record
        }
        else {
            console.log("No changes detected ignoring...")
        }
    } else {
        throw new Error(`could not find note`)
    }
  }

  async deleteNote(noteHash: ActionHash) {
    const anote = get(this.neededStuffStore.notes.get(noteHash))
    // @ts-ignore
    if (anote.status == "complete") {
        // @ts-ignore
        const note = anote.value

        const updatedNote: UpdateNoteInput = {
            original_note_hash: noteHash,
            previous_note_hash: note.record.actionHash,
            updated_note: {
                text: note.record.entry.text,
                session: note.record.entry.session,
                tags: note.record.entry.tags,
                trashed: !note.record.entry.trashed,
            }
        }
        const record = await this.client.updateNote(updatedNote)
        this.neededStuffStore.notes.clear([noteHash])
        const session = this.getSession(note.record.entry.session)
        if (session) {
            const hashB64 = encodeHashToBase64(noteHash)
            const relations = session.relations.filter(ri=>
                ri.relation.content.path === "session.note" &&
                encodeHashToBase64(ri.relation.dst) == hashB64
                ).map(ri=>ri.create_link_hash)
            await this.client.deleteRelations(relations)
            this.fetchSessions()
        }
        this.client.createRelations([
            {   src: record.actionHash, // should be agent key
                dst: record.actionHash,
                content:  {
                    path: `feed.${FeedType.NoteDelete}`,
                    data: JSON.stringify("")
                }
            },
        ])
    }
  }

  async createSiteMap(text: string, pic: EntryHash): Promise<EntryRecord<SiteMap>> {
    const record = await this.client.createSiteMap(text, pic)
    const relations = [
        {   src: record.actionHash, // should be agent key
            dst: record.actionHash,
            content:  {
                path: `feed.${FeedType.SiteMapNew}`,
                data: JSON.stringify("")
            }
        },
    ]
    await this.client.createRelations(relations)
    this.fetchSiteMaps()
    return record
  }

  async updateSiteMap(mapHash: ActionHash, text: string, pic: EntryHash): Promise<EntryRecord<SiteMap>> {
    const idx = this.getSiteMapIdx(mapHash)
    if (idx >= 0) {
        const map = get(this.maps)[idx]

        const updatedSiteMap: UpdateSiteMapInput = {
            original_map_hash: mapHash,
            previous_map_hash: map.record.actionHash,
            updated_map: {
                text,
                pic,
            }
        }
        const mapEntry = map.record.entry
        let changes = []
        if (mapEntry.text != text) {
            changes.push(`text`)
        }
        if (mapEntry.pic != pic) {
            changes.push(`pic`)
        }
        if (changes.length > 0) {
            const record = await this.client.updateSiteMap(updatedSiteMap)
            this.client.createRelations([
                {   src: record.actionHash, // should be agent key
                    dst: record.actionHash,
                    content:  {
                        path: `feed.${FeedType.SiteMapUpdate}`,
                        data: JSON.stringify({changes})
                    }
                },
            ])
            this.maps.update((maps) => {
                maps[idx].record = record
                return maps
            })
            return record
        }
        else {
            console.log("No changes detected ignoring...")
        }
    } else {
        throw new Error(`could not find map`)
    }
  }

  async deleteSiteMap(mapHash: ActionHash) {
    const idx = this.getSiteMapIdx(mapHash)
    if (idx >= 0) {
        const map = get(this.maps)[idx]
        await this.client.deleteSiteMap(map.record.actionHash)
        this.maps.update((maps) => {
            maps.splice(idx, 1);
            return maps
        })
        this.client.createRelations([
            {   src: map.original_hash, // should be agent key
                dst: map.original_hash,
                content:  {
                    path: `feed.${FeedType.SiteMapDelete}`,
                    data: JSON.stringify("")
                }
            },
        ])
    }
  }

  async fetchSiteMaps() {
    try {
        const maps = await this.client.getSiteMaps()
        this.maps.update((n) => {return maps} )
    }
    catch (e) {
        console.log("Error fetching sitemaps", e)
    }
  }

  async fetchStuff() {
    let stuff = await this.client.getStuff(this.neededStuff)
    if (stuff.notes) {
        stuff.notes.map(note=>{
            const idx = this.getNoteIdx(note.original_hash)
            if (idx >= 0) {
                this.notes.update((notes) => {
                    notes.splice(idx, 1);
                    return notes
                })
            } else {
                this.notes.update((notes) => {
                    notes.push(note);
                    return notes
                })

            }
        })
        this.neededStuff.notes = undefined
    }
  }

  needNote(hash:ActionHash) {
    if (this.neededStuff.notes) {
        this.neededStuff.notes.push(hash)
    } else {
        this.neededStuff.notes = [hash]
    }
  }

  async fetchSpaces() {
    try {
        const spaces = await this.client.getSpaces()
        this.spaces.update((n) => {return spaces} )
        await this.fetchTimeWindows()
    }
    catch (e) {
        console.log("Error fetching spaces", e)
    }
  }

  async fetchMyStuff() {
    try {
        const feed = await this.client.getFeed(this.myPubKey)
        this.myNotes.update((n) => {
            return feed.filter(f=>f.type == FeedType.NoteNew ).map(f=>f.about)
        } )
        this.mySessions.update((n) => {
            feed.forEach(f=>{
                if (f.type == FeedType.SessionSetInterest  && f.detail != SessionInterest.NoOpinion) {
                    n.set(f.about,f.detail)
                }
                if (f.type == FeedType.SessionSetInterest  && f.detail == SessionInterest.NoOpinion) {
                    n.delete(f.about)
                }
            }
            )
            return n
        } )
    }
    catch (e) {
        console.log("Error fetching my stuff", e)
    }
  }


  async fetchFeed() {
    try {
        const feed = await this.client.getFeed(undefined)
        this.feed.update((n) => {return feed} )

    }
    catch (e) {
        console.log("Error fetching feed", e)
    }
  }

  async fetchTags() {
    try {
        const tags = await this.client.getTags()
        this.allTags.update((n) => {return tags} )
    }
    catch (e) {
        console.log("Error fetching tags", e)
    }
  }
  async sync() {
    await this.fetchTags()
    await this.fetchSessions() // fetches spaces and timewindows
    await this.fetchMyStuff()
    await this.fetchSiteMaps()
  }

}
