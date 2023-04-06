// import {  } from './types';

import type {
    AppAgentCallZomeRequest,
    AppAgentClient,
} from '@holochain/client';
import type { Slot } from './emergence/emergence/types';
// import { UnsubscribeFunction } from 'emittery';


export class EmergenceClient {
  constructor(
    public client: AppAgentClient,
    public roleName: string,
    public zomeName = 'emergence'
  ) {}

//   on(
//     eventName: 'signal',
//     listener: (eventData: HeardSignal) => void | Promise<void>
//   ): UnsubscribeFunction {
//     return this.client.on(eventName, async signal => {
//       if (
//         (await isSignalFromCellWithRole(this.client, this.roleName, signal)) &&
//         this.zomeName === signal.zome_name
//       ) {
//         listener(signal.payload as HeardSignal);
//       }
//     });
//   }
  getSlots() : Promise<Array<Slot>> {
    return this.callZome('get_slots',null,)
  }

  private callZome(fn_name: string, payload: any) {
    const req: AppAgentCallZomeRequest = {
      role_name: this.roleName,
      zome_name: this.zomeName,
      fn_name,
      payload,
    };
    return this.client.callZome(req);
  }
  /** Scene */

//   async createScene(key: string, title: string): Promise<EntryRecord<Scene>> {
//     const createScene: StartSceneInput = {
//       title,
//       key
//     }
//     const record: Record = await this.callZome('start_scene', createScene);
//     return new EntryRecord(record);
//   }
  
//   async getScene(sceneHash: ActionHash): Promise<EntryRecord<Scene> | undefined> {
//     const record: Record = await this.callZome('get_scene', sceneHash);
//     return record ? new EntryRecord(record) : undefined;
//   }


}
