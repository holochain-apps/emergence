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
import type { WeaveClient } from '@theweave/api';
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
  needsOnboarding: Writable<boolean>;
  // Non-empty while the active cell's init() warmup is running; the UI shows it as
  // a first-time-setup screen.
  setupStatus: Writable<string> = writable("");

  constructor(
    public client: AppClient,
    public weaveClient?: WeaveClient,
  ) {
    this.needsOnboarding = writable(false);
    this.activeDnaHash = writable<DnaHash>();
    this.activeDnaHash.subscribe(this._saveActiveDnaHash);
    this.activeCellInfoNormalized = asyncDerived(this.activeDnaHash, async ($activeDnaHash) => {
      const appInfo = await this.client.appInfo();

      if(!$activeDnaHash) {
        await this._loadActiveDnaHash(appInfo);
        $activeDnaHash = get(this.activeDnaHash);
      }
      if (!$activeDnaHash) {
        return undefined;
      }

      const cellInfo = this._findCellInfoWithDnaHash(appInfo, $activeDnaHash);
      return this._makeCellInfoNormalized(appInfo.cell_info[ROLE_NAME][0].value as ProvisionedCell, cellInfo)
    });
    this.activeStore = asyncDerived([this.activeDnaHash, this.activeCellInfoNormalized], async ([$activeDnaHash, $activeCellInfoNormalized]) => {
      if (!$activeDnaHash || !$activeCellInfoNormalized) {
        return undefined;
      }
      await this.activeCellInfoNormalized.load();

      const roleName = $activeCellInfoNormalized.roleName;

      const profilesClient = this.weaveClient !== undefined ? weaveClient.renderInfo.profilesClient : new ProfilesClient(this.client, roleName);
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
      const fileStorageClient = new FileStorageClient(this.client, roleName);
      const emegenceClient = new EmergenceClient(this.client, roleName, ZOME_NAME);

      // Drive the cell's init() to completion with a single awaited call before the
      // store is exposed. The first zome call to a cold cell runs init() and compiles
      // all the zome wasms (tens of seconds); doing it alone here keeps the later
      // parallel fan-out (emergence sync + profiles `myProfile`) from racing init()
      // and hitting holochain's "init() blocking this zome call >30s, giving up".
      this.setupStatus.set("Running first-time setup (compiling wasms — this can take a minute)…");
      try {
        await emegenceClient.getSettings();
      } catch (e) {
        console.warn("init warmup failed (continuing):", e);
      }
      this.setupStatus.set("");

      return new EmergenceStore(this, emegenceClient, profilesStore, fileStorageClient, $activeDnaHash);
    });
  }
  
  async hasClones(): Promise<boolean> {
    const appInfo = await this.client.appInfo();
    const cells = appInfo.cell_info[ROLE_NAME];
    return cells.some((cell) => cell.type === CellType.Cloned);
  }

  async listEnabledClones(): Promise<CellInfoNormalized[]> {
    const appInfo = await this.client.appInfo();
    const cells = appInfo.cell_info[ROLE_NAME];
    const provisioned = appInfo.cell_info[ROLE_NAME][0].value as ProvisionedCell;

    return cells
      .filter((cell) => cell.type === CellType.Cloned && cell.value.enabled)
      .map((cell) => this._makeCellInfoNormalized(provisioned, cell))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async list(): Promise<CellInfoNormalized[]> {
    const appInfo = await this.client.appInfo();
    const cells = appInfo.cell_info[ROLE_NAME];

    if (appInfo.cell_info[ROLE_NAME][0].type !== CellType.Provisioned) {
      throw new Error("incorrect cell type, must be provisioned");
    }
    let cellsNormalized = cells.map((cell) => this._makeCellInfoNormalized(appInfo.cell_info[ROLE_NAME][0].value as ProvisionedCell, cell));

    // In non-Weave mode, filter out the provisioned cell
    if (this.weaveClient === undefined) {
      cellsNormalized = cellsNormalized.filter((cell) => cell.cellInfo.type !== CellType.Provisioned);
    }

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
    return this.client.disableCloneCell({ clone_cell_id: { type: "dna_hash", value: cellId[0] }});
  }

  enable(cellId: CellId) {
    return this.client.enableCloneCell({ clone_cell_id: {type: "dna_hash", value: cellId[0] }})
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
        // In non-Weave mode, reject if this points to the provisioned cell
        if (this.weaveClient === undefined && matchingCellInfo.type === CellType.Provisioned) {
          // Fall through to _setDefaultActiveDnaHash
        } else {
          this.activeDnaHash.set(activeDnaHash);
          return;
        }
      }
    }
      
    // Otherwise, set active dna hash to default
    this._setDefaultActiveDnaHash(appInfo);
  }

  private _setDefaultActiveDnaHash(appInfo: AppInfo) {
    // In Weave mode, always use the provisioned cell
    if (this.weaveClient !== undefined) {
      if (appInfo.cell_info[ROLE_NAME][0].type !== CellType.Provisioned) {
        throw new Error("incorrect cell type, must be provisioned");
      }
      const defaultDnaHash = appInfo.cell_info[ROLE_NAME][0].value.cell_id[0];
      this.activeDnaHash.set(defaultDnaHash);
      return;
    }

    // In non-Weave mode, find first enabled clone
    const clones = appInfo.cell_info[ROLE_NAME].filter(
      (c: CellInfo) => c.type === CellType.Cloned && c.value.enabled
    );
    const firstClone = clones[0];
    if (firstClone && firstClone.type === CellType.Cloned) {
      this.activeDnaHash.set(firstClone.value.cell_id[0]);
    } else {
      // No clones available - signal onboarding needed
      this.needsOnboarding.set(true);
    }
  }
  
  private _saveActiveDnaHash(val: DnaHash) {
    if(val !== undefined && val !== null) {
      localStorage.setItem("activeDnaHash", encodeHashToBase64(val));
    }
  }

  private _findCellInfoWithDnaHash(appInfo: AppInfo, dnaHash: Uint8Array): CellInfo | undefined {
    const cellInfo = appInfo.cell_info[ROLE_NAME].find((cellInfo: CellInfo) => {
      if(cellInfo.type === CellType.Provisioned) {
        return hashEqual(cellInfo.value.cell_id[0], dnaHash);
      } else if(cellInfo.type === CellType.Cloned) {
        return hashEqual(cellInfo.value.cell_id[0], dnaHash);
      }
    });

    return cellInfo;
  }

  private _makeCellInfoNormalized(provisionedCellInfo: ProvisionedCell, cell: CellInfo ) {
    const originalDnaHash = provisionedCellInfo.cell_id[0];

    if(cell.type === CellType.Provisioned) {
      return {
        originalDnaHash,
        cellId: cell.value.cell_id, 
        cellInfo: cell,
        roleName: ROLE_NAME,
        name: cell.value.name,
        networkSeed: cell.value.dna_modifiers.network_seed,
        displayName: cell.value.dna_modifiers.network_seed === "" ? "Public" : cell.value.name,
      };
    } else if(cell.type === CellType.Cloned) {
      return {
        originalDnaHash,
        cellId: cell.value.cell_id,
        cellInfo: cell,
        roleName: cell.value.clone_id,
        name: cell.value.name,
        networkSeed: cell.value.dna_modifiers.network_seed,
        displayName: cell.value.dna_modifiers.network_seed === "" ? "Public" : cell.value.name,
      };
    }
  }
}

// --- Steward (creator) tracking ---
// Mirrors the Moss pattern where only the happ installer gets the setup/steward
// privilege: here only the agent that *created* a clone is its steward. A joiner
// (who entered via a joining code) is not, so it waits for the steward's config
// to gossip in instead of seeing the setup UI on an unconfigured network.
const STEWARD_CLONES_KEY = "stewardClones";

// Keyed by "<agentPubKey>:<dnaHash>" so the marker is per-agent. In dev, the two
// `tauri dev` instances share one webview origin (and thus one localStorage), but
// each conductor has a distinct agent key, so a creator's mark never leaks to the
// joiner instance.
function stewardKey(dnaHash: DnaHash, agentPubKey: AgentPubKey): string {
  return `${encodeHashToBase64(agentPubKey)}:${encodeHashToBase64(dnaHash)}`;
}

function stewardCloneSet(): Set<string> {
  try {
    return new Set<string>(JSON.parse(localStorage.getItem(STEWARD_CLONES_KEY) || "[]"));
  } catch (_e) {
    return new Set<string>();
  }
}

export function markStewardClone(dnaHash: DnaHash, agentPubKey: AgentPubKey) {
  if (!dnaHash || !agentPubKey) return;
  const set = stewardCloneSet();
  set.add(stewardKey(dnaHash, agentPubKey));
  localStorage.setItem(STEWARD_CLONES_KEY, JSON.stringify([...set]));
}

export function isStewardClone(dnaHash: DnaHash | undefined, agentPubKey: AgentPubKey | undefined): boolean {
  if (!dnaHash || !agentPubKey) return false;
  return stewardCloneSet().has(stewardKey(dnaHash, agentPubKey));
}
