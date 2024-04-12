import type { AppletHash, AppletServices, AssetInfo, WAL, WeServices } from '@lightningrodlabs/we-applet';
import type { AppAgentClient, RoleName, ZomeName } from '@holochain/client';
import { EmergenceStore } from './emergence-store';
import { getContext } from 'svelte';
import { storeContext } from './contexts';
import { EmergenceClient } from './emergence-client';
import { ROLE_NAME } from './emergence/emergence/types';


const SESSION_ICON_SRC = `data:image/svg+xml;utf8,<svg width="800px" height="800px" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="none"><g fill="black" fill-rule="evenodd" clip-rule="evenodd"><path d="M8.675 4.173a.75.75 0 00-1.35 0l-1.14 2.359-2.546.38a.75.75 0 00-.418 1.273l1.85 1.84-.437 2.6a.75.75 0 001.094.786L8 12.19l2.272 1.22a.75.75 0 001.094-.785l-.437-2.602 1.85-1.839a.75.75 0 00-.418-1.273l-2.545-.38-1.14-2.359zM7.362 7.542L8 6.222l.638 1.32a.75.75 0 00.565.415l1.459.218-1.066 1.059a.75.75 0 00-.21.656l.247 1.476-1.278-.686a.75.75 0 00-.71 0l-1.278.686.248-1.476a.75.75 0 00-.211-.656l-1.066-1.06 1.46-.217a.75.75 0 00.564-.415z"/><path d="M12 .75a.75.75 0 00-1.5 0V1h-5V.75a.75.75 0 00-1.5 0V1H2.25A2.25 2.25 0 000 3.25v10.5A2.25 2.25 0 002.25 16h11.5A2.25 2.25 0 0016 13.75V3.25A2.25 2.25 0 0013.75 1H12V.75zm-8 2.5V2.5H2.25a.75.75 0 00-.75.75v10.5c0 .414.336.75.75.75h11.5a.75.75 0 00.75-.75V3.25a.75.75 0 00-.75-.75H12v.75a.75.75 0 01-1.5 0V2.5h-5v.75a.75.75 0 01-1.5 0z"/></g></svg>`

let store: EmergenceStore | undefined

export const appletServices: AppletServices = {
    // Types of attachment that this Applet offers for other Applets to be created
    creatables: {
    },
    // Types of UI widgets/blocks that this Applet supports
    blockTypes: {    
    },
    bindAsset: async (appletClient: AppAgentClient,
      srcWal: WAL, dstWal: WAL): Promise<void> => {
      console.log("Bind requested.  Src:", srcWal, "  Dst:", dstWal)
    },
    getAssetInfo: async (
      appletClient: AppAgentClient,
      roleName: RoleName,
      integrityZomeName: ZomeName,
      entryType: string,
      wal: WAL
    ): Promise<AssetInfo | undefined> => {
      if (!store) {
        try {
          store = new EmergenceStore(new EmergenceClient("","emergence", appletClient, ROLE_NAME), undefined, undefined, appletClient.myPubKey)
        } catch(e) {
          console.log("Error creating store", e)
        }
      }
      if (entryType == "session") {
        let name = "Session"
        if (store) {
          const sessionHash = wal.hrl[1]
          try {
            await store.fetchSession([sessionHash])
            const session = store.getSession(sessionHash)
            if (session) {
              name = session.record.entry.title
            }

          }catch(e) {
            console.log("Error fetching session", e)
          }
        }
        return {
          icon_src: SESSION_ICON_SRC,
          name,
        };
      } else {
        throw new Error("unknown entry type:"+ entryType)
      }
    },
    search: async (
      appletClient: AppAgentClient,
      appletHash: AppletHash,
      weServices: WeServices,
      searchFilter: string
    ): Promise<Array<WAL>> => {
        return []
    },
};
  