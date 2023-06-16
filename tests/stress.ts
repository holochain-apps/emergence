import { AppBundle, AppWebsocket, Record } from "@holochain/client";
import { TryCpClient, TryCpScenario, pause } from "@holochain/tryorama";
import { EmergenceClient } from "../ui/src/emergence-client.js";
import { EmergenceStore } from "../ui/src/emergence-store.js";
import { Note } from "../ui/src/emergence/emergence/types.js";
import { createNote } from "./src/emergence/emergence/common.js";
import { getRandomNumber, partialConfig } from "./util.js";

const TRYCP_SERVER_PORT = 9000;

// 172.26.211.71
// 172.26.206.61
// 172.26.212.148
const holoportIps = ["172.26.206.61", "172.26.211.71", "172.26.212.148"];
const holoportUrls = holoportIps.map((ip) => new URL(`ws://${ip}:${TRYCP_SERVER_PORT}`));

console.log(`Distributed test across ${holoportIps.length} HoloPorts`);
console.log();

// **** TEST PARAMETERS ****

const conductorCount = 1;
const agentsPerConductor = 10;

const testDuration = 1000 * 60 * 1;

console.table({ holoPortCount: holoportIps.length, agentsPerConductor });
console.log();

console.log("Resetting all HoloPorts...");
console.log();

for (const url of holoportUrls) {
    const clientCleaner = await TryCpClient.create(url);
    await clientCleaner.cleanAllConductors();
    await clientCleaner.close();
}

console.log("Setting up conductors and installing agent apps...");
console.log();

const app: { bundle: AppBundle } = {
    bundle: {
        manifest: {
            manifest_version: "1",
            name: "emergence",
            roles: [{
                dna: {
                    url: 'https://github.com/holochain-apps/emergence/releases/download/pre-alpha-test-2/emergence.dna',
                    modifiers: {
                        network_seed: Date.now().toString()
                    }
                },
                name: "role"
            }],
        },
        resources: {}
    }
};

const scenario = new TryCpScenario();
const clientsPlayers = await scenario.addClientsPlayers(
    holoportUrls,
    {
        numberOfConductorsPerClient: conductorCount,
        numberOfAgentsPerConductor: agentsPerConductor,
        app,
        partialConfig
    });

console.log("Creating emergence clients and stores...");
console.log();
console.time("stores");

const emergenceClients: EmergenceClient[][] = new Array(clientsPlayers.length);
const emergenceStores: EmergenceStore[][] = new Array(clientsPlayers.length);

for (let i = 0; i < clientsPlayers.length; i++) {
    const client = clientsPlayers[i];
    const emergenceClientsForConductor = [];
    const emergenceStoresForConductor = [];
    for (let j = 0; j < client.players.length; j++) {
        const player = client.players[j];
        const appWs = player.conductor.appWs() as AppWebsocket;
        const cellId = player.cells[0].cell_id;
        const onSignal = player.conductor.on.bind(player.conductor);

        const emergenceClient = new EmergenceClient(appWs, cellId);
        const emergenceStore = new EmergenceStore(emergenceClient, onSignal, null, null, cellId[1]);
        emergenceClientsForConductor.push(emergenceClient);
        emergenceStoresForConductor.push(emergenceStore);
    }
    emergenceClients[i] = emergenceClientsForConductor;
    emergenceStores[i] = emergenceStoresForConductor;
}

console.timeEnd("stores");

// *** CREATE SESSIONS ***
console.log("Creating sessions...");
console.log();
console.time("sessions");

const sessionsCount = 1;

for (let x = 0; x < sessionsCount; x++) {
    for (let i = 0; i < clientsPlayers.length; i++) {
        console.log("client", i);
        const sessionsCreated = [];
        const storesForConductor = emergenceStores[i];
        for (let j = 0; j < storesForConductor.length; j++) {
            console.log('player', j);
            const store = storesForConductor[j];
            sessionsCreated.push(store.createSession(x, `session ${x}`, "description", [], 2, 10, 60, 1, null, []));
        }
        console.log("awaiting");
        const sessions = await Promise.all(sessionsCreated);
        console.log('sessions', sessions);
    }
}

console.timeEnd("sessions");

await pause(1000);

const sessions = await emergenceClients[0][0].getSessions();
console.log('sessions count', sessions.length);
console.log();

// *** START TEST ***
console.log("Starting test run...");

const startTime = Date.now();
let totalTimeElapsed: number;
const createNoteInterval = 1000;
const getFeedInterval = 100;

const isCreatingNotes: boolean[] = new Array(conductorCount).fill(false);
const stopNoteCreation = globalThis.setInterval(() => {
    totalTimeElapsed = Date.now() - startTime;
    console.log(`Time elapsed: ${totalTimeElapsed} ms`);
    console.log();

    for (let i = 0; i < clientsPlayers.length; i++) {
        if (!isCreatingNotes[i]) {
            const notesForConductor = [];
            for (let j = 0; j < clientsPlayers[i].players.length; j++) {
                const cell = clientsPlayers[i].players[j].cells[0];
                const sessionIndex = getRandomNumber(sessions);

                const note: Note = {
                    session: sessions[sessionIndex].original_hash,
                    text: `note: minute ${Math.ceil(totalTimeElapsed / 1000 / 60)}`,
                    tags: [],
                    trashed: false
                };
                notesForConductor.push(createNote(cell, note));
            }
            isCreatingNotes[i] = true;
            Promise.all(notesForConductor).then((notes: Record[]) => {
                console.log(`Created ${notes.length} notes for conductor ${i}`);
                isCreatingNotes[i] = false;
            });
        }
    }
}, createNoteInterval);

// const stopFeedGetting = globalThis.setInterval(() => {
//     const clientIndex = getRandomNumber(clientsPlayers);
//     const playerIndex = getRandomNumber(clientsPlayers[clientIndex].players);
//     const emergenceClient = emergenceClients[clientIndex][playerIndex];
//     emergenceClient.getFeed(clientsPlayers[clientIndex].players[playerIndex].agentPubKey).then(
//         (value) => console.log(`client ${clientIndex} player ${playerIndex} feed ${value}`)
//     );
// }, getFeedInterval);

const stopClientReconnecting = globalThis.setInterval(() => {
});

await pause(testDuration);

globalThis.clearInterval(stopNoteCreation);
// globalThis.clearInterval(stopFeedGetting);
globalThis.clearInterval(stopClientReconnecting);

await pause(1000); // wait because creating notes calls fetchSessions and doesn't await

emergenceStores.forEach((emergenceStoreForConductor) => {
    emergenceStoreForConductor.forEach((store) => {
        globalThis.clearInterval(store.neededStuffStore.intervalId);
        globalThis.clearInterval(store.loader);
    })
})

await scenario.cleanUp();
