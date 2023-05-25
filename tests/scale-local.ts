import { AppBundleSource } from "@holochain/client";
import { AgentApp, Conductor, Scenario, pause } from "@holochain/tryorama";
import assert from "node:assert";
import { get } from "svelte/store";
import { EmergenceClient } from "../ui/src/emergence-client.js";
import { EmergenceStore } from "../ui/src/emergence-store.js";
import { runScaleTest } from "./scale-common.js";

const run = async () => {
    const scenario = new Scenario();

    const conductorCount = 1;
    const agentsPerConductor = 1;

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

    await scenario.shareAllAgents();

    console.log(`Created ${conductorCount} conductors with ${agentsPerConductor} agents each.`);
    console.log();

    await scenario.conductors[0].attachAppInterface();
    await scenario.conductors[0].connectAppInterface();
    const aliceAppWs = scenario.conductors[0].appWs();
    const onSignal = aliceAppWs.on.bind(aliceAppWs, "signal");
    const aliceCellId = agentAppsPerConductor[0][0].cells[0].cell_id;

    // *** START TEST ***

    await runScaleTest(aliceAppWs, onSignal, aliceCellId, agentAppsPerConductor);

    await scenario.cleanUp();
    // let startTime = Date.now();
    // let totalTimeElapsed: number;
    // let outputPrinted = false;
    // let notesCreatedThisMinute = 0;
    // let notesCreatedTotal = 0;
    // let thisMinuteStartTime = startTime;
    // let thisMinuteMetricsSaved = false;

    // do {
    //     totalTimeElapsed = Date.now() - startTime;

    //     if (notesCreatedThisMinute < notesPerMin) {
    //         for (let i = 0; i < conductorCount; i++) {
    //             const notesForConductor = [];
    //             for (let j = 0; j < agentsPerConductor; j++) {
    //                 const cell = agentAppsPerConductor[i][j].cells[0];
    //                 const sessionIndex = getRandomNumber(sessions);
    //                 const note: Note = {
    //                     session: sessions[sessionIndex].original_hash,
    //                     text: `note: minute ${Math.ceil(totalTimeElapsed / 1000 / 60)}`,
    //                     tags: [],
    //                     trashed: false
    //                 };
    //                 notesForConductor.push(createNote(cell, note));
    //             }
    //             const notes: Record[] = await Promise.all(notesForConductor);
    //             notes.forEach((note) => console.log('note', note));
    //             assert.equal(notes.length, agentsPerConductor);
    //             notes.forEach((note) => store.needNote(note.signed_action.hashed.hash));
    //             notesCreatedThisMinute += notes.length;
    //             notesCreatedTotal += notes.length;
    //         }
    //     } else if (!thisMinuteMetricsSaved) {
    //         const timeElapsedToCreateAllNotes = Date.now() - thisMinuteStartTime;
    //         metricsPerMin.push({ timeElapsedToCreateAllNotes });
    //         thisMinuteMetricsSaved = true;
    //     }

    //     if (totalTimeElapsed % outputInterval <= 10) {
    //         if (!outputPrinted) {
    //             const secondsElapsed = Math.floor(totalTimeElapsed / 1000);
    //             console.log(`Checkpoint at ${secondsElapsed} s: ${notesCreatedThisMinute} notes have been created this minute and ${notesCreatedTotal} in total.`);
    //             outputPrinted = true;
    //             // await pause(0); // needed because otherwise all output is printed at the end
    //         }
    //     } else {
    //         outputPrinted = false;
    //     }

    //     if (totalTimeElapsed > 0 && totalTimeElapsed % (1000 * 60) === 0) { // a minute has passed
    //         notesCreatedThisMinute = 0;
    //         thisMinuteStartTime = Date.now();
    //         thisMinuteMetricsSaved = false;
    //     }
    // } while (totalTimeElapsed < testDuration);

    // await pause(5000);  // wait because creating notes calls fetchSessions and doesn't await

    // console.log();

    // let avgToCreateNotes = 0;
    // metricsPerMin.forEach((metrics) => {
    //     console.log(`It took ${metrics.timeElapsedToCreateAllNotes} ms to create ${notesPerMin} notes.`);
    //     avgToCreateNotes += metrics.timeElapsedToCreateAllNotes;
    // });
    // avgToCreateNotes /= metricsPerMin.length;
    // console.log(`On average it took ${avgToCreateNotes} ms to create ${notesPerMin} notes.`);

    // const feed = await store.fetchFeed();
    // console.log('feed', feed);

    // globalThis.clearInterval(store.neededStuffStore.intervalId);
    // globalThis.clearInterval(store.loader);
};

run();