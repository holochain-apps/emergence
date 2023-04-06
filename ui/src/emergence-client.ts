// import {  } from './types';

import type {
    Action,
    ActionHash,
    AppAgentCallZomeRequest,
    AppAgentClient,
} from '@holochain/client';
import type { Session, TimeWindow, Space } from './emergence/emergence/types';
import { EntryRecord } from '@holochain-open-dev/utils';
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

  async createTimeWindow(timeWindow: TimeWindow) : Promise<ActionHash> {
    return this.callZome('create_time_window', timeWindow)
  }

  getTimeWindows() : Promise<Array<TimeWindow>> {
    return this.callZome('get_time_windows',null)
  }

  genKey = () => {
    const keyChars = 'ABCDEFGHJKLMNPQRSTVXYZ23456789';
    let key = '';
    for (let x = 0; x < 5; x += 1) {
      key += keyChars[Math.floor(Math.random() * (keyChars.length - 1))];
    }
    return key
  }
  
  async createSession(title: string) : Promise<EntryRecord<Session>> {
    const sessionEntry: Session = { 
        key: this.genKey(),
        title: title!,
      };
    
    return new EntryRecord(await this.callZome('create_session', sessionEntry))
  }

  async getSessions() : Promise<Array<EntryRecord<Session>>> {
    const records = await this.callZome('get_all_sessions',null)
    return records.map(r => new EntryRecord(r));
  }

  async createSpace(name: string, description:string) : Promise<EntryRecord<Space>> {
    const spaceEntry: Space = { 
        name, description
      };
    
    return new EntryRecord(await this.callZome('create_space', spaceEntry))
  }
  async getSpaces() : Promise<Array<EntryRecord<Space>>> {
    const records = await this.callZome('get_all_spaces',null)
    return records.map(r => new EntryRecord(r));
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
