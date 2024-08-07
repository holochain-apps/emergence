import {
  type AppClient,
  encodeHashToBase64,
  decodeHashFromBase64,
  type DnaHash,
  type CellInfo,
  CellType,
  type CellId,
  type ProvisionedCell,
  type AppInfo,
} from '@holochain/client';
import { get, writable, type Writable } from "svelte/store";
import { ProfilesClient, ProfilesStore } from '@holochain-open-dev/profiles';
import type { WeaveClient } from '@lightningrodlabs/we-applet';
import { v7 as uuidv7 } from "uuid";
import { asyncDerived, type Loadable } from '@square/svelte-store';
import { hashEqual } from "../emergence/emergence/utils";
import { EmergenceStore } from './emergence-store';
import { APP_ID, ROLE_NAME, ZOME_NAME } from '../emergence/emergence/types';
import { EmergenceClient } from '../emergence-client';
import { FileStorageClient } from '@holochain-open-dev/file-storage';

export interface CellInfoNormalized {
  originalDnaHash: Uint8Array;
  cellId: CellId;
  cellInfo: CellInfo;
  roleName: string;
  name: string;
  networkSeed: string;
  displayName: string;
}

export class CloneManagerStore {
  activeDnaHash: Writable<DnaHash>;
  activeCellInfoNormalized: Loadable<CellInfoNormalized>;
  activeStore: Loadable<EmergenceStore>;
  
  constructor(
    public client: AppClient,
    public weaveClient?: WeaveClient,
  ) {
    this.activeDnaHash = writable<DnaHash>();
    this.activeDnaHash.subscribe(this._saveActiveDnaHash);
    this.activeCellInfoNormalized = asyncDerived(this.activeDnaHash, async ($activeDnaHash) => {
      const appInfo = await this.client.appInfo();
      
      if(!$activeDnaHash) {
        await this._loadActiveDnaHash(appInfo);
        $activeDnaHash = get(this.activeDnaHash);
      }
      
      const cellInfo = this._findCellInfoWithDnaHash(appInfo, $activeDnaHash);
      return this._makeCellInfoNormalized(appInfo.cell_info[ROLE_NAME][0][CellType.Provisioned], cellInfo)
    });
    this.activeStore = asyncDerived([this.activeDnaHash, this.activeCellInfoNormalized], async ([$activeDnaHash, $activeCellInfoNormalized]) => {
      await this.activeCellInfoNormalized.load();
      
      const profilesClient = this.weaveClient !== undefined ? weaveClient.renderInfo.profilesClient : new ProfilesClient(this.client, $activeCellInfoNormalized.roleName);
      const profilesStore = new ProfilesStore(profilesClient, {
        avatarMode: "avatar-optional",
        minNicknameLength: 3,
        additionalFields: [
          {
            name: "location",
            label: "Location",
            required: false, 
          },
          {
            name: "bio",
            label: "Bio",
            required: false,
          }
        ], 
      });
      const fileStorageClient = new FileStorageClient(this.client, ROLE_NAME);
      const emegenceClient = new EmergenceClient(this.client, ROLE_NAME, ZOME_NAME);

      return new EmergenceStore(this, emegenceClient, profilesStore, fileStorageClient, $activeDnaHash);
    });
  }
  
  async list(): Promise<CellInfoNormalized[]> {
    const appInfo = await this.client.appInfo();
    const cells = appInfo.cell_info[ROLE_NAME];
    
    let cellsNormalized =  cells.map((cell) => this._makeCellInfoNormalized(appInfo.cell_info[ROLE_NAME][0][CellType.Provisioned], cell));
    cellsNormalized.sort((a,b) => a.networkSeed < b.networkSeed ? -1 : 1);
    
    return cellsNormalized;
  }
  
  create(name: string) {
    return this.client.createCloneCell({
      name,
      role_name: ROLE_NAME,
      modifiers: {
        network_seed: uuidv7(),
      }
    });
  }
  
  join(name: string, networkSeed: string) {
    return this.client.createCloneCell({
      name,
      role_name: ROLE_NAME,
      modifiers: {
        network_seed: networkSeed 
      }
    });
  }
  
  disable(cellId: CellId) {
    return this.client.disableCloneCell({ clone_cell_id: cellId });
  }
  
  enable(cellId: CellId) {
    return this.client.enableCloneCell({ clone_cell_id: cellId })
  }
  
  activate(cellId: CellId) {
    this.activeDnaHash.set(cellId[0]);
  }
  
  private async _loadActiveDnaHash(appInfo: AppInfo) {
    // Load active dna hash from local storage
    const activeDnaHashB64 = localStorage.getItem("activeDnaHash");    

    // Confirm that loaded dna hash is valid and cell exists
    if(activeDnaHashB64 !== null && activeDnaHashB64 !== undefined) {
      const activeDnaHash = decodeHashFromBase64(activeDnaHashB64);
      const matchingCellInfo = this._findCellInfoWithDnaHash(appInfo, activeDnaHash);

      if(matchingCellInfo !== undefined) {
        this.activeDnaHash.set(activeDnaHash);
        return;
      }
    }
      
    // Otherwise, set active dna hash to default
    this._setDefaultActiveDnaHash(appInfo);
  }

  private _setDefaultActiveDnaHash(appInfo: AppInfo) {
    const defaultDnaHash = appInfo.cell_info[ROLE_NAME][0][CellType.Provisioned].cell_id[0];
    this.activeDnaHash.set(defaultDnaHash);
  }
  
  private _saveActiveDnaHash(val: DnaHash) {
    if(val !== undefined && val !== null) {
      localStorage.setItem("activeDnaHash", encodeHashToBase64(val));
    }
  }

  private _findCellInfoWithDnaHash(appInfo: AppInfo, dnaHash: Uint8Array): CellInfo | undefined {
    const cellInfo = appInfo.cell_info[ROLE_NAME].find((cellInfo: CellInfo) => {
      if(CellType.Provisioned in cellInfo) {
        return hashEqual(cellInfo[CellType.Provisioned].cell_id[0], dnaHash);
      } else if(CellType.Cloned in cellInfo) {
        return hashEqual(cellInfo[CellType.Cloned].cell_id[0], dnaHash);
      }
    });

    return cellInfo;
  }

  private _makeCellInfoNormalized(provisionedCellInfo: ProvisionedCell, cell: CellInfo ) {
    const originalDnaHash = provisionedCellInfo.cell_id[0];

    if(CellType.Provisioned in cell) {
      return {
        originalDnaHash,
        cellId: cell[CellType.Provisioned].cell_id, 
        cellInfo: cell,
        roleName: ROLE_NAME,
        name: cell[CellType.Provisioned].name,
        networkSeed: cell[CellType.Provisioned].dna_modifiers.network_seed,
        displayName: cell[CellType.Provisioned].dna_modifiers.network_seed === "" ? "Public" : cell[CellType.Provisioned].name,
      };
    } else if(CellType.Cloned in cell) {
      return {
        originalDnaHash,
        cellId: cell[CellType.Cloned].cell_id,
        cellInfo: cell,
        roleName: cell[CellType.Cloned].clone_id,
        name: cell[CellType.Cloned].name,
        networkSeed: cell[CellType.Cloned].dna_modifiers.network_seed,
        displayName: cell[CellType.Cloned].dna_modifiers.network_seed === "" ? "Public" : cell[CellType.Cloned].name,
      };
    }
  }
}
