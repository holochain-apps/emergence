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
import { FeedType, type FeedElem, type Info, type Session, type Slot, type Space, type TimeWindow, type UpdateSessionInput, type UpdateSpaceInput } from './emergence/emergence/types';

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

  async slot(session: ActionHash, space:ActionHash, window: TimeWindow) {
    this.client.createRelations([
        {   src: session,
            dst: space,
            content:  {
                path: "session.space",
                data: JSON.stringify(window)
            }
        },
        {   src: space,
            dst: session,
            content:  {
                path: "space.sessions",
                data: JSON.stringify(window)
            }
        },
        {   src: session, // should be agent key
            dst: session,
            content:  {
                path: `feed.${FeedType.SlotSession}`,
                data: JSON.stringify({space:encodeHashToBase64(space),window})
            }
        },
    ]
    )
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

  async createSession(title: string, amenities: number): Promise<EntryRecord<Session>> {
    const record = await this.client.createSession(title, amenities)
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


  async updateSession(sessionHash: ActionHash, title: string, amenities: number): Promise<EntryRecord<Session>> {
    const sessionIdx = this.getSessionIdx(sessionHash)
    if (sessionIdx >= 0) {
        const session = get(this.sessions)[sessionIdx]
        const update: UpdateSessionInput = { 
            original_session_hash: session.original_hash,
            previous_session_hash: session.record.record.signed_action.hashed.hash,
            updated_title: title!,
            updated_amenities: amenities,
        };
        const record = await this.client.updateSession(update)
        const sessionEntry = session.record.entry
        let changes = []
        if (sessionEntry.title != title) {
            changes.push(`title -> ${title}`)
        }
        if (sessionEntry.amenities != amenities) {
            changes.push(`amenities`)
        }
        this.client.createRelations([
            {   src: record.actionHash, // should be agent key
                dst: record.actionHash,
                content:  {
                    path: `feed.${FeedType.SessionUpdate}`,
                    data: JSON.stringify({title: sessionEntry.title, changes})
                }
            },
        ])
        this.sessions.update((sessions) => {
            sessions[sessionIdx].record = record
            return sessions
        })
        return record
    } else {
        throw new Error(`could not find session`)
    }
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
        const record = await this.client.updateSpace(updatedSpace)
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
    } else {
        throw new Error(`could not find space`)
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
