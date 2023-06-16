// import {  } from './types';

import { EntryRecord } from '@holochain-open-dev/utils';
import {
  AppAgentWebsocket,
  type ActionHash,
  type AgentPubKey,
  type EntryHash,
  type HoloHash,
  type CellId,
  type AppAgentClient,
  type AppAgentCallZomeRequest
} from '@holochain/client';
import type { AnyAgent, FeedElem, GetFeedInput, GetStuffInput, GetStuffOutput, Info, Note, ProxyAgent, Relation, RelationInfo, Session, SessionTypeID, Settings, SiteMap, Space, TagUse, TimeWindow, UpdateNoteInput, UpdateProxyAgentInput, UpdateSessionInput, UpdateSiteMapInput, UpdateSpaceInput } from './emergence/emergence/types.js';
import { wait } from './emergence/emergence/utils.js';
// import { UnsubscribeFunction } from 'emittery';


export class EmergenceClient {
  reconnecting = false

  constructor(
    public cellId: CellId,
    public url: string,
    public installed_app_id,
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
    return await this.callZome('create_relations', relations)
  }

  async getRelations(hash: HoloHash) : Promise<Array<RelationInfo>> {
    return await this.callZome('get_relations', hash)
  }

  async deleteRelations(relations: Array<ActionHash>) {
    return await this.callZome('delete_relations', relations)
  }

  async getFeed(filter: GetFeedInput) : Promise<Array<FeedElem>> {
    const relations: Array<RelationInfo> = await this.callZome('get_feed', filter)
    return relations.map(ri => {
      const r = ri.relation
      const author = r.src
      author[1] =32
        return {
          hash: ri.create_link_hash,
          timestamp: ri.timestamp/1000,
          author,
          about: r.dst,
          type: parseInt(r.content.path.split(".")[1]),
          detail: JSON.parse(r.content.data)
    }});
  }

  async getTags() : Promise<Array<TagUse>> {
    return await this.callZome('get_tags', undefined)
  }

  async createTimeWindow(timeWindow: TimeWindow) : Promise<ActionHash> {
    return await this.callZome('create_time_window', timeWindow)
  }

  async getTimeWindows() : Promise<Array<TimeWindow>> {
    return await this.callZome('get_time_windows',null)
  }

  async deleteTimeWindow(timeWindow: TimeWindow) : Promise<undefined> {
    return await this.callZome('delete_time_window', timeWindow)
  }

  genKey = () => {
    const keyChars = 'ABCDEFGHJKLMNPQRSTVXYZ23456789';
    let key = '';
    for (let x = 0; x < 5; x += 1) {
      key += keyChars[Math.floor(Math.random() * (keyChars.length - 1))];
    }
    return key
  }
  
  async createSession(sessionType: SessionTypeID, title: string, amenities: number, description: string, leaders:Array<AnyAgent>, smallest: number, largest: number, duration: number) : Promise<EntryRecord<Session>> {
    const sessionEntry: Session = { 
        key: this.genKey(),
        session_type: sessionType,
        title,
        description,
        leaders,
        smallest,
        largest,
        duration,
        amenities,
        trashed: false
      };
    
    return new EntryRecord(await this.callZome('create_session', sessionEntry))
  }

  async updateSession(update: UpdateSessionInput) : Promise<EntryRecord<Session>> {
    return new EntryRecord(await this.callZome('update_session', update))
  }

  async deleteSession(actionHash: ActionHash) {
    return await this.callZome('delete_session', actionHash)
  }

  async getSessions() : Promise<Array<Info<Session>>> {
    const sessions = await this.callZome('get_all_sessions',null)
    return sessions.map(r => {
        let info: Info<Session> = {
        original_hash: r.original_hash,
        record: new EntryRecord(r.record), 
        relations: r.relations}

        return info
    });
  }

  async createSpace(key: string, name: string, description:string, stewards:Array<AgentPubKey>, capacity:number, amenities: number, tags: Array<string>, pic: EntryHash | undefined) : Promise<EntryRecord<Space>> {
    const spaceEntry: Space = { 
        key, name, description, stewards, capacity, amenities, tags, trashed: false, pic
      };
    
    return new EntryRecord(await this.callZome('create_space', spaceEntry))
  }

  async updateSpace(update: UpdateSpaceInput) : Promise<EntryRecord<Space>> {
    return await new EntryRecord(await this.callZome('update_space', update))
  }

  async deleteSpace(actionHash: ActionHash) {
    return await this.callZome('delete_space', actionHash)
  }

  async getSpaces() : Promise<Array<Info<Space>>> {
    const spaces = await this.callZome('get_all_spaces',null)
    return spaces.map(r => {
        const info: Info<Space> = {
        original_hash: r.original_hash,
        record: new EntryRecord(r.record), 
        relations: r.relations}
        return info
    }).filter(r=>!r.record.entry.trashed);
  }

  async createNote(text: string, session: ActionHash, tags: Array<string>, pic: EntryHash | undefined) : Promise<EntryRecord<Note>> {
    const noteEntry: Note = { 
        text,
        session,
        pic,
        tags,
        trashed: false,
      };
    
    return new EntryRecord(await this.callZome('create_note', noteEntry))
  }

  async updateNote(update: UpdateNoteInput) : Promise<EntryRecord<Note>> {
    return new EntryRecord(await this.callZome('update_note', update))
  }

  async deleteNote(actionHash: ActionHash) {
    return await this.callZome('delete_note', actionHash)
  }

  async createSiteMap(text: string, pic: EntryHash | undefined, tags: Array<string>) : Promise<EntryRecord<SiteMap>> {
    const mapEntry: SiteMap = { 
        text,
        pic,
        tags,
      };
    
    return new EntryRecord(await this.callZome('create_map', mapEntry))
  }

  async updateSiteMap(update: UpdateSiteMapInput) : Promise<EntryRecord<SiteMap>> {
    return new EntryRecord(await this.callZome('update_map', update))
  }

  async deleteSiteMap(actionHash: ActionHash) {
    return await this.callZome('delete_map', actionHash)
  }

  async getSiteMaps() : Promise<Array<Info<SiteMap>>> {
    const maps = await this.callZome('get_all_maps',null)
    return maps.map(r => {
        const info: Info<SiteMap> = {
        original_hash: r.original_hash,
        record: new EntryRecord(r.record), 
        relations: r.relations}
        return info
    }).filter(r=>!r.record.entry.trashed);
  }


  async createProxyAgent(nickname: string, bio: string, location: string,  pic: EntryHash | undefined) : Promise<EntryRecord<ProxyAgent>> {
    const proxyAgentEntry: ProxyAgent = { 
        nickname,
        bio,
        location,
        pic,
      };
    
    return new EntryRecord(await this.callZome('create_proxy_agent', proxyAgentEntry))
  }

  async updateProxyAgent(update: UpdateProxyAgentInput) : Promise<EntryRecord<ProxyAgent>> {
    return new EntryRecord(await this.callZome('update_proxy_agent', update))
  }

  async deleteProxyAgent(actionHash: ActionHash) {
    return await this.callZome('delete_proxy_agent', actionHash)
  }

  async getProxyAgents() : Promise<Array<Info<ProxyAgent>>> {
    const agents = await this.callZome('get_all_proxy_agents',null)
    return agents.map(r => {
        const info: Info<ProxyAgent> = {
        original_hash: r.original_hash,
        record: new EntryRecord(r.record), 
        relations: r.relations}
        return info
    });
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

  async setSettings(input: Settings) : Promise<ActionHash> {
    return await this.callZome('set_settings', input)
  }

  async getSettings() : Promise<Settings> {
    return await this.callZome('get_settings', undefined)
  }

  private async callZome(fn_name: string, payload: any) {
    const req: AppAgentCallZomeRequest = {
      role_name: this.roleName,
      zome_name: this.zomeName,
      fn_name,
      provenance: this.cellId[1],
      payload,
    };
    try {
      while(this.reconnecting) {
        console.log("reconnecting, waiting 1 second")
        await wait(1000)
      }
      return await this.client.callZome(req, 30000);
    } catch(e) {
      console.log(`Got error on zome call to ${fn_name}:`, e.message)
      if (e.message == "Socket is not open") {
        if (!this.reconnecting) {
          console.log("attempting to reconnect...")
          this.reconnecting = true
          this.client = await AppAgentWebsocket.connect(this.url, this.installed_app_id);
          console.log("got a new client, retrying zome call...")
          const result =  await this.client.callZome(req, 30000);
          this.reconnecting = false
          return result
        } {
          console.log("allready reconnecting!")
        }
        
      } else {
        throw(e)
      }
    }
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
