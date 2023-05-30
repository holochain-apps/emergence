import { AppBundleSource, Record } from "@holochain/client";
import { AgentApp, Scenario, pause } from "@holochain/tryorama";
import assert from "node:assert";
import { EmergenceClient } from "../ui/src/emergence-client.js";
import { EmergenceStore } from "../ui/src/emergence-store.js";
import { Note } from "../ui/src/emergence/emergence/types.js";
import { createNote } from "./src/emergence/emergence/common.js";
import { areDhtsSynced, getRandomNumber } from "./util.js";

const scenario = new Scenario();

const conductorCount = 3;
const agentsPerConductor = 10;
let notesPerMin = 3;

let testRunCount = 1;
const testRunCountMax = 1;

const metricsPerMin: { timeElapsedToCreateAllNotes: number }[] = [];
const testDuration = 1000 * 5;
const outputInterval = 1000; // each second

do {
    console.group(`Test run # ${testRunCount}`);

    console.table({ conductorCount, agentsPerConductor, notesPerMin });
    console.log();

    console.log("Setting up conductors and installing agent apps...");
    console.log();

    const testAppPath = process.cwd() + '/../workdir/emergence.happ';

    // install apps for agents for each conductor
    const appDef: AppBundleSource = { path: testAppPath };
    const appDefs = []
    for (let x = 0; x < agentsPerConductor; x++) {
        appDefs.push({ app: appDef })
    }

    const agentAppsPerConductor: AgentApp[][] = [];

    for (let x = 0; x < conductorCount; x++) {
        try {
            const conductor = await scenario.addConductor();
            const agentsApps = await conductor.installAgentsApps({
                agentsApps: appDefs
            });
            agentAppsPerConductor.push(agentsApps);
        } catch (e) {
            console.log("ERROR installAgentsApps", e)
        }
    }

    console.log("Exchanging all peer infos...");
    await scenario.shareAllAgents();
    console.log();

    console.log(`Created ${conductorCount} conductors with ${agentsPerConductor} agents each.`);
    console.log();

    await Promise.all(
        scenario.conductors.map((conductor) => conductor.attachAppInterface()
            .then(() => conductor.connectAppInterface())
        )
    );
    const aliceAppWs = scenario.conductors[0].appWs();
    const onSignal = aliceAppWs.on.bind(aliceAppWs, "signal");
    const cellId = agentAppsPerConductor[0][0].cells[0].cell_id;

    console.log("Starting test run...");

    // *** CREATE SESSIONS ***
    const sessionsCount = 1;

    const emergenceClient = new EmergenceClient(aliceAppWs, cellId);
    const store = new EmergenceStore(emergenceClient, onSignal, null, null, cellId[1]);

    // agent 1 creates a bunch of sessions
    for (let x = 0; x < sessionsCount; x++) {
        const session = await store.createSession(`session ${x}`, "description", [], 2, 10, 60, 1, null, [])
        assert.ok(session);
    }
    const sessions = await emergenceClient.getSessions();

    // *** START TEST ***

    let startTime = Date.now();
    let totalTimeElapsed: number;
    let outputPrinted = false;
    let dhtSyncedThisMinute = false;
    let minuteResetHappened = false;
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
                    // const secondsElapsed = Math.floor(totalTimeElapsed / 1000);
                    // const shouldCreateNote = Math.round(Math.random()) + secondsElapsed / 60 >= 1.5;
                    // if (shouldCreateNote) {
                    const cell = agentAppsPerConductor[i][j].cells[0];
                    const sessionIndex = getRandomNumber(sessions);
                    const note: Note = {
                        session: sessions[sessionIndex].original_hash,
                        text: `note: minute ${Math.ceil(totalTimeElapsed / 1000 / 60)}`,
                        tags: [],
                        trashed: false
                    };
                    notesForConductor.push(createNote(cell, note));
                    // }
                }
                const notes: Record[] = await Promise.all(notesForConductor);
                // notes.forEach((note) => store.needNote(note.signed_action.hashed.hash));
                notesCreatedThisMinute += notes.length;
                notesCreatedTotal += notes.length;
            }
        } else if (!thisMinuteMetricsSaved) {
            const timeElapsedToCreateAllNotes = Date.now() - thisMinuteStartTime;
            metricsPerMin.push({ timeElapsedToCreateAllNotes });
            thisMinuteMetricsSaved = true;
        }

        if (totalTimeElapsed % outputInterval <= 100) {
            if (!outputPrinted) {
                const secondsElapsed = Math.floor(totalTimeElapsed / 1000);
                console.log(`Checkpoint at ${secondsElapsed} s: ${notesCreatedThisMinute} notes have been created this minute and ${notesCreatedTotal} in total.`);
                outputPrinted = true;
                if (notesCreatedThisMinute >= notesPerMin && !dhtSyncedThisMinute) {
                    dhtSyncedThisMinute = await areDhtsSynced(scenario.conductors, cellId);
                    if (dhtSyncedThisMinute) {
                        console.log('All DHTs are synced.');
                    }
                }
            }
        } else {
            outputPrinted = false;
        }

        if (totalTimeElapsed > 0 && totalTimeElapsed % (1000 * 60) <= 100) {
            console.log("-------------- A minute has passed. --------------");
            if (notesCreatedThisMinute < notesPerMin) {
                console.log(`Failed to create ${notesPerMin} notes this minute. Created ${notesCreatedThisMinute}. Aborting test run.`);
                testRunCount = testRunCountMax; // end tests
                break;
            }

            if (!minuteResetHappened) {
                notesCreatedThisMinute = 0;
                thisMinuteStartTime = Date.now();
                thisMinuteMetricsSaved = false;
                minuteResetHappened = true;
            }
        } else {
            minuteResetHappened = false;
        }
    } while (totalTimeElapsed < testDuration);

    await pause(1000);  // wait because creating notes calls fetchSessions and doesn't await

    console.log();

    let avgToCreateNotes = 0;
    metricsPerMin.forEach((metrics) => {
        // console.log(`It took ${metrics.timeElapsedToCreateAllNotes} ms to create ${notesPerMin} notes.`);
        avgToCreateNotes += metrics.timeElapsedToCreateAllNotes;
    });
    avgToCreateNotes /= metricsPerMin.length;
    console.log(`On average it took ${avgToCreateNotes} ms to create ${notesPerMin} notes.`);

    // const feed = await store.fetchFeed();
    // console.log('feed', feed);
    // console.log();

    globalThis.clearInterval(store.neededStuffStore.intervalId);
    globalThis.clearInterval(store.loader);

    await scenario.cleanUp();

    testRunCount++;
    notesPerMin *= 5;

    console.groupEnd();
} while (testRunCount <= testRunCountMax);