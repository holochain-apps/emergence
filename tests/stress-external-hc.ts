import { AdminWebsocket, AppBundleSource, AppWebsocket, CellType, Record } from "@holochain/client";
import { AppOptions, pause } from "@holochain/tryorama";
import getPort, { portNumbers } from "get-port";
import assert from "node:assert";
import { EmergenceClient } from "../ui/src/emergence-client.js";
import { EmergenceStore } from "../ui/src/emergence-store.js";
import { getRandomNumber } from "./util.js";
import { v4 as uuidv4 } from "uuid";

const appBundlePath = "/Users/jost/Desktop/holochain/emergence/workdir/emergence.happ";

// **** TEST PARAMETERS ****

const conductorCount = 1;
const agentsPerConductor = 10;

const testDuration = 1000 * 1;

console.table({ conductorCount, agentsPerConductor });
console.log();

console.log("Setting up conductors, agents and emergence clients, stores...");
console.log();
console.time("setup");

const emergenceClients: EmergenceClient[][] = [];
const emergenceStores: EmergenceStore[][] = [];

const appBundleSources: Array<{ app: AppBundleSource & AppOptions }> = [];
for (let i = 0; i < agentsPerConductor; i++) {
    const appBundleSource = ({ app: { path: appBundlePath } });
    appBundleSources.push(appBundleSource);
}

const adminWsPort = 65000;
const adminWs = await AdminWebsocket.connect(`ws://127.0.0.1:${adminWsPort}`);
for (let i = 0; i < conductorCount; i++) {
    const clientsForConductor: EmergenceClient[] = [];
    const storesForConductor: EmergenceStore[] = [];
    for (let j = 0; j < agentsPerConductor; j++) {
        try {
            const agentPubKey = await adminWs.generateAgentPubKey();
            const appId = `app-${uuidv4()}`;
            const appInfo = await adminWs.installApp({
                path: appBundlePath,
                agent_key: agentPubKey,
                installed_app_id: appId,
                membrane_proofs: {}
            });
            await adminWs.enableApp({ installed_app_id: appId });
            assert(CellType.Provisioned in appInfo.cell_info["emergence"][0]);
            const cellId = appInfo.cell_info["emergence"][0][CellType.Provisioned].cell_id;
            await adminWs.authorizeSigningCredentials(cellId);
            const { port: appInterfacePort } = await adminWs.attachAppInterface(
                {
                    port: await getPort(
                        { port: portNumbers(30000, 40000) }
                    )
                }
            );
            const appAgentWs = await AppWebsocket.connect(new URL(`ws://127.0.0.1:${appInterfacePort}`).href);
            console.log('app agent ws', appAgentWs.client.socket.url);
            // @ts-ignore
            const emergenceClient = new EmergenceClient(appAgentWs, cellId);
            const onSignal = appAgentWs.on.bind(appAgentWs, "emergence");
            const emergenceStore = new EmergenceStore(emergenceClient, onSignal, null, null, agentPubKey);
            clientsForConductor.push(emergenceClient);
            storesForConductor.push(emergenceStore);
        } catch (error) {
            console.error("erere", error);
        }
    }
    emergenceClients.push(clientsForConductor);
    emergenceStores.push(storesForConductor);
}

console.timeEnd("setup");
console.log();

// *** CREATE SESSIONS ***
console.log("Creating sessions...");
console.log();
console.time("sessions");

const sessionsCount = 1;

for (let x = 0; x < sessionsCount; x++) {
    const sessionsCreated = [];
    for (let i = 0; i < emergenceStores.length; i++) {
        console.log("conductor", i);
        const storesForConductor = emergenceStores[i];
        for (let j = 0; j < storesForConductor.length; j++) {
            console.log('agent', j);
            const store = storesForConductor[j];
            sessionsCreated.push(store.createSession(x, `session ${x}`, "description", [], 2, 10, 60, 1, null, []));
        }
    }
    const sessions = await Promise.all(sessionsCreated);
    console.log('sessions', sessions);
}

console.timeEnd("sessions");

await pause(100);

const sessions = await emergenceClients[0][0].getSessions();
console.log('sessions count', sessions.length);
console.log();

// *** START TEST ***
console.log("Starting test run...");

const startTime = Date.now();
let totalTimeElapsed: number;
const createNoteInterval = 500;
const getFeedInterval = 1000;

const isCreatingNotes: boolean[] = new Array(conductorCount).fill(false);
const stopNoteCreation = globalThis.setInterval(async () => {
    totalTimeElapsed = Date.now() - startTime;
    console.log(`Time elapsed: ${totalTimeElapsed} ms`);
    console.log();

    for (let i = 0; i < emergenceStores.length; i++) {
        const storesForConductor = emergenceStores[i];
        if (!isCreatingNotes[i]) {
            const notesForConductor = [];
            for (let j = 0; j < agentsPerConductor; j++) {
                const store = storesForConductor[j];
                const sessionIndex = getRandomNumber(sessions);
                const sessionHash = sessions[sessionIndex].original_hash;
                const createNotePromise = store.createNote(
                    sessionHash,
                    `note: minute ${Math.ceil(totalTimeElapsed / 1000 / 60)}`,
                    [],
                    null
                );
                notesForConductor.push(createNotePromise);
            }
            isCreatingNotes[i] = true;
            const notes: Record[] = await Promise.all(notesForConductor);
            console.log(`Created ${notes.length} notes for conductor ${i}`);
            isCreatingNotes[i] = false;
        }
    }
}, createNoteInterval);

const stopFeedGetting = globalThis.setInterval(() => {
    const conductorIndex = getRandomNumber(emergenceStores);
    const agentIndex = getRandomNumber(emergenceStores[conductorIndex]);
    const store = emergenceStores[conductorIndex][agentIndex];
    store.fetchFeed({});
}, getFeedInterval);

// const stopClientReconnecting = globalThis.setInterval(() => {
// });

await pause(testDuration);

globalThis.clearInterval(stopNoteCreation);
globalThis.clearInterval(stopFeedGetting);
// globalThis.clearInterval(stopClientReconnecting);

await pause(1000); // wait because creating notes calls fetchSessions and doesn't await

emergenceStores.forEach((emergenceStoreForConductor) => {
    emergenceStoreForConductor.forEach((store) => {
        globalThis.clearInterval(store.neededStuffStore.intervalId);
        globalThis.clearInterval(store.loader);
    })
});

await Promise.all(emergenceClients.flatMap(
    (clientsPerConductor) => clientsPerConductor.map(
        (client) => client.client.client.close()
    )
));
await adminWs.client.close();
