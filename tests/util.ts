import { CellId, FullStateDump, encodeHashToBase64 } from "@holochain/client";
import { IConductor } from "@holochain/tryorama";
import isEqual from "lodash/isEqual.js";
import sortBy from "lodash/sortBy.js";

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