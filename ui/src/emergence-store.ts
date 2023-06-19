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
import en from 'javascript-time-ago/locale/en/index.js';
import type { ProfilesStore } from '@holochain-open-dev/profiles';
import { derived, get, writable, type Readable, type Writable } from 'svelte/store';
import { HoloHashMap, type EntryRecord, ActionHashMap } from '@holochain-open-dev/utils';
import { FeedType, type FeedElem, type Info, type Session, type Slot, type Space, type TimeWindow, type UpdateSessionInput, type UpdateSpaceInput, slotEqual, type UpdateNoteInput, type Note, type GetStuffInput, type SessionInterest, type SessionRelationData, type SiteMap, type UpdateSiteMapInput, type SiteLocation, type Coordinates, setCharAt, type SlottedSession, type TagUse, sessionSelfTags, type UIProps, type SessionsFilter, defaultSessionsFilter, defaultFeedFilter, type FeedFilter,  DetailsType, SessionSortOrder, type Settings, SessionInterestDefault, SessionInterestBit, type ProxyAgent, type UpdateProxyAgentInput, type AnyAgent, sessionTags, SpaceSortOrder, defaultPeopleFilter, type PeopleFilter, type AnyAgentDetailed, type Projection, type DownloadedFile, type SessionType, type SessionTypeID, NULL_HASHB64, NULL_HASH, SessionListMode, type GetFeedInput } from './emergence/emergence/types.js';
import { toPromise, type AsyncReadable, type AsyncStatus } from '@holochain-open-dev/stores';
import type { FileStorageClient } from '@holochain-open-dev/file-storage';
import { Marked, Renderer } from "@ts-stack/markdown";
import { elapsed, filterTime, sessionHasTags } from './emergence/emergence/utils.js';
import { fromUint8Array } from 'js-base64';
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
const LIKELY_TO_ATTEND_PERCENT = .8

export const neededStuffStore = (client: EmergenceClient) => {
    const notes = writable(new HoloHashMap<ActionHash, Info<Note>| undefined>())
    const neededStuff: GetStuffInput = {}

    const intervalId = setInterval(async ()=>{
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
        intervalId,
        notes: {
            all: ()=> get(notes),
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
  proxyAgents: Writable<Array<Info<ProxyAgent>>> = writable([])
  noteHashes: Writable<Array<ActionHash>> = writable([])
  feed: Writable<Array<FeedElem>> = writable([])
  allTags: Writable<Array<TagUse>> = writable([])
  agentNotes: Writable<HoloHashMap<AgentPubKey, Array<ActionHash>>> = writable(new HoloHashMap())
  agentSessions: Writable<HoloHashMap<AgentPubKey,HoloHashMap<ActionHash,SessionInterest>>> = writable(new HoloHashMap())
  files: HoloHashMap<AgentPubKey,DownloadedFile> = new HoloHashMap()
  proxyAgentNicknames: HoloHashMap<ActionHash, string> = new HoloHashMap()
  neededStuff: GetStuffInput = {}
  myPubKeyBase64: string
  loader = undefined
  neededStuffStore = undefined
  uiProps: Writable<UIProps> = writable({
    pane: "sessions",
    amSteward: false,
    debuggingEnabled: false,
    youPanel: "updates",
    discoverPanel: "tags",
    sessionsFilter: defaultSessionsFilter(),
    feedFilter: defaultFeedFilter(),
    peopleFilter: defaultPeopleFilter(),
    sensing: false,
    detailsStack: [],
    sessionListMode: SessionListMode.List,
    sessionSort: SessionSortOrder.Ascending,
    spaceSort: SpaceSortOrder.Capacity,
    confirmHide: true,
    searchVisible: false,
    syncing: 0,
  })
  settings: Writable<Settings> = writable({game_active: false, session_types:[]})

  async downloadFile(fileHash: EntryHash) : Promise< DownloadedFile | undefined> {
    let downloadedFile = this.files.get(fileHash)
    if (!downloadedFile) {
        const file = await this.fileStorageClient.downloadFile(fileHash);
        if (file) {
            const rawData = await file.arrayBuffer();
            let data: string | undefined = undefined
            if (file.type.startsWith("audio/")||file.type.startsWith("video/")||file.type.startsWith("image/"))
                data = fromUint8Array(new Uint8Array(rawData))
            else if (file.type.startsWith("text/")) {
                var enc = new TextDecoder("utf-8");
                data = enc.decode(rawData)
            }
            downloadedFile = {file, data}
            this.files.set(fileHash, downloadedFile)
        }
    }
    return downloadedFile

  }

  async setSettings(settings: Settings) {
    await this.client.setSettings(settings)
    await this.getSettings()
  }

  async getSettings() {
    const settings = await this.client.getSettings()
    this.settings.update( (_s) => {return settings})
  }

  setUIprops(props:{}) {
    this.uiProps.update((n) => {
        Object.keys(props).forEach(key=>n[key] = props[key])
        return n
    })
  }

  openDetails = (type: DetailsType, hash: ActionHash) => {
    const detailsStack = get(this.uiProps).detailsStack
    detailsStack.unshift({type,hash})
    this.setUIprops({detailsStack})
  }

  closeDetails = () => {
    const detailsStack = get(this.uiProps).detailsStack
    detailsStack.shift()
    this.setUIprops({detailsStack})
  }

  setPane = async (pane) => {
    console.log("SET PANE", pane)
    this.setUIprops({pane, detailsStack:[]})
    switch(pane) {
        case 'discover':
            // get everything newer than newest
            const newest = get(this.feed)[0]
            if (newest) {
                await this.fetchFeed({newer_than:Math.trunc(newest.timestamp)*1000});
            }
            //this.fetchFeed({});
            break;
        case 'sessions':
            this.fetchSessions()
            break;
        case 'admin':
            this.sync(undefined)
            break;
        }
  }

  stuffIsNeeded() {
    return this.neededStuff.notes ? true : false
  }
  
  constructor(public client: EmergenceClient, onSignal, public profilesStore: ProfilesStore, public fileStorageClient:FileStorageClient, public myPubKey: AgentPubKey) {
    //this.loader = setInterval(()=>{if(this.stuffIsNeeded()) this.fetchStuff()}, 1000);
    this.neededStuffStore =  neededStuffStore(client)
    this.myPubKeyBase64 = encodeHashToBase64(myPubKey)
    onSignal(signal => {
        // console.log("SIGNAL",signal)
        if (signal.zome_name == 'emergence' && signal.payload.message && signal.payload.message.type == "UpdateSettings") {
        // @ts-ignore
        const settings = signal.payload.message

        delete settings.type
        // TODO any checking?
        this.settings.update((_)=> {return settings})
        }
      })
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

  sitemapFilteredSpaces() : Readable<Array<Info<Space>>>{
    const sitemap = this.getCurrentSiteMap()
    return derived(this.spaces, $spaces => $spaces.filter(s=>!sitemap || s.record.entry.tags.includes(sitemap.record.entry.tags[0])))
  }

  sitemapFilteredWindows() : Readable<Array<TimeWindow>>{
    const sitemap = this.getCurrentSiteMap()
    return derived(this.timeWindows, $timeWindows => $timeWindows.filter(w=>!sitemap || w.tags.includes(sitemap.record.entry.tags[0])))
  }

  sessionStore(sessionHash) : Readable<Info<Session>|undefined>{
    return derived(this.sessions, $sessions => $sessions.find(s=>encodeHashToBase64(sessionHash) == encodeHashToBase64(s.original_hash)))
  }

  proxyAgentStore(proxyAgentHash) : Readable<Info<ProxyAgent>|undefined>{
    return derived(this.proxyAgents, $proxyAgents => $proxyAgents.find(s=>encodeHashToBase64(proxyAgentHash) == encodeHashToBase64(s.original_hash)))
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
        const settings = get(this.settings)
        if (settings && settings.current_sitemap) {
            return this.getSiteMap(settings.current_sitemap)
        }
        return maps[0]
    }
    return undefined
  }

  getProxyAgentIdx(proxyAgentHash: ActionHash) : number {
    const b64 = encodeHashToBase64(proxyAgentHash)
    const proxyAgents = get(this.proxyAgents)
    return proxyAgents.findIndex((s)=> encodeHashToBase64(s.original_hash) === b64)
  }

  getProxyAgent(proxyAgentHash: ActionHash) : Info<ProxyAgent> | undefined {
    const proxyAgentIdx = this.getProxyAgentIdx(proxyAgentHash)
    if (proxyAgentIdx == -1) return undefined
    return get(this.proxyAgents)[proxyAgentIdx]
  }

  getSessionSlot(session: Info<Session>) : Slot|undefined {
    if (!session) return undefined
    const rels = session.relations.filter(r=>r.relation.content.path == "session.slot")
    if (rels.length == 0) return undefined
    rels.sort((a,b)=>b.timestamp - a.timestamp)
    const rel = rels[0]
    if (!rel.relation.content.data) {
        return undefined
    }
    const window = JSON.parse(rel.relation.content.data) as TimeWindow
    return {
        space: encodeHashToBase64(rel.relation.dst)== NULL_HASHB64 ? undefined : rel.relation.dst,
        window
    }
  }

  getSpaceSiteLocation(space: Info<Space>, sitemap: ActionHash) : SiteLocation|undefined {
    const siteB64 = encodeHashToBase64(sitemap)
    const rels = space.relations.filter(r=>r.relation.content.path == "space.location" && siteB64== encodeHashToBase64(r.relation.dst))
    if (rels.length == 0) return undefined
    rels.sort((a,b)=>b.timestamp - a.timestamp)
    const rel = rels[0]
    const location = JSON.parse(rel.relation.content.data) as Coordinates
    return {
        imageHash: sitemap,
        location
    }
  }

  getSessionReleationData(session: Info<Session>) : SessionRelationData {
    const rel: SessionRelationData = {
        myInterest: SessionInterestDefault,
        interest: new HoloHashMap(),
        slot: undefined
    }
    const slottings = session.relations.filter(r=>r.relation.content.path === "session.slot")
    if (slottings.length > 0) {
      let ri = slottings[slottings.length-1]
      const r = ri.relation
      if (r.content.data) {
        const window = JSON.parse(r.content.data) as TimeWindow
        rel.slot = {
            space: encodeHashToBase64(r.dst)== NULL_HASHB64 ? undefined : r.dst,
            window
        }
      } else rel.slot = undefined
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
        const slottings = $session.relations.filter(r=>r.relation.content.path == "session.slot")
        if (slottings.length > 0) {
          let ri = slottings[slottings.length-1]
          const r = ri.relation
          const window = JSON.parse(r.content.data) as TimeWindow
                  return {
                      space: encodeHashToBase64(r.dst)== NULL_HASHB64 ? undefined : r.dst,
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
  
  async unslot(sessionHash: ActionHash) {
    const session = this.getSession(sessionHash)
    const sessionSlot = this.getSessionSlot(session)
    if (!sessionSlot) return;
    const spaceDst = sessionSlot.space ? sessionSlot.space : NULL_HASH
    const relations = [
        {   src: sessionHash,
            dst: spaceDst,
            content:  {
                path: "session.slot",
                data: ""
            }
        },
        {   src: sessionHash, // should be agent key
            dst: sessionHash,
            content:  {
                path: `feed.${FeedType.SlotSession}`,
                data: JSON.stringify({space:undefined, window: undefined})
            }
        },
    ]
    if (sessionSlot.space) {
        relations.push(        
            {   src: sessionSlot.space,
                dst: sessionHash,
                content:  {
                    path: "space.sessions",
                    data: ""
                }
            },
        )
    }
    await this.client.createRelations(relations)
    await this.fetchSession([sessionHash])
    await this.fetchSpace([spaceDst])
  }

  async slot(session: ActionHash, slot: Slot) {
    const space = slot.space ? this.getSpace(slot.space) : undefined
    const spaceDst = slot && slot.space ? slot.space : NULL_HASH

    const relations = [
        {   src: session,
            dst: spaceDst,
            content:  {
                path: "session.slot",
                data: JSON.stringify(slot.window)
            }
        },
        {   src: session, // should be agent key
            dst: session,
            content:  {
                path: `feed.${FeedType.SlotSession}`,
                data: JSON.stringify({space:space ? space.record.entry.name : "<none>", window: slot.window})
            }
        },
    ]
    if (space) {
        relations.push({   src: slot.space,
            dst: session,
            content:  {
                path: "space.sessions",
                data: JSON.stringify(slot.window)
            }
        })
    }
    await this.client.createRelations(relations)
    const promises = [this.fetchSession([session])]
    if (slot && slot.space) {
        promises.push(this.fetchSpace([spaceDst]))
    }
    const allPromise = Promise.all(promises)
    await allPromise
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
    console.log("FETCHING ALL TIME WINDOWS")

    const timeWindows = await this.client.getTimeWindows()
    this.timeWindows.update((n) => {return timeWindows} )
  }

  getSlotTypeTags(): Array<string> {
    const tags = new Set()
    get(this.timeWindows).forEach(w=> w.tags.forEach(t=>tags.add(t)))
    get(this.spaces).forEach(s=> s.record.entry.tags.forEach(t=>tags.add(t)))
    get(this.maps).forEach(s=> s.record.entry.tags.forEach(t=>tags.add(t)))
    return Array.from(tags) as Array<string>
  }

  async createSession(sessionTypeID: SessionTypeID, title: string, description: string, leaders:Array<AnyAgent>,  smallest: number, largest: number, duration: number, amenities: number, slot: Slot|undefined, tags: Array<string>): Promise<EntryRecord<Session>> {
    const record = await this.client.createSession(sessionTypeID, title, amenities, description, leaders, smallest, largest, duration)
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

    this.fetchSession([sessionHash])
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
            updated_type: sessionEntry.session_type,
            updated_title: sessionEntry.title,
            updated_description: sessionEntry.description,
            updated_leaders: sessionEntry.leaders,
            updated_smallest: sessionEntry.smallest,
            updated_largest: sessionEntry.largest,
            updated_duration: sessionEntry.duration,
            updated_amenities: sessionEntry.amenities,
            updated_trashed: sessionEntry.trashed,
        };

        if (props.hasOwnProperty("sessionType")) {
            if (sessionEntry.session_type != props.sessionType
                ) {
                update.updated_type = props.sessionType
                changes.push(`type -> ${props.sessionType}`)
            }
        }

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
                    console.log("SLOT")
                    await this.slot(session.original_hash, props.slot)
                } else {
                    console.log("UNSOLT")

                   await this.unslot(session.original_hash)
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
    this.fetchSession([sessionHash])
  }

  async fetchAgents() {
    toPromise(this.profilesStore.allProfiles)
  }

  peopleCount() : number {
    const allProfiles = get(this.profilesStore.allProfiles)
    const peopleCount = allProfiles.status=== "complete" ? Array.from(allProfiles.value.keys()).length : 0
    return peopleCount
  }

  sessionInterestProjection(sessions: Array<Info<Session>>) : Projection  {
    const peopleCount = this.peopleCount()

    let totalAssesments = 0
    let interestData = sessions.filter(s=> (s.record.entry.session_type==0 && !s.record.entry.trashed)).map(session=>{
        const relData = this.getSessionReleationData(session)
        const interests = Array.from(relData.interest)
        const assesments = interests.length
        const passCount = interests.filter(([_,i])=> i == SessionInterestBit.NoOpinion).length
        const goingCount = interests.filter(([_,i])=> i == SessionInterestBit.Going).length
        const bookmarkedCount = interests.filter(([_,i])=> i == SessionInterestBit.Interested).length
        const percentInterest = assesments > 0 ? (goingCount + bookmarkedCount * .2) / assesments : 0
        const estimatedAttendance = 0
        totalAssesments += assesments
        return {session, estimatedAttendance, percentInterest, assesments,  passCount, goingCount, bookmarkedCount}
    })
    let sumOfPercentages = 0
    for (const p of interestData) {
        sumOfPercentages += p.percentInterest
    }
    const s = 5/sumOfPercentages
    const likelyCount = peopleCount * LIKELY_TO_ATTEND_PERCENT
    interestData = interestData.map(p=>{
        p.estimatedAttendance =  s * likelyCount * p.percentInterest
        return p
    }).sort((a,b)=>b.estimatedAttendance- a.estimatedAttendance)
    const est = interestData.map(p=>p.estimatedAttendance)
    return {
        sessionCount: interestData.length,
        totalAssesments,
        peopleCount,
        likelyCount,
        maxAttendance: Math.max(...est),
        minAttendance: Math.min(...est),
        interestData
      }
  }

  async fetchSession(sessions: Array<ActionHash>) {
    try {
        let stuff = await this.client.getStuff({sessions})
        if (stuff.sessions) {
            stuff.sessions.forEach(session=>{
                if (session) {
                    const sB64 = encodeHashToBase64(session.original_hash)
                    this.sessions.update((n) => {
                        const idx = n.findIndex(s=>encodeHashToBase64(s.original_hash)== sB64)
                        if (idx >= 0) {
                            n[idx] = session
                        }
                        else {
                            n.push(session)
                        }
                        return n
                    } )
                    this.updateMyInterest(session)
                    const noteHashes = []
                    session.relations.filter(r=>r.relation.content.path === "session.note").forEach(r=>noteHashes.push(r.relation.dst))
                    this.noteHashes.update((notes) => {
                        noteHashes.forEach(h=>{
                            if (!notes.find(n=>encodeHashToBase64(n)==encodeHashToBase64(h))) {
                                notes.push(h)
                            }
                        })
                        return notes
                    } )
                }
            })
        }
    }
    catch (e) {
        console.log(`Error fetching session: ${sessions.map(s=>encodeHashToBase64(s))}`, e)
    }
  } 

  updateMyInterest(session: Info<Session>) {
    session.record.entry.leaders.forEach(l=> 
        {
            if (encodeHashToBase64(l.hash) == this.myPubKeyBase64) {
                this.agentSessions.update((n) => {
                    let si = n.get(this.myPubKey)
                    if (!si) {
                        si = new HoloHashMap()
                        n.set(l.hash,si)
                    }
                    si.set(session.original_hash,SessionInterestBit.Interested)
                    return n
                } )
            }
        }    
    )
  }

  async fetchSessions() {
    console.log("FETCHING ALL SESSIONS")
    try {
        await this.fetchSpaces()
        const sessions = await this.client.getSessions()
        this.sessions.update((n) => {return sessions} )
        const noteHashes = []
        sessions.forEach(s=> this.updateMyInterest(s))
        sessions.forEach(s=>s.relations.filter(r=>r.relation.content.path === "session.note").forEach(r=>noteHashes.push(r.relation.dst)))
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
            if (slot && slot.space) {
                if (encodeHashToBase64(slot.space) == encodeHashToBase64(space.original_hash)) {
                const s = sessions.set(session.original_hash, {session,window:JSON.parse(ri.relation.content.data)})
                }
            }
        }
      }
    })
    return Array.from(sessions.values()).sort((a,b)=>a.window.start - b.window.start);
  }

  async mergeSessions(sessionHashA: ActionHash, sessionHashB: ActionHash) {
    const sessionA = this.getSession(sessionHashA)
    const sessionB = this.getSession(sessionHashB)
    if (sessionA.record.entry.session_type != sessionB.record.entry.session_type) {
        console.log("Can't merge sessions of different types")
        return
    }
    const title = `${sessionA.record.entry.title} & ${sessionB.record.entry.title}`
    const description = `${sessionA.record.entry.description} \n\n--------\n\n ${sessionB.record.entry.description}`
    const leaders = sessionA.record.entry.leaders
    sessionB.record.entry.leaders.forEach(lb=> {
        const lbB64 = encodeHashToBase64(lb.hash)
        if (!leaders.find(la=> lbB64 == encodeHashToBase64(la.hash))) {
            leaders.push(lb)
        }
    })
    const smallest = Math.min(sessionA.record.entry.smallest, sessionB.record.entry.smallest)
    const largest = Math.max(sessionA.record.entry.largest, sessionB.record.entry.largest)
    const duration = Math.max(sessionA.record.entry.duration, sessionB.record.entry.duration)
    const amenities = sessionA.record.entry.duration | sessionB.record.entry.duration
    const slot = this.getSessionSlot(sessionA)
    const tags = sessionTags(sessionA)
    sessionTags(sessionB).forEach(t=> {
        if (!tags.includes(t)) {
            tags.push(t)
        }
    })
    const newSession = await this.createSession(sessionA.record.entry.session_type, title,description,leaders,smallest,largest,duration,amenities,slot,tags)
    await this.updateSession(sessionHashA, {trashed: true})
    await this.updateSession(sessionHashB, {trashed: true})
    await this.fetchSession([sessionHashA,sessionHashB,newSession.actionHash])
  }

  filterPeople( person: AnyAgentDetailed, filter: PeopleFilter) : boolean {
    if (filter.keyword) {
        const keyword = filter.keyword.toLowerCase()

        if (person.bio.toLowerCase().search(keyword) < 0 &&
        person.location.toLowerCase().search(keyword) < 0 &&
        person.nickname.toLowerCase().search(keyword) < 0
        )
        return false
    }
    return true
  }

  filterFeedElem(elem:FeedElem, filter: FeedFilter) : boolean {

    if (filter.tags.length > 0) {
        const elemTags: string[] = this.getFeedElementTags(elem)
        let found = false
        for (let tag of filter.tags) {
            tag = tag.toLowerCase()
            if (elemTags.includes(tag)) {
                found = true
                break;
            }
        }
        if (!found) return false
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
    if (filter.keyword) {
        const keyword = filter.keyword.toLowerCase() 
        if (!this.searchInFeedElem(elem, keyword))
        return false
    }

    return true
  }
  searchInFeedElem(elem:FeedElem, keyword: string) : boolean {
    let text = ""
    switch(elem.type) {
        case FeedType.SpaceNew: 
        case FeedType.SpaceUpdate: 
            const space = this.getSpace(elem.about)
            if (space) {
                text = space.record.entry.name+space.record.entry.description
            }
            break;
        case FeedType.SessionNew: 
        case FeedType.SessionUpdate: 
            const session = this.getSession(elem.about)
            if (session) {
                text = session.record.entry.title+session.record.entry.description
            }
            break;
        case FeedType.NoteNew:
        case FeedType.NoteUpdate:
            const note = this.getNote(elem.about)
            if (note) {
                text = note.record.entry.text+note.record.entry.tags.join("")
            }
        }
    return text.toLowerCase().search(keyword) >= 0
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
                    ).map(ri=>ri.relation.content.data.toLowerCase())
            }
            break;
        case FeedType.NoteNew:
        case FeedType.NoteUpdate:
            const note = this.getNote(elem.about)
            if (note) {
                return note.record.entry.tags
            }
      }
    return []
  }

  sessionLeaderNameIncludes = (session:Info<Session>, word:string):boolean => {
    for (const l of session.record.entry.leaders) {
        if (l.type=="ProxyAgent") {
            const nick = this.proxyAgentNicknames.get(l.hash)
            if (nick && nick.toLowerCase().search(word) >= 0) return true
        } else {
            const profile = get(this.profilesStore.profiles.get(l.hash))
            if (profile.status === "complete"  && profile.value) {
                const nick = profile.value.nickname
                if (nick && nick.toLowerCase().search(word) >= 0) return true
            }

        }
    }
    return false
  }
  

  filterSession(session:Info<Session>, filter: SessionsFilter) : boolean {
    const slot = this.getSessionSlot(session)
    if (!slot && (filter.timeNow || filter.timeToday ||  filter.timeNext || filter.timePast || filter.timeFuture)) return false
    if (filter.timeUnscheduled && slot) return false
    const now = (new Date).getTime()

    if (slot && !filterTime(now, filter, slot.window)) return false

    const rel: SessionRelationData = this.getSessionReleationData(session)
    if (filter.involvementLeading || filter.involvementGoing || filter.involvementInterested || filter.involvementNoOpinion  || filter.involvementHidden || filter.involvementLeading) {
        let found = false
        if (filter.involvementLeading && session.record.entry.leaders.find(l=>encodeHashToBase64(l.hash) === this.myPubKeyBase64)) found = true
        else {
            if (filter.involvementGoing && rel.myInterest & SessionInterestBit.Going) found = true
            else
            if (filter.involvementInterested && rel.myInterest & SessionInterestBit.Interested) found = true
            else
            if (filter.involvementHidden && rel.myInterest & SessionInterestBit.Hidden) found = true
            else
            if (filter.involvementNoOpinion && ((rel.myInterest & SessionInterestBit.NoOpinion) || (rel.myInterest == SessionInterestDefault))) found = true
        }
        if (!found) return false
    } else if (rel.myInterest & SessionInterestBit.Hidden) return false

    if (filter.tags.length > 0) {
        let found = sessionHasTags(session, filter.tags)
        if (!found) return false
    }
    if (filter.keyword) {
        const word = filter.keyword.toLowerCase() 
        if (session.record.entry.description.toLowerCase().search(word) < 0 &&
            session.record.entry.title.toLowerCase().search(word) < 0  &&
            !this.sessionLeaderNameIncludes(session, word)
            )
            return false
    }
    if (filter.space.length>0) {
        if (!slot || !slot.space) return false
        const b64 = encodeHashToBase64(slot.space)
        if (!filter.space.find(s=>encodeHashToBase64(s) === b64)) return false
    }
    if (filter.types != 0) {
        if (!(filter.types & (1 << session.record.entry.session_type ))) {
            return false
        }
    }
    return true

  }
  filterTag = (tag:string, filterName: string) => {
    const filter = get(this.uiProps)[filterName]
    const idx = filter.tags.indexOf(tag)
    if (idx >= 0) {
        filter.tags.splice(idx,1)
    } else
    filter.tags.push(tag)
    this.setUIprops({"filterName": filter})
  }
  resetFilterAttributes = (attributes:string[], filterName: string) => {
    const filter = get(this.uiProps)[filterName]
    switch (filterName) {
        case "sessionsFilter": attributes.map(a=> filter[a] =  defaultSessionsFilter()[a])
        break;
        case "feedFilter": attributes.map(a=> filter[a] =  defaultFeedFilter()[a])
        break;
        case "peopleFilter": attributes.map(a=> filter[a] =  defaultPeopleFilter()[a])
        break;
    }
    const props=[]
    props[filterName]=filter
    this.setUIprops(props)
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
    this.fetchSpace([record.actionHash])
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

            const currentSiteLocation = this.getSpaceSiteLocation(space, this.getCurrentSiteMap().original_hash)

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
                // without calling fetch spaces. 
                // but preferably be able to do so with what's returned by create relations.
                this.fetchSpace([spaceHash])
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
    this.fetchSession([sessionHash])
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
            this.fetchSession([session.original_hash])
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

  async createSiteMap(text: string, pic: EntryHash, tags: Array<string>): Promise<EntryRecord<SiteMap>> {
    const record = await this.client.createSiteMap(text, pic, tags)
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

  async updateSiteMap(mapHash: ActionHash, text: string, pic: EntryHash, tags: Array<string>): Promise<EntryRecord<SiteMap>> {
    const idx = this.getSiteMapIdx(mapHash)
    if (idx >= 0) {
        const map = get(this.maps)[idx]

        const updatedSiteMap: UpdateSiteMapInput = {
            original_map_hash: mapHash,
            previous_map_hash: map.record.actionHash,
            updated_map: {
                text,
                pic,
                tags,
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
    console.log("FETCHING ALL SITE MAPS")
    try {
        const maps = await this.client.getSiteMaps()
        this.maps.update((n) => {return maps} )
    }
    catch (e) {
        console.log("Error fetching sitemaps", e)
    }
  }


  async createProxyAgent(nickname: string, bio: string, location: string,  pic: EntryHash | undefined): Promise<EntryRecord<ProxyAgent>> {
    const record = await this.client.createProxyAgent(nickname, bio, location, pic)
    const relations = [
        {   src: record.actionHash, // should be agent key
            dst: record.actionHash,
            content:  {
                path: `feed.${FeedType.ProxyAgentNew}`,
                data: JSON.stringify(nickname)
            }
        },
    ]
    await this.client.createRelations(relations)
    this.fetchProxyAgents()
    return record
  }

  async updateProxyAgent(proxyAgentHash: ActionHash, nickname: string, bio: string, location: string,  pic: EntryHash | undefined): Promise<EntryRecord<ProxyAgent>> {
    const idx = this.getProxyAgentIdx(proxyAgentHash)
    if (idx >= 0) {
        const map = get(this.proxyAgents)[idx]

        const updatedProxyAgent: UpdateProxyAgentInput = {
            original_hash: proxyAgentHash,
            previous_hash: map.record.actionHash,
            updated_proxy_agent: {
                nickname,
                bio,
                location,
                pic,
            }
        }
        const entry = map.record.entry
        let changes = []
        if (entry.nickname != nickname) {
            changes.push(`nickname`)
        }
        if (entry.bio != bio) {
            changes.push(`bio`)
        }
        if (entry.location != location) {
            changes.push(`location`)
        }
        if (entry.pic != pic) {
            changes.push(`pic`)
        }
        if (changes.length > 0) {
            const record = await this.client.updateProxyAgent(updatedProxyAgent)
            this.client.createRelations([
                {   src: record.actionHash, // should be agent key
                    dst: record.actionHash,
                    content:  {
                        path: `feed.${FeedType.ProxyAgentUpdate}`,
                        data: JSON.stringify({changes})
                    }
                },
            ])
            this.proxyAgents.update((agents) => {
                agents[idx].record = record
                return agents
            })
            return record
        }
        else {
            console.log("No changes detected ignoring...")
        }
    } else {
        throw new Error(`could not find proxy agent`)
    }
  }

  async deleteProxyAgent(mapHash: ActionHash) {
    const idx = this.getProxyAgentIdx(mapHash)
    if (idx >= 0) {
        const agent = get(this.proxyAgents)[idx]
        await this.client.deleteProxyAgent(agent.record.actionHash)
        this.maps.update((agents) => {
            agents.splice(idx, 1);
            return agents
        })
        this.client.createRelations([
            {   src: agent.original_hash, // should be agent key
                dst: agent.original_hash,
                content:  {
                    path: `feed.${FeedType.ProxyAgentDelete}`,
                    data: JSON.stringify("")
                }
            },
        ])
    }
  }

  async fetchProxyAgents() {
    console.log("FETCHING ALL PROXY AGENTS")
    try {
        const proxyAgents = await this.client.getProxyAgents()
        this.proxyAgents.update((n) => {return proxyAgents} )
        proxyAgents.forEach(p=>this.proxyAgentNicknames.set(p.original_hash,p.record.entry.nickname))
    }
    catch (e) {
        console.log("Error fetching sitemaps", e)
    }
  }

  async assignProxySessionsToAgent(proxy: ActionHash, agent: AgentPubKey) {
    const proxyB64 = encodeHashToBase64(proxy)
    for (const s of get(this.sessions)) {
        const leaders =s.record.entry.leaders
        const idx = leaders.findIndex(l=>l.type=="ProxyAgent" && encodeHashToBase64(l.hash) == proxyB64)
        if (idx >= 0) {
            leaders[idx] = {type:"Agent", hash:agent}
        }
        await this.updateSession(s.original_hash,{leaders})
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

  async fetchSpace(spaces: Array<ActionHash>) {
    try {
        let stuff = await this.client.getStuff({spaces})
        if (stuff.spaces) {
            stuff.spaces.forEach(space=>{
                if (space) {
                    const sB64 = encodeHashToBase64(space.original_hash)
                    this.spaces.update((n) => {
                        const idx = n.findIndex(s=>encodeHashToBase64(s.original_hash)== sB64)
                        if (idx >= 0) {
                            n[idx] = space
                        }
                        else {
                            n.push(space)
                        }
                        return n
                    } )
                }
            })
        }
    }
    catch (e) {
        console.log("Error fetching spaces", e)
    }
  }


  async fetchSpaces() {
    console.log("FETCHING ALL SPACES")

    try {
        const spaces = await this.client.getSpaces()
        this.spaces.update((n) => {return spaces} )
        await this.fetchTimeWindows()
    }
    catch (e) {
        console.log("Error fetching spaces", e)
    }
  }

  async fetchAgentStuff(agentPubKey) {
    try {
        const feed = await this.client.getFeed(
            {agent_filter: agentPubKey})
        this.agentNotes.update((n) => {
            n.set(agentPubKey,feed.filter(f=>f.type == FeedType.NoteNew ).map(f=>f.about))
            return n
        } )
        this.agentSessions.update((n) => {
            let si = n.get(agentPubKey)
            if (!si) {
                si = new HoloHashMap()
                n.set(agentPubKey,si)
            }
            feed.forEach(f=>{
                if (f.type == FeedType.SessionSetInterest) {
                    if (f.detail & (SessionInterestBit.NoOpinion + SessionInterestBit.Hidden) || f.detail == 0) {
                        si.delete(f.about)
                    }
                    else {
                        si.set(f.about, f.detail)
                    }
                }
            })
            n.set(agentPubKey,si)
            return n
        } )
    }
    catch (e) {
        console.log("Error fetching agent stuff", e)
    }
  }


  async fetchFeed(filter: GetFeedInput) {
    try {
        const startTime = performance.now();
        // console.log("FETCHING FEED ", filter);
        this.setUIprops({syncing: get(this.uiProps).syncing+1})

        const feed = await this.client.getFeed(filter)
        // console.log("FEED ITEMS RETURNED:", feed.length, feed, elapsed(startTime))
        this.feed.update((n) => {
            feed.forEach(f=>{
                const fB64 = encodeHashToBase64(f.hash)
                const idx = n.findIndex(s=>encodeHashToBase64(s.hash) == fB64)
                if (idx >= 0) {
                    n[idx] = f
                }
                else {
                    n.push(f)
                }
                return n
            })
            return n
        } )
        // console.log("FETCHING FEED COMPLETE AFTER ", elapsed(startTime))
        this.setUIprops({syncing: get(this.uiProps).syncing-1})

    }
    catch (e) {
        this.setUIprops({syncing: get(this.uiProps).syncing-1})
        console.log("Error fetching feed", e)
    }
  }

  async fetchTags() {
    console.log("FETCHING ALL TAGS")

    try {
        const tags = await this.client.getTags()
        this.allTags.update((n) => {return tags} )
    }
    catch (e) {
        console.log("Error fetching tags", e)
    }
  }
  async sync(agent: AgentPubKey | undefined) {
    this.setUIprops({syncing: get(this.uiProps).syncing+1})
    await this.fetchAgents()

    const starTime = performance.now()
    console.log("start sync");
    await this.getSettings()
    await this.fetchTags()
    await this.fetchSessions() // fetches spaces and timewindows
    await this.fetchAgentStuff(!agent ? this.myPubKey: agent)
    if (!agent) {
        await this.fetchFeed({})
    }
    await this.fetchSiteMaps()
    await this.fetchProxyAgents()
    console.log("end sync", elapsed(starTime));
    this.setUIprops({syncing: get(this.uiProps).syncing-1})
  }

}
