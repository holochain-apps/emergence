import { assert, test } from "vitest";

import { runScenario, pause, CallableCell } from '@holochain/tryorama';
import { NewEntryAction, ActionHash, Record, AppBundleSource, fakeDnaHash, fakeActionHash, fakeAgentPubKey, fakeEntryHash } from '@holochain/client';
import { decode } from '@msgpack/msgpack';

import { createSession, sampleSession } from './common.js';

test('create Session', async () => {
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

    // Alice creates a Session
    const record: Record = await createSession(alice.cells[0]);
    assert.ok(record);
  });
});

test('create and read Session', async () => {
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

    const sample = await sampleSession(alice.cells[0]);

    // Alice creates a Session
    const record: Record = await createSession(alice.cells[0], sample);
    assert.ok(record);

    // Wait for the created entry to be propagated to the other node.
    await pause(1200);

    // Bob gets the created Session
    const createReadOutput: Record = await bob.cells[0].callZome({
      zome_name: "emergence",
      fn_name: "get_session",
      payload: record.signed_action.hashed.hash,
    });
    assert.deepEqual(sample, decode((createReadOutput.entry as any).Present.entry) as any);
  });
});

test('create and update Session', async () => {
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

    // Alice creates a Session
    const record: Record = await createSession(alice.cells[0]);
    assert.ok(record);
        
    const originalActionHash = record.signed_action.hashed.hash;
 
    // Alice updates the Session
    let updatedTitle = "title2";
    let updatedAmenities = 6;
    let updateInput = {
      original_session_hash: originalActionHash,
      previous_session_hash: originalActionHash,
      updated_title: updatedTitle,
      updated_amenities: updatedAmenities,
    };

    let updatedRecord: Record = await alice.cells[0].callZome({
      zome_name: "emergence",
      fn_name: "update_session",
      payload: updateInput,
    });
    assert.ok(updatedRecord);

    // Wait for the updated entry to be propagated to the other node.
    await pause(1200);
        
    // Bob gets the updated Session
    const readUpdatedOutput0: Record = await bob.cells[0].callZome({
      zome_name: "emergence",
      fn_name: "get_session",
      payload: updatedRecord.signed_action.hashed.hash,
    });
    let updatedSession = decode((readUpdatedOutput0.entry as any).Present.entry) as any
    assert.equal(updatedTitle,updatedSession.title );
    assert.equal(updatedAmenities,updatedSession.amenities );

    // Alice updates the Session again
    updatedTitle = "title3";
    updatedAmenities = 10;
    updateInput = { 
      original_session_hash: originalActionHash,
      previous_session_hash: updatedRecord.signed_action.hashed.hash,
      updated_title: updatedTitle,
      updated_amenities: updatedAmenities,
    };

    updatedRecord = await alice.cells[0].callZome({
      zome_name: "emergence",
      fn_name: "update_session",
      payload: updateInput,
    });
    assert.ok(updatedRecord);

    // Wait for the updated entry to be propagated to the other node.
    await pause(1200);
        
    // Bob gets the updated Session
    const readUpdatedOutput1: Record = await bob.cells[0].callZome({
      zome_name: "emergence",
      fn_name: "get_session",
      payload: updatedRecord.signed_action.hashed.hash,
    });
    updatedSession = decode((readUpdatedOutput1.entry as any).Present.entry) as any
    assert.equal(updatedTitle,updatedSession.title );  
    assert.equal(updatedAmenities,updatedSession.amenities );
  });
});

test('create and delete Session', async () => {
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

    // Alice creates a Session
    const record: Record = await createSession(alice.cells[0]);
    assert.ok(record);
        
    // Alice deletes the Session
    const deleteActionHash = await alice.cells[0].callZome({
      zome_name: "emergence",
      fn_name: "delete_session",
      payload: record.signed_action.hashed.hash,
    });
    assert.ok(deleteActionHash);

    // Wait for the entry deletion to be propagated to the other node.
    await pause(1200);
        
    // Bob tries to get the deleted Session
    const readDeletedOutput = await bob.cells[0].callZome({
      zome_name: "emergence",
      fn_name: "get_session",
      payload: record.signed_action.hashed.hash,
    });
    assert.notOk(readDeletedOutput);
  });
});
