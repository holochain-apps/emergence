// import {  } from './types';

import type {
    ActionHash,
    AgentPubKey,
} from '@holochain/client';

import type { EmergenceClient } from './emergence-client';

import TimeAgo from "javascript-time-ago"
import en from 'javascript-time-ago/locale/en'
import type { ProfilesStore } from '@holochain-open-dev/profiles';
import type { Session, Slot, Space } from './emergence/emergence/types';
import { writable, type Writable } from 'svelte/store';
import type { EntryRecord } from '@holochain-open-dev/utils';

TimeAgo.addDefaultLocale(en)

export class EmergenceStore {
  timeAgo = new TimeAgo('en-US')
  slots: Writable<Array<Slot>> = writable([])
  sessions: Writable<Array<EntryRecord<Session>>> = writable([])
  spaces: Writable<Array<EntryRecord<Space>>> = writable([])
  constructor(public client: EmergenceClient, public profilesStore: ProfilesStore, public myPubKey: AgentPubKey) {}
  

  async createSlot(start: Date, length: number) : Promise<ActionHash> {
    const slot: Slot = { 
        start: parseInt((start.getTime()).toFixed(0)),
        length: length!,
      };
    const actionHash = await this.client.createSlot(slot)
    this.fetchSlots()
    return actionHash
  }

  async fetchSlots() {
    const slots = await this.client.getSlots()
    this.slots.update((n) => {return slots} )
  }

  async createSession(title: string): Promise<EntryRecord<Session>> {
    const record = await this.client.createSession(title)
    this.fetchSessions()
    return record
  }

  async fetchSessions() {
    try {
        const sessions = await this.client.getSessions()
        this.sessions.update((n) => {return sessions} )
    }
    catch (e) {
        console.log("Error fetching sessions", e)
    }
  }

  async createSpace(name: string, description: string): Promise<EntryRecord<Space>> {
    const record = await this.client.createSpace(name, description)
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
