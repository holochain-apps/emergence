import { AppBundle, AppWebsocket, Record } from "@holochain/client";
import { TryCpClient, TryCpScenario, pause } from "@holochain/tryorama";
import assert from "node:assert";
import { EmergenceClient } from "../ui/src/emergence-client.js";
import { EmergenceStore } from "../ui/src/emergence-store.js";
import { Note } from "../ui/src/emergence/emergence/types.js";
import { createNote } from "./src/emergence/emergence/common.js";
import { areDhtsSynced, getRandomNumber, partialConfig } from "./util.js";

// const testAppPath = process.cwd() + '/../workdir/emergence.happ';

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
let agentsPerConductor = 1;
const agentsPerConductorIncrementor = 20;

let notesPerMin = 1;
const notesPerMinIncrementor = 200;

let testRunCount = 1;
const testRunCountMax = 1;
const testDuration = 1000 * 5;

const intervalMargin = agentsPerConductor * 0;

const metricsPerMin: { timeElapsedToCreateAllNotes: number }[] = [];

do {
    console.group(`Test run # ${testRunCount}`);

    console.table({ holoPortCount: holoportIps.length, agentsPerConductor, notesPerMin });
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


    // console.log("Exchanging all peer info...");
    // await scenario.shareAllAgents();
    // console.log();

    const aliceAppWs = clientsPlayers[0].players[0].conductor.appWs() as AppWebsocket;
    const onSignal = clientsPlayers[0].players[0].conductor.on.bind(clientsPlayers[0].players[0].conductor);
    const cellId = clientsPlayers[0].players[0].cells[0].cell_id;
    clientsPlayers.forEach((client) =>
        client.players.forEach((player) => {
            // console.log('player', player.agentPubKey);
            player.conductor.on((_signal) => { }); // add empty signal handler to prevent logs
        }
        )
    );

    const a = await areDhtsSynced(clientsPlayers.flatMap((client) => client.client.conductors), cellId);

    console.log("Starting test run...");

    // *** CREATE SESSIONS ***
    const sessionsCount = 1;

    const emergenceClient = new EmergenceClient(aliceAppWs, cellId);
    const store = new EmergenceStore(emergenceClient, onSignal, null, null, cellId[1]);

    // agent 1 creates a bunch of sessions
    for (let x = 0; x < sessionsCount; x++) {
        const session = await store.createSession(x, `session ${x}`, "description", [], 2, 10, 60, 1, null, [])
        assert.ok(session);
    }
    const sessions = await emergenceClient.getSessions();

    // *** START TEST ***

    let startTime = Date.now();
    let totalTimeElapsed: number;
    const checkDhtSyncInterval = 1000 * 5;
    const outputInterval = 1000 * 5;
    let outputPrinted = false;
    let startTimeDhtSync: number;
    let dhtsSynced = false;
    let testRunFailed = false;
    let minuteResetHappened = false;
    let notesCreatedThisMinute = 0;
    let notesCreatedTotal = 0;
    let thisMinuteStartTime = startTime;
    let thisMinuteMetricsSaved = false;

    do {
        // if (notesCreatedThisMinute < notesPerMin) {
        //     for (let i = 0; i < clientsPlayers.length; i++) {
        //         const notesForConductor = [];
        //         for (let j = 0; j < clientsPlayers[i].players.length; j++) {
        //             const cell = clientsPlayers[i].players[j].cells[0];
        //             const sessionIndex = getRandomNumber(sessions);
        //             const note: Note = {
        //                 session: sessions[sessionIndex].original_hash,
        //                 text: `note: minute ${Math.ceil(totalTimeElapsed / 1000 / 60)}`,
        //                 tags: [],
        //                 trashed: false
        //             };
        //             notesForConductor.push(createNote(cell, note));
        //         }
        //         const notes: Record[] = await Promise.all(notesForConductor);
        //         notesCreatedThisMinute += notes.length;
        //         notesCreatedTotal += notes.length;
        //         console.log(`Created ${notes.length} notes, ${notesCreatedThisMinute} this minute and ${notesCreatedTotal} in total.`);
        //         if (notesCreatedThisMinute >= notesPerMin) {
        //             startTimeDhtSync = Date.now();
        //         }
        //         // notes.forEach((note) => store.needNote(note.signed_action.hashed.hash));
        //     }
        // } else if (!thisMinuteMetricsSaved) {
        //     const timeElapsedToCreateAllNotes = Date.now() - thisMinuteStartTime;
        //     metricsPerMin.push({ timeElapsedToCreateAllNotes });
        //     thisMinuteMetricsSaved = true;
        // }

        totalTimeElapsed = Date.now() - startTime;
        // if (totalTimeElapsed % outputInterval <= intervalMargin) {
        //     const elapsedTime = Math.round(totalTimeElapsed / 1000);
        //     console.log(`Checkpoint: ${elapsedTime} seconds elapsed. ${notesCreatedTotal} notes created until now.`);
        //     outputPrinted = true;
        // } else {
        //     outputPrinted = false;
        // }

        console.log('hello', totalTimeElapsed, totalTimeElapsed % 1000, intervalMargin, totalTimeElapsed % 1000 <= intervalMargin);
        if (totalTimeElapsed > 0 && totalTimeElapsed % 1000 <= intervalMargin) {
            const clientIndex = getRandomNumber(clientsPlayers);
            const playerIndex = getRandomNumber(clientsPlayers[clientIndex].players);
            emergenceClient.getFeed(clientsPlayers[clientIndex].players[playerIndex].agentPubKey).then((value) => console.log(`client ${clientIndex} player ${playerIndex} feed ${value}`));
        }

        // if (!dhtsSynced && totalTimeElapsed % checkDhtSyncInterval <= intervalMargin) {
        //     if (notesCreatedThisMinute >= notesPerMin) {
        //         dhtsSynced = await areDhtsSynced(clientsPlayers.flatMap((clientPlayer) => clientPlayer.client.conductors), cellId);
        //         const timeElapsedToSyncDht = Math.round((Date.now() - startTimeDhtSync) / 1000);
        //         if (dhtsSynced) {
        //             console.log(`DHTs synced; it took ${timeElapsedToSyncDht} seconds.`);
        //         } else {
        //             console.log(`DHTs not yet synced after ${timeElapsedToSyncDht} seconds.`);
        //         }
        //     }
        // }

        if (totalTimeElapsed > 0 && totalTimeElapsed % (1000 * 60) <= intervalMargin) {
            console.log("-------------- A minute has passed. --------------");
            // if (notesCreatedThisMinute < notesPerMin) {
            //     console.log(`Failed to create ${notesPerMin} notes this minute. Created ${notesCreatedThisMinute}. Aborting test run.`);
            //     testRunCount = testRunCountMax; // end tests
            //     testRunFailed = true;
            //     break;
            // }

            if (!minuteResetHappened) {
                notesCreatedThisMinute = 0;
                thisMinuteStartTime = Date.now();
                thisMinuteMetricsSaved = false;
                minuteResetHappened = true;
                dhtsSynced = false;
            }
        } else {
            minuteResetHappened = false;
        }
    } while (totalTimeElapsed < testDuration);

    await pause(1000); // wait because creating notes calls fetchSessions and doesn't await

    console.log();

    // if (!testRunFailed) {
    //     let avgToCreateNotes = 0;
    //     metricsPerMin.forEach((metrics) => {
    //         // console.log(`It took ${metrics.timeElapsedToCreateAllNotes} ms to create ${notesPerMin} notes.`);
    //         avgToCreateNotes += metrics.timeElapsedToCreateAllNotes;
    //     });
    //     avgToCreateNotes /= metricsPerMin.length;
    //     console.log(`On average it took ${avgToCreateNotes} ms to create ${notesPerMin} notes.`);
    // }

    // const feed = await store.fetchFeed();
    // console.log('feed', feed);
    // console.log();

    globalThis.clearInterval(store.neededStuffStore.intervalId);
    globalThis.clearInterval(store.loader);

    await scenario.cleanUp();

    testRunCount++;
    agentsPerConductor += agentsPerConductorIncrementor;
    notesPerMin += notesPerMinIncrementor;

    console.groupEnd();
} while (testRunCount <= testRunCountMax);
