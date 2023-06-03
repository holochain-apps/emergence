import { CellId, FullStateDump, encodeHashToBase64 } from "@holochain/client";
import { IConductor } from "@holochain/tryorama";
import isEqual from "lodash/isEqual.js";
import sortBy from "lodash/sortBy.js";

export const partialConfig = `dpki: ~
network:
  bootstrap_service: "https://devnet-bootstrap.holo.host"
  network_type: "quic_bootstrap" 
  transport_pool:
    - proxy_config:
        proxy_url: "kitsune-proxy://f3gH2VMkJ4qvZJOXx0ccL_Zo5n-s_CnBjSzAsEHHDCA/kitsune-quic/h/165.22.32.11/p/5779/--"
        type: "remote_proxy_client"
      type: proxy
      sub_transport:
        type: quic`;
        // proxy_url: "kitsune-proxy://f3gH2VMkJ4qvZJOXx0ccL_Zo5n-s_CnBjSzAsEHHDCA/kitsune-quic/h/137.184.142.208/p/5788/--"
        
export const getRandomNumber = (items: Array<any>) => Math.floor(Math.random() * items.length);

export const areDhtsSynced = async (
    conductors: Array<IConductor>,
    cellId: CellId
) => {
    // Dump all conductors' states
    const conductorStates: FullStateDump[] = await Promise.all(
        conductors.map((conductor) =>
            conductor.adminWs().dumpFullState({
                cell_id: cellId,
                dht_ops_cursor: undefined,
            })
        )
    );

    // conductorStates.forEach((cs, index) => console.log('index', index, 'ops_cursor', cs.integration_dump.dht_ops_cursor, 'peers', cs.peer_dump.peers.length));

    // Compare conductors' integrated DhtOps
    const playersDhtOpsIntegrated = conductorStates.map((conductor) =>
        sortBy(conductor.integration_dump.integrated, [
            // the only property's key of each DhtOp is the DhtOp type
            (op) => Object.keys(op)[0],
            // the DhtOp's signature
            (op) => encodeHashToBase64(Object.values(op)[0][0]),
        ])
    );
    const status = playersDhtOpsIntegrated.every((playerOps) =>
        isEqual(playerOps, playersDhtOpsIntegrated[0])
    );

    return status;
};