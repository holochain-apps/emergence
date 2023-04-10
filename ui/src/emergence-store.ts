// import {  } from './types';

import {
    encodeHashToBase64,
    type ActionHash,
    type AgentPubKey,
} from '@holochain/client';

import type { EmergenceClient } from './emergence-client';

import TimeAgo from "javascript-time-ago"
import en from 'javascript-time-ago/locale/en'
import type { ProfilesStore } from '@holochain-open-dev/profiles';
import { get, writable, type Writable } from 'svelte/store';
import type { EntryRecord } from '@holochain-open-dev/utils';
import { FeedType, type FeedElem, type Info, type Session, type Slot, type Space, type TimeWindow, type UpdateSessionInput, type UpdateSpaceInput, slotEqual } from './emergence/emergence/types';

TimeAgo.addDefaultLocale(en)

export class EmergenceStore {
  timeAgo = new TimeAgo('en-US')
  timeWindows: Writable<Array<TimeWindow>> = writable([])
  sessions: Writable<Array<Info<Session>>> = writable([])
  spaces: Writable<Array<Info<Space>>> = writable([])
  feed: Writable<Array<FeedElem>> = writable([])
  constructor(public client: EmergenceClient, public profilesStore: ProfilesStore, public myPubKey: AgentPubKey) {}
  
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

  getSessionSlot(session: Info<Session>) : Slot|undefined {
    for (const r of session.relations) {
        if (r.content.path == "session.space") {
            const window = JSON.parse(r.content.data) as TimeWindow
            return {
                space: r.dst,
                window
            }
        }
    }
    return undefined
  }

  async slot(session: ActionHash, slot: Slot) {
    const space = this.getSpace(slot.space)
    if (space) {
        this.client.createRelations([
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
    } else {
        console.log("Couldn't find space", encodeHashToBase64(slot.space))
    }
  }

  async createTimeWindow(start: Date, length: number) : Promise<ActionHash> {
    const timeWindow: TimeWindow = { 
        start: parseInt((start.getTime()).toFixed(0)),
        length: length!,
      };
    const actionHash = await this.client.createTimeWindow(timeWindow)
    this.fetchTimeWindows()
    return actionHash
  }

  async fetchTimeWindows() {
    const timeWindows = await this.client.getTimeWindows()
    this.timeWindows.update((n) => {return timeWindows} )
  }

  async createSession(title: string, amenities: number, slot: Slot|undefined): Promise<EntryRecord<Session>> {
    const record = await this.client.createSession(title, amenities)
    if (slot) {
        await this.slot(record.actionHash, slot)
    }
  
    this.client.createRelations([
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
            updated_amenities: sessionEntry.amenities,
        };

        if (props.hasOwnProperty("title")) {
            if (sessionEntry.title != props.title) {
                update.updated_title = props.title
                changes.push(`title -> ${props.title}`)
            }
        }
        if (props.hasOwnProperty("amenities")) {
            if (sessionEntry.amenities != props.amenities) {
                update.updated_amenities = props.amenities
                changes.push(`amenities`)
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


  async fetchSessions() {
    try {
        this.fetchSpaces()
        this.fetchTimeWindows()
        const sessions = await this.client.getSessions()
        this.sessions.update((n) => {return sessions} )
    }
    catch (e) {
        console.log("Error fetching sessions", e)
    }
  }

  async createSpace(name: string, description: string, amenities: number): Promise<EntryRecord<Space>> {
    const record = await this.client.createSpace(name, description, amenities)
    this.client.createRelations([
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

  async updateSpace(spaceHash: ActionHash, name: string, description: string, amenities: number): Promise<EntryRecord<Space>> {
    const idx = this.getSpaceIdx(spaceHash)
    if (idx >= 0) {
        const space = get(this.spaces)[idx]

        const updatedSpace: UpdateSpaceInput = {
            original_space_hash: spaceHash,
            previous_space_hash: space.record.actionHash,
            updated_space: {
                name,description,amenities
            }
        }
        const spaceEntry = space.record.entry
        let changes = []
        if (spaceEntry.name != name) {
            changes.push(`name -> ${name}`)
        }
        if (spaceEntry.description != description) {
            changes.push(`description`)
        }
        if (spaceEntry.amenities != amenities) {
            changes.push(`amenities`)
        }
        if (changes.length > 0) {
            const record = await this.client.updateSpace(updatedSpace)
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
    }
    catch (e) {
        console.log("Error fetching spaces", e)
    }
  }

}
