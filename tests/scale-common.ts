import { AgentPubKey, AppAgentWebsocket, AppSignalCb, AppWebsocket, CellId, Record } from "@holochain/client";
import { AgentApp, pause } from "@holochain/tryorama";
import assert from "node:assert";
import { get } from "svelte/store";
import { EmergenceClient } from "../ui/src/emergence-client.js";
import { EmergenceStore } from "../ui/src/emergence-store.js";
import { Note } from "../ui/src/emergence/emergence/types.js";
import { createNote } from "./src/emergence/emergence/common.js";

const getRandomNumber = (items: Array<any>) => Math.floor(Math.random() * items.length);

export const runScaleTest = async (appWs: AppWebsocket, signalClient, cellId: CellId, agentAppsPerConductor: AgentApp[][]) => {
    // *** CREATE SPACES AND SESSIONS ***
    const sessionsCount = 1;

    const emergenceClient = new EmergenceClient(appWs, cellId);
    const store = new EmergenceStore(emergenceClient, signalClient, null, null, cellId[1]);

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
    await pause(200);  // we wait here because creating sessions calls fetchSessions and doesn't await
    const sessions = await emergenceClient.getSessions();

    // *** START TEST ***

    const notesPerMin = 100;
    const metricsPerMin: { timeElapsedToCreateAllNotes: number }[] = [];
    const testDuration = 1000 * 20; // 60 seconds
    const outputInterval = 1000; // each second

    const conductorCount = agentAppsPerConductor.length;

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
                const agentsPerConductor = agentAppsPerConductor[i].length;
                const notesForConductor = [];
                for (let j = 0; j < agentsPerConductor; j++) {
                    const cell = agentAppsPerConductor[i][j].cells[0];
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

    await pause(1000);  // wait because creating notes calls fetchSessions and doesn't await

    console.log();

    let avgToCreateNotes = 0;
    metricsPerMin.forEach((metrics) => {
        console.log(`It took ${metrics.timeElapsedToCreateAllNotes} ms to create ${notesPerMin} notes.`);
        avgToCreateNotes += metrics.timeElapsedToCreateAllNotes;
    });
    avgToCreateNotes /= metricsPerMin.length;
    console.log(`On average it took ${avgToCreateNotes} ms to create ${notesPerMin} notes.`);

    const feed = await emergenceClient.getFeed(agentAppsPerConductor[0][0].agentPubKey);
    console.log('feed', feed);

    globalThis.clearInterval(store.neededStuffStore.intervalId);
    globalThis.clearInterval(store.loader);

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
};