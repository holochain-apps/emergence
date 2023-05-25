import { AppWebsocket, Record } from "@holochain/client";
import { AgentApp, TryCpClient, TryCpScenario, pause } from "@holochain/tryorama";
import assert from "node:assert";
import { EmergenceClient } from "../ui/src/emergence-client.js";
import { EmergenceStore } from "../ui/src/emergence-store.js";
import { Note } from "../ui/src/emergence/emergence/types.js";
import { createNote } from "./src/emergence/emergence/common.js";

const getRandomNumber = (items: Array<any>) => Math.floor(Math.random() * items.length);

// const testAppPath = process.cwd() + '/../workdir/emergence.happ';

const TRYCP_SERVER_PORT = 9000;

// 172.26.211.71
// 172.26.206.61
// 172.26.212.148
const holoportIps = ["172.26.211.71", "172.26.212.148"];
const holoportUrls = holoportIps.map((ip) => new URL(`ws://${ip}:${TRYCP_SERVER_PORT}`));

const scenario = new TryCpScenario();

const conductorCount = 1;
const agentsPerConductor = 1;
// const spacesCount = 1;

console.log("Resetting all HoloPorts...");
console.log();

for (const url of holoportUrls) {
    const clientCleaner = await TryCpClient.create(url);
    await clientCleaner.cleanAllConductors();
    await clientCleaner.close();
}

console.log("Setting up conductors and installing agent apps...");
console.log();

const app = {
    bundle: {
        manifest: {
            manifest_version: "1",
            name: "some",
            roles: [{
                dna: { url: 'https://github.com/holochain-apps/emergence/releases/download/pre-alpha-test-2/emergence.dna' },
                name: "role",
            }],
        },
        resources: {}
    }
};

const clientsPlayers = await scenario.addClientsPlayers(
    holoportUrls,
    {
        numberOfConductorsPerClient: conductorCount,
        numberOfAgentsPerConductor: agentsPerConductor,
        app,
    });

console.log("Exchanging all peer infos...");
await scenario.shareAllAgents();

const aliceAppWs = clientsPlayers[0].players[0].conductor.appWs() as AppWebsocket;
const onSignal = clientsPlayers[0].players[0].conductor.on.bind(clientsPlayers[0].players[0].conductor);
const cellId = clientsPlayers[0].players[0].cells[0].cell_id;
const agentsAppsPerConductor: AgentApp[][] = [];
clientsPlayers.forEach((cP) => {
    agentsAppsPerConductor.push(cP.players);
});
console.log("Starting test run...");

// *** CREATE SPACES AND SESSIONS ***
const sessionsCount = 1;

const emergenceClient = new EmergenceClient(aliceAppWs, cellId);
const store = new EmergenceStore(emergenceClient, onSignal, null, null, cellId[1]);

// // agent 1 creates a bunch of spaces
// for (let x = 0; x < spacesCount; x++) {
//     const space = await store.createSpace(x.toString(), `space ${x}`, "description", [], 10, 1, [], null, null);
//     assert.ok(space);
// }
// await pause(100);  // we wait here because creating spaces calls fetchSpaces and doesn't await

// let spaces = get(store.spaces);
// assert.equal(spaces.length, spacesCount);

// agent 1 creates a bunch of sessions
for (let x = 0; x < sessionsCount; x++) {
    const session = await store.createSession(`session ${x}`, "description", [], 2, 10, 60, 1, null, [])
    assert.ok(session);
}
// await pause(200);  // we wait here because creating sessions calls fetchSessions and doesn't await
const sessions = await emergenceClient.getSessions();

// *** START TEST ***

const notesPerMin = 1;
const metricsPerMin: { timeElapsedToCreateAllNotes: number }[] = [];
const testDuration = 1000 * 5;
const outputInterval = 1000; // each second

let startTime = Date.now();
let totalTimeElapsed: number;
let outputPrinted = false;
let notesCreatedThisMinute = 0;
let notesCreatedTotal = 0;
let thisMinuteStartTime = startTime;
let thisMinuteMetricsSaved = false;

do {
    totalTimeElapsed = Date.now() - startTime;

    if (notesCreatedThisMinute < notesPerMin) {
        for (let i = 0; i < conductorCount; i++) {
            const notesForConductor = [];
            for (let j = 0; j < agentsPerConductor; j++) {
                const cell = agentsAppsPerConductor[i][j].cells[0];
                const sessionIndex = getRandomNumber(sessions);
                const note: Note = {
                    session: sessions[sessionIndex].original_hash,
                    text: `note: minute ${Math.ceil(totalTimeElapsed / 1000 / 60)}`,
                    tags: [],
                    trashed: false
                };
                notesForConductor.push(createNote(cell, note));
            }
            const notes: Record[] = await Promise.all(notesForConductor);
            assert.equal(notes.length, agentsPerConductor);
            notes.forEach((note) => store.needNote(note.signed_action.hashed.hash));
            notesCreatedThisMinute += notes.length;
            notesCreatedTotal += notes.length;
        }
    } else if (!thisMinuteMetricsSaved) {
        const timeElapsedToCreateAllNotes = Date.now() - thisMinuteStartTime;
        metricsPerMin.push({ timeElapsedToCreateAllNotes });
        thisMinuteMetricsSaved = true;
    }

    if (totalTimeElapsed % outputInterval <= 10) {
        if (!outputPrinted) {
            const secondsElapsed = Math.floor(totalTimeElapsed / 1000);
            console.log(`Checkpoint at ${secondsElapsed} s: ${notesCreatedThisMinute} notes have been created this minute and ${notesCreatedTotal} in total.`);
            outputPrinted = true;
        }
    } else {
        outputPrinted = false;
    }

    if (totalTimeElapsed > 0 && totalTimeElapsed % (1000 * 60) === 0) { // a minute has passed
        notesCreatedThisMinute = 0;
        thisMinuteStartTime = Date.now();
        thisMinuteMetricsSaved = false;
    }
} while (totalTimeElapsed < testDuration);

await pause(10000);  // wait because creating notes calls fetchSessions and doesn't await

console.log();

let avgToCreateNotes = 0;
metricsPerMin.forEach((metrics) => {
    console.log(`It took ${metrics.timeElapsedToCreateAllNotes} ms to create ${notesPerMin} notes.`);
    avgToCreateNotes += metrics.timeElapsedToCreateAllNotes;
});
avgToCreateNotes /= metricsPerMin.length;
console.log(`On average it took ${avgToCreateNotes} ms to create ${notesPerMin} notes.`);

const feed = await store.fetchFeed();
console.log('feed', feed);

globalThis.clearInterval(store.neededStuffStore.intervalId);
globalThis.clearInterval(store.loader);

await scenario.cleanUp();

    // Test involves creating the expected number of spaces and sessions and then simulating 
    // user behavior. Then the test is run multiple times while recording performance metrics
    // where each run the intensity of user behavior increased by upping the following parameters:
    // 1. number of agents per conductor
    // 1. number of notes created per agent, per minute
    // 1. percentage of notes that include images
    // 1. number of requests per agent per minute to load all the data: store.fetchSessions()
    // 1. number of conductors

    // The metrics measured should be:

    // 1. conductor load avarege
    // 2. zome-call time delays (if any)
    // 3. time-taken for a random agent on a different conductor to "see" changes (i.e. gossip delays)
