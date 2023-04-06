import { assert, test } from "vitest";
import { runScenario, pause, CallableCell } from '@holochain/tryorama';
import { NewEntryAction, ActionHash, Record, AppBundleSource,  fakeActionHash, fakeAgentPubKey, fakeEntryHash } from '@holochain/client';
import { decode } from '@msgpack/msgpack';

import { createSlot, sampleSlot, sampleSlotInput } from './common.js';

test('create a slot and get all slots', async () => {
  await runScenario(async scenario => {
    // Construct proper paths for your app.
    // This assumes app bundle created by the `hc app pack` command.
    const testAppPath = process.cwd() + '/../workdir/emergence.happ';

    // Set up the app to be installed 
    const appSource = { appBundleSource: { path: testAppPath } };

    // Add 2 players with the test app to the Scenario. The returned players
    // can be destructured.
    const [alice, bob] = await scenario.addPlayersWithApps([appSource, appSource]);

    // Shortcut peer discovery through gossip and register all agents in every
    // conductor of the scenario.
    await scenario.shareAllAgents();

    // Bob gets all slots
    let collectionOutput: any[] = await bob.cells[0].callZome({
      zome_name: "emergence",
      fn_name: "get_slots",
      payload: null
    });
    assert.equal(collectionOutput.length, 0);

    // Alice creates a Slot
    const createdSlot = await sampleSlot(alice.cells[0])
    const actionHash = await createSlot(alice.cells[0]);
    assert.ok(createdSlot);
    
    await pause(1200);
    
    // Bob gets all slots again
    collectionOutput = await bob.cells[0].callZome({
      zome_name: "emergence",
      fn_name: "get_slots",
      payload: null
    });
    assert.equal(collectionOutput.length, 1);
    assert.deepEqual(createdSlot, collectionOutput[0]);    
  });
});

