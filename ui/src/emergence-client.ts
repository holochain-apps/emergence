// import {  } from './types';

import type {
    Action,
    ActionHash,
    AgentPubKey,
    AppAgentCallZomeRequest,
    AppAgentClient,
    HoloHash,
} from '@holochain/client';
import type { Session, TimeWindow, Space, Relation, UpdateSessionInput, FeedElem, UpdateSpaceInput, Info, Note, UpdateNoteInput, GetStuffInput, GetStuffOutput } from './emergence/emergence/types';
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


  async createRelations(relations: Array<Relation>) : Promise<ActionHash> {
    return this.callZome('create_relations', relations)
  }

  getRelations(hash: HoloHash) : Promise<Array<Relation>> {
    return this.callZome('get_relations', hash)
  }

  async getFeed() : Promise<Array<FeedElem>> {
    const relations: Array<Relation> = await this.callZome('get_feed', {filter: 0})
    return relations.map(r => {
      console.log("feed item", r.content)

      const author = r.src
      author[1] =32
        return {
        author,
        about: r.dst,
        type: parseInt(r.content.path.split(".")[1]),
        detail: JSON.parse(r.content.data)
    }});

  }

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
  
  async createSession(title: string, amenities: number, description: string, leaders:Array<AgentPubKey>, smallest: number, largest: number, duration: number) : Promise<EntryRecord<Session>> {
    const sessionEntry: Session = { 
        key: this.genKey(),
        title,
        description,
        leaders,
        smallest,
        largest,
        duration,
        amenities,
      };
    
    return new EntryRecord(await this.callZome('create_session', sessionEntry))
  }

  async updateSession(update: UpdateSessionInput) : Promise<EntryRecord<Session>> {
    return new EntryRecord(await this.callZome('update_session', update))
  }

  deleteSession(actionHash: ActionHash) {
    return this.callZome('delete_session', actionHash)
  }

  async getSessions() : Promise<Array<Info<Session>>> {
    const sessions = await this.callZome('get_all_sessions',null)
    return sessions.map(r => {
        const info: Info<Session> = {
        original_hash: r.original_hash,
        record: new EntryRecord(r.record), 
        relations: r.relations}
        return info
    });
  }

  async createSpace(name: string, description:string, capacity:number, amenities: number) : Promise<EntryRecord<Space>> {
    const spaceEntry: Space = { 
        name, description, capacity, amenities
      };
    
    return new EntryRecord(await this.callZome('create_space', spaceEntry))
  }

  async updateSpace(update: UpdateSpaceInput) : Promise<EntryRecord<Space>> {
    return new EntryRecord(await this.callZome('update_space', update))
  }

  deleteSpace(actionHash: ActionHash) {
    return this.callZome('delete_space', actionHash)
  }

  async getSpaces() : Promise<Array<Info<Space>>> {
    const spaces = await this.callZome('get_all_spaces',null)
    return spaces.map(r => {
        const info: Info<Space> = {
        original_hash: r.original_hash,
        record: new EntryRecord(r.record), 
        relations: r.relations}
        return info
    });
  }

  async createNote(text: string) : Promise<EntryRecord<Note>> {
    const noteEntry: Note = { 
        text
      };
    
    return new EntryRecord(await this.callZome('create_note', noteEntry))
  }

  async updateNote(update: UpdateNoteInput) : Promise<EntryRecord<Note>> {
    return new EntryRecord(await this.callZome('update_space', update))
  }

  deleteNote(actionHash: ActionHash) {
    return this.callZome('delete_space', actionHash)
  }

  async getStuff(input: GetStuffInput) : Promise<GetStuffOutput> {
    const stuff = await this.callZome('get_stuff', input)
    if (stuff.sessions) {
      stuff.sessions = stuff.sessions.map(s => {
        if (s) {
          const info: Info<Session> = {
          original_hash: s.original_hash,
          record: new EntryRecord(s.record), 
          relations: s.relations}
          return info
          }
          return undefined
    })      
    }
    if (stuff.spaces) {
      stuff.spaces = stuff.spaces.map(s => {
        if (s) {
          const info: Info<Space> = {
          original_hash: s.original_hash,
          record: new EntryRecord(s.record), 
          relations: s.relations}
          return info
          }
          return undefined
    })      
    }
    if (stuff.notes) {
      stuff.notes = stuff.notes.map(s => {
        if (s) {
          const info: Info<Note> = {
          original_hash: s.original_hash,
          record: new EntryRecord(s.record), 
          relations: s.relations}
          return info
          }
          return undefined
    })      
    }
    return stuff
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
