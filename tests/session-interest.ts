import { AppBundle, AppWebsocket } from "@holochain/client";
import { TryCpClient, TryCpScenario, pause } from "@holochain/tryorama";
import assert from "node:assert";
import { EmergenceClient } from "../ui/src/emergence-client.js";
import { EmergenceStore } from "../ui/src/emergence-store.js";
import { getRandomNumber } from "./util.js";

const TRYCP_SERVER_PORT = 9000;

// 172.26.211.71
// 172.26.206.61
// 172.26.212.148
const holoportIps = ["172.26.206.61", "172.26.211.71", "172.26.212.148"];
const holoportUrls = holoportIps.map((ip) => new URL(`ws://${ip}:${TRYCP_SERVER_PORT}`));

console.log(`Distributed test across ${holoportIps.length} HoloPorts`);
console.log();

// **** TEST PARAMETERS ****
// X agents setting their interest in Y number of  sessions, all within the span of 5 minutes, where we find the upper limits of X and Y.  Currently we are expecting around 400 people to set interest on 20 sessions out of a total of 80 available session. 

const conductorCount = 1;
let agentsPerConductor = 1;
const agentsPerConductorIncrementor = 20;

let sessionCount = 80;
const sessionIncrementer = 20;

let testRunCount = 1;
const testRunCountMax = 1;
const testDuration = 1000 * 60 * 10;

const intervalMargin = agentsPerConductor * 50;

do {
    console.group(`Test run # ${testRunCount}`);

    console.table({ holoportCount: holoportIps.length, agentsPerConductor, sessionCount });
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
                    name: "role",
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
        });

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

    // const a = await areDhtsSynced(clientsPlayers.flatMap((client) => client.client.conductors), cellId);

    // *** CREATE SESSIONS ***
    console.log(`Creating ${sessionCount} sessions...`);
    console.log();

    const emergenceClient = new EmergenceClient(aliceAppWs, cellId);
    const store = new EmergenceStore(emergenceClient, onSignal, null, null, cellId[1]);

    // agent 1 creates a bunch of sessions
    for (let x = 0; x < sessionCount; x++) {
        const session = await store.createSession(`session ${x}`, "description", [], 2, 10, 60, 1, null, [])
        assert.ok(session);
    }
    const sessions = await emergenceClient.getSessions();

    console.log("Initializing all DNAs...");
    console.log();
    // Init all players
    const results = await Promise.all(clientsPlayers.flatMap((clientPlayer) => clientPlayer.players.map((player) => player.cells[0].callZome({ zome_name: "emergence", fn_name: "init" }))));
    console.dir(results, { maxArrayLength: null, maxStringLength: null });

    // *** START TEST ***

    console.log("Starting test run...");

    let startTime = Date.now();
    let totalTimeElapsed: number;
    const checkSyncInterval = 1000 * 5;
    const outputInterval = 1000 * 5;
    let outputPrinted = false;
    // let startTimeDhtSync: number;
    // let testRunFailed = false;
    let minuteResetHappened = false;
    let sessionInterestSetThisMinute = 0;
    let sessionInterestSetTotal = 0;
    let thisMinuteStartTime = startTime;
    let thisMinuteMetricsSaved = false;

    do {
        for (let i = 0; i < clientsPlayers.length; i++) {
            const sessionInterestSet = [];
            for (let j = 0; j < clientsPlayers[i].players.length; j++) {
                const sessionIndex = getRandomNumber(sessions);
                sessionInterestSet.push(store.setSessionInterest(sessions[sessionIndex].original_hash, Math.random()));
            }
            try {
                await Promise.all(sessionInterestSet);
                sessionInterestSetThisMinute += sessionInterestSet.length;
                sessionInterestSetTotal += sessionInterestSet.length;
                console.log(`Set ${sessionInterestSet.length} session interests, ${sessionInterestSetThisMinute} this minute and ${sessionInterestSetTotal} in total.`);
            } catch (error) {
                console.error("ererere", error);
            }
        }

        totalTimeElapsed = Date.now() - startTime;
        if (totalTimeElapsed % outputInterval <= intervalMargin) {
            const elapsedTime = Math.round(totalTimeElapsed / 1000);
            console.log(`Checkpoint: ${elapsedTime} seconds elapsed. ${sessionInterestSetTotal} session interests set until now.`);
            outputPrinted = true;
        } else {
            outputPrinted = false;
        }

        // if (totalTimeElapsed % checkSyncInterval <= intervalMargin) {
        //     if (sessionInterestSetThisMinute >= notesPerMin) {
        //         const dhtsSynced = await areDhtsSynced(clientsPlayers.flatMap((clientPlayer) => clientPlayer.client.conductors), cellId);
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
            if (!minuteResetHappened) {
                sessionInterestSetThisMinute = 0;
                thisMinuteStartTime = Date.now();
                thisMinuteMetricsSaved = false;
                minuteResetHappened = true;
            }
        } else {
            minuteResetHappened = false;
        }
    } while (totalTimeElapsed < testDuration);

    await pause(1000); // wait because creating notes calls fetchSessions and doesn't await

    console.log();

    globalThis.clearInterval(store.neededStuffStore.intervalId);
    globalThis.clearInterval(store.loader);

    await scenario.cleanUp();

    testRunCount++;
    sessionCount += sessionIncrementer;
    agentsPerConductor += agentsPerConductorIncrementor;

    console.groupEnd();
} while (testRunCount <= testRunCountMax);
