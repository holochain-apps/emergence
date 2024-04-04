import type { AppletHash, AppletServices, AssetInfo, WAL, WeServices } from '@lightningrodlabs/we-applet';
import type { AppAgentClient, RoleName, ZomeName } from '@holochain/client';

const ROLE_NAME = "emergence"
const ZOME_NAME = "emergence"


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
      if (entryType == "fixme") {
        return {
          icon_src: "",
          name: "fixme",
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
  