// import {  } from './types';

import type {
    AgentPubKey,
} from '@holochain/client';

import type { EmergenceClient } from './emergence-client';

import TimeAgo from "javascript-time-ago"
import en from 'javascript-time-ago/locale/en'
import type { ProfilesStore } from '@holochain-open-dev/profiles';
import type { Slot } from './emergence/emergence/types';
import { writable, type Writable } from 'svelte/store';

TimeAgo.addDefaultLocale(en)

export class EmergenceStore {
  timeAgo = new TimeAgo('en-US')
  slots:Writable<Array<Slot>> = writable([])
  constructor(public client: EmergenceClient, public profilesStore: ProfilesStore, public myPubKey: AgentPubKey) {}
  
  async fetchSlots() {
    const slots = await this.client.getSlots()
    this.slots.update((n) => {return slots} )
  }
  /** Scene */

//   scenes = new LazyHoloHashMap((sceneHash: EntryHash) =>
//     lazyLoadAndPoll(async () => this.client.getScene(sceneHash), 1000)
//   );
  
//   allScenes = lazyLoadAndPoll(async () => {
//     const records =  await this.client.getFilteredScenes({titled_only: false});
//     return records
//    // return records.map(r => r.actionHash);
//   }, 1000);
  


}
