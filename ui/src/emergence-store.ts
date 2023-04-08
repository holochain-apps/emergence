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
import { type Session, type TimeWindow, type Space, type SessionPlus, type UpdateSessionInput, type Slot, type FeedElem, FeedType } from './emergence/emergence/types';
import { get, writable, type Writable } from 'svelte/store';
import type { EntryRecord } from '@holochain-open-dev/utils';

TimeAgo.addDefaultLocale(en)

export class EmergenceStore {
  timeAgo = new TimeAgo('en-US')
  timeWindows: Writable<Array<TimeWindow>> = writable([])
  sessions: Writable<Array<SessionPlus>> = writable([])
  spaces: Writable<Array<EntryRecord<Space>>> = writable([])
  feed: Writable<Array<FeedElem>> = writable([])
  constructor(public client: EmergenceClient, public profilesStore: ProfilesStore, public myPubKey: AgentPubKey) {}
  
  getSessionIdx(sessionHash: ActionHash) : number {
    const b64 = encodeHashToBase64(sessionHash)
    const sessions = get(this.sessions)
    return sessions.findIndex((s)=> encodeHashToBase64(s.original_session_hash) === b64)
  }

  getSession(sessionHash: ActionHash) : SessionPlus | undefined {
    const sessionIdx = this.getSessionIdx(sessionHash)
    if (sessionIdx == -1) return undefined
    return get(this.sessions)[sessionIdx]
  }

  getSpaceIdx(spaceHash: ActionHash) : number {
    const b64 = encodeHashToBase64(spaceHash)
    const spaces = get(this.spaces)
    return spaces.findIndex((s)=> encodeHashToBase64(s.actionHash) === b64)
  }

  getSpace(spaceHash: ActionHash) : EntryRecord<Space> | undefined {
    const spaceIdx = this.getSpaceIdx(spaceHash)
    console.log("XX",spaceIdx)
    if (spaceIdx == -1) return undefined
    return get(this.spaces)[spaceIdx]
  }

  getSessionSlot(session: SessionPlus) : Slot|undefined {
    for (const r of session.relations) {
        if (r.content.path == "session/space") {
            const window = JSON.parse(r.content.data) as TimeWindow
            return {
                space: r.dst,
                window
            }
        }
    }
    return undefined
  }
//   getSessionAmenities(session: SessionPlus) : number {
//     for (const r of session.relations) {
//         if (r.content.path == "session/amenities") {
//             return JSON.parse(r.content.data) as number
//         }
//     }
//     return undefined
//   }    
//   async setAmenities(session: ActionHash, amenities:number) {
//     this.client.createRelations(
//         [{   src: session,
//             dst: session,
//             content:  {
//                 path: "session/amenities",
//                 data: JSON.stringify(amenities)
//             }
//         }]
//     )
//   }

  async slot(session: ActionHash, space:ActionHash, time: TimeWindow) {
    this.client.createRelations([
        {   src: session,
            dst: space,
            content:  {
                path: "session/space",
                data: JSON.stringify(time)
            }
        },
        {   src: space,
            dst: session,
            content:  {
                path: "space/sessions",
                data: JSON.stringify(time)
            }
        }
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
    this.feed.update((feed) => {
        feed.push({
            author: this.client.client.myPubKey,
            type: FeedType.SessionNew,
            detail: record.actionHash
        })
        return feed
    } )

    this.fetchSessions()
    return record
  }


  async updateSession(sessionHash: ActionHash, title: string, amenities: number): Promise<EntryRecord<Session>> {
    const sessionIdx = this.getSessionIdx(sessionHash)
    if (sessionIdx >= 0) {
        const session = get(this.sessions)[sessionIdx]
        const update: UpdateSessionInput = { 
            original_session_hash: session.original_session_hash,
            previous_session_hash: session.session.record.signed_action.hashed.hash,
            updated_title: title!,
            updated_amenities: amenities,
        };
        const record = await this.client.updateSession(update)
        this.sessions.update((sessions) => {
            sessions[sessionIdx].session = record
            return sessions
        })
        return record
    } else {
        throw new Error(`could not find session`)
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

}
