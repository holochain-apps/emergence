import { AppBundleSource, AppWebsocket, Record } from "@holochain/client";
import { AppOptions, Scenario, pause } from "@holochain/tryorama";
import { EmergenceClient } from "../ui/src/emergence-client.js";
import { EmergenceStore } from "../ui/src/emergence-store.js";
import { getRandomNumber } from "./util.js";

const appBundlePath = "../workdir/emergence.happ";

// **** TEST PARAMETERS ****

const conductorCount = 1;
const agentsPerConductor = 200;

const testDuration = 1000 * 60 * 5;

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

const scenario = new Scenario();
for (let i = 0; i < conductorCount; i++) {
    const conductor = await scenario.addConductor();
    const clientsForConductor: EmergenceClient[] = [];
    const storesForConductor: EmergenceStore[] = [];
    for (let j = 0; j < agentsPerConductor; j++) {
        const agentApp = await conductor.installApp({ path: appBundlePath });
        await conductor.adminWs().authorizeSigningCredentials(agentApp.cells[0].cell_id);
        const appInterfacePort = await conductor.attachAppInterface();
        await conductor.connectAppAgentInterface(agentApp.appId);
        // const appAgentWs = await AppAgentWebsocket.connect(new URL(`ws://127.0.0.1:${appInterfacePort}`).href, agentApp.appId);
        const appAgentWs = await AppWebsocket.connect(new URL(`ws://127.0.0.1:${appInterfacePort}`).href);
        console.log('app agent ws', appAgentWs.client.socket.url);
        // @ts-ignore
        const emergenceClient = new EmergenceClient(appAgentWs, agentApp.cells[0].cell_id);
        const onSignal = appAgentWs.on.bind(appAgentWs, "emergence");
        const emergenceStore = new EmergenceStore(emergenceClient, onSignal, null, null, agentApp.agentPubKey);
        clientsForConductor.push(emergenceClient);
        storesForConductor.push(emergenceStore);
    }
    emergenceClients.push(clientsForConductor);
    emergenceStores.push(storesForConductor);
}

console.timeEnd("setup");
console.log();

// console.log("Creating emergence clients and stores...");
// console.log();
// console.time("stores");

// for (let i = 0; i < conductorCount; i++) {
//     const agentAppsForConductor = conductorsAgentApps[i];
//     const emergenceClientsForConductor = [];
//     const emergenceStoresForConductor = [];
//     for (let j = 0; j < agentAppsForConductor.length; j++) {
//         const agentApp = agentAppsForConductor[j];
//         const appWs = 
//         const cellId = player.cells[0].cell_id;
//         const onSignal = player.conductor.on.bind(player.conductor);

//         const emergenceClient = new EmergenceClient(appWs, cellId);
//         const emergenceStore = new EmergenceStore(emergenceClient, onSignal, null, null, cellId[1]);
//         emergenceClientsForConductor.push(emergenceClient);
//         emergenceStoresForConductor.push(emergenceStore);
//     }
//     emergenceClients[i] = emergenceClientsForConductor;
//     emergenceStores[i] = emergenceStoresForConductor;
// }

// console.timeEnd("stores");

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

// const a = await emergenceStores[0][0].createNote(sessions[0].original_hash, "dd", [], null);
// console.log('a', a);

// *** START TEST ***
console.log("Starting test run...");

const startTime = Date.now();
let totalTimeElapsed: number;
const createNoteInterval = 500;
const getFeedInterval = 1000;

const isCreatingNotes: boolean[] = new Array(conductorCount).fill(false);
const stopNoteCreation = globalThis.setInterval(() => {
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
            Promise.all(notesForConductor).then((notes: Record[]) => {
                console.log(`Created ${notes.length} notes for conductor ${i}`);
                isCreatingNotes[i] = false;
            });
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

await pause(30000); // wait because creating notes calls fetchSessions and doesn't await

// for (let i = 0; i < emergenceStores.length; i++) {
//     for (let j = 0; j < emergenceStores[i].length; j++) {
//         const feed = await emergenceStores[i][j].fetchFeed({});
//         console.log("conductor", i, "agent", j, "feed", feed);
//     }
// }
// for (let i = 0; i < sessions.length; i++) {
//     const notes = await emergenceStores[0][0].getSessionNotes(sessions[i]);
//     console.log('notes for session', i, notes);
// }

emergenceStores.forEach((emergenceStoreForConductor) => {
    emergenceStoreForConductor.forEach((store) => {
        globalThis.clearInterval(store.neededStuffStore.intervalId);
        globalThis.clearInterval(store.loader);
    })
});

await scenario.cleanUp();
