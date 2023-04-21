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
import { HoloHashMap, type EntryRecord } from '@holochain-open-dev/utils';
import { FeedType, type FeedElem, type Info, type Session, type Slot, type Space, type TimeWindow, type UpdateSessionInput, type UpdateSpaceInput, slotEqual, type UpdateNoteInput, type Note, type GetStuffInput, type RawInfo, SessionInterest, type SessionRelationData } from './emergence/emergence/types';
import type { AsyncReadable, AsyncStatus } from '@holochain-open-dev/stores';

TimeAgo.addDefaultLocale(en)

export const neededStuffStore = (client: EmergenceClient) => {
    const notes = writable(new HoloHashMap<ActionHash, Info<Note>| undefined>())
    const neededStuff: GetStuffInput = {}

    setInterval(async ()=>{
        if(neededStuff.notes ? true : false) {
        const stuff = await client.getStuff(neededStuff)
        if (stuff.notes) {
            notes.update(oldNotes=>{
                stuff.notes.forEach(n=>{
                    
                   oldNotes.set(n.original_hash,n)
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
  noteHashes: Writable<Array<ActionHash>> = writable([])
  feed: Writable<Array<FeedElem>> = writable([])
  allTags: Writable<Array<string>> = writable([])
  myNotes: Writable<Array<ActionHash>> = writable([])
  mySessions: Writable<HoloHashMap<ActionHash,SessionInterest>> = writable(new HoloHashMap())
  neededStuff: GetStuffInput = {}
  myPubKeyBase64: string
  loader = undefined
  neededStuffStore =undefined
  stuffIsNeeded() {
    return this.neededStuff.notes ? true : false
  }
  
  constructor(public client: EmergenceClient, public profilesStore: ProfilesStore, public myPubKey: AgentPubKey) {
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

  sessionReleationDataStore(sessionStore: Readable<Info<Session>>) : Readable<SessionRelationData> {
    return derived(sessionStore, $session=> {
        const rel: SessionRelationData = {
            myInterest: SessionInterest.NoOpinion,
            interest: new HoloHashMap(),
            slot: undefined
        }
        const spaces = $session.relations.filter(r=>r.relation.content.path === "session.space")
        if (spaces.length > 0) {
          let ri = spaces[spaces.length-1]
          const r = ri.relation
          const window = JSON.parse(r.content.data) as TimeWindow
                  rel.slot = {
                      space: r.dst,
                      window
                  }
        }

        const interest = $session.relations.filter(r=>r.relation.content.path === "session.interest")
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
      })
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

  async createTimeWindow(start: Date, duration: number) : Promise<ActionHash> {
    const timeWindow: TimeWindow = { 
        start: parseInt((start.getTime()).toFixed(0)),
        duration,
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

  async fetchTimeWindows() {
    const timeWindows = await this.client.getTimeWindows()
    this.timeWindows.update((n) => {return timeWindows} )
  }

  async createSession(title: string, description: string, leaders:Array<AgentPubKey>,  smallest: number, largest: number, duration: number, amenities: number, slot: Slot|undefined): Promise<EntryRecord<Session>> {
    const record = await this.client.createSession(title, amenities, description, leaders, smallest, largest, duration)
    if (slot) {
        await this.slot(record.actionHash, slot)
    }
  
    await this.client.createRelations([
        {   src: record.actionHash, // should be agent key
            dst: record.actionHash,
            content:  {
                path: `feed.${FeedType.SessionNew}`,
                data: JSON.stringify(title)
            }
        },
    ])

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
        if (changes.length > 0) {
            const record = await this.client.updateSession(update)
            this.client.createRelations([
                {   src: record.actionHash, // should be agent key
                    dst: record.actionHash,
                    content:  {
                        path: `feed.${FeedType.SessionUpdate}`,
                        data: JSON.stringify({title: sessionEntry.title, changes})
                    }
                },
            ])
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

    const me = this.myPubKey
    me[1] =33
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
        await this.fetchTimeWindows()
        const sessions = await this.client.getSessions()
        this.sessions.update((n) => {return sessions} )
        const noteHashes = []
        sessions.forEach(s=>s.relations.filter(r=>r.relation.content.path === "session.space").forEach(r=>noteHashes.push(r.relation.dst)))
        this.noteHashes.update((n) => {return noteHashes} )

    }
    catch (e) {
        console.log("Error fetching sessions", e)
    }
  }

  async createSpace(name: string, description: string, stewards:Array<AgentPubKey>, capacity: number, amenities: number, pic: EntryHash | undefined): Promise<EntryRecord<Space>> {
    const record = await this.client.createSpace(name, description, stewards, capacity, amenities, pic)
    await this.client.createRelations([
        {   src: record.actionHash, // should be agent key
            dst: record.actionHash,
            content:  {
                path: `feed.${FeedType.SpaceNew}`,
                data: JSON.stringify(name)
            }
        },
    ])
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
                name:spaceEntry.name,
                description: spaceEntry.description,
                stewards: spaceEntry.stewards,
                amenities: spaceEntry.amenities,
                capacity: spaceEntry.capacity,
                trashed: spaceEntry.trashed,
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
        if (changes.length > 0) {
            const record = await this.client.updateSpace(update)
            this.client.createRelations([
                {   src: record.actionHash, // should be agent key
                    dst: record.actionHash,
                    content:  {
                        path: `feed.${FeedType.SpaceUpdate}`,
                        data: JSON.stringify({name: spaceEntry.name, changes})
                    }
                },
            ])
            this.spaces.update((spaces) => {
                spaces[idx].record = record
                return spaces
            })
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
    const record = await this.client.createNote(text, tags, pic)
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
    this.fetchSessions()
    return record
  }

  async updateNote(noteHash: ActionHash, text: string, tags: Array<string>, pic: EntryHash | undefined): Promise<EntryRecord<Note>> {
    const idx = this.getNoteIdx(noteHash)
    if (idx >= 0) {
        const note = get(this.notes)[idx]

        const updatedNote: UpdateNoteInput = {
            original_note_hash: noteHash,
            previous_note_hash: note.record.actionHash,
            updated_note: {
                text,
                tags,
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
            this.notes.update((notes) => {
                notes[idx].record = record
                return notes
            })
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
    const idx = this.getNoteIdx(noteHash)
    if (idx >= 0) {
        const note = get(this.notes)[idx]
        await this.client.deleteNote(note.record.actionHash)
        this.notes.update((notes) => {
            notes.splice(idx, 1);
            return notes
        })
        this.client.createRelations([
            {   src: note.original_hash, // should be agent key
                dst: note.original_hash,
                content:  {
                    path: `feed.${FeedType.NoteDelete}`,
                    data: JSON.stringify("")
                }
            },
        ])
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
    }
    catch (e) {
        console.log("Error fetching spaces", e)
    }
  }

  async fetchFeed() {
    try {
        const feed = await this.client.getFeed()
        this.feed.update((n) => {return feed} )

        // these will move elsewhere when we load in the feed by scrolling...
        this.myNotes.update((n) => {
            return feed.filter(f=>f.type == FeedType.NoteNew && encodeHashToBase64(f.author) === this.myPubKeyBase64 ).map(f=>f.about)
        } )
        this.mySessions.update((n) => {
            feed.forEach(f=>{
                if (f.type == FeedType.SessionSetInterest && encodeHashToBase64(f.author) === this.myPubKeyBase64) {
                    n.set(f.about,f.detail)
                }
            }
            )
            return n
        } )
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


}
