import { assert, test } from "vitest";

import { runScenario, pause, dhtSync, CallableCell } from '@holochain/tryorama';
import { NewEntryAction, ActionHash, Record, AppBundleSource,  fakeActionHash, fakeAgentPubKey, fakeEntryHash } from '@holochain/client';
import { decode } from '@msgpack/msgpack';

import { createRelations, createSession, sampleRelation } from './common.js';

test('create a Session and get all sessions', async () => {
  await runScenario(async scenario => {
    // Construct proper paths for your app.
    // This assumes app bundle created by the `hc app pack` command.
    const testAppPath = process.cwd() + '/../workdir/emergence.happ';

    // Set up the app to be installed 
    const appSource = { appBundleSource: { type: "path", value: testAppPath } };

    // Add 2 players with the test app to the Scenario. The returned players
    // can be destructured.
    const [alice, bob] = await scenario.addPlayersWithApps([appSource, appSource]);

    // Shortcut peer discovery through gossip and register all agents in every
    // conductor of the scenario.
    await scenario.shareAllAgents();

    // Bob gets all sessions
    let collectionOutput: Record[] = await bob.cells[0].callZome({
      zome_name: "emergence",
      fn_name: "get_all_sessions",
      payload: null
    });
    assert.equal(collectionOutput.length, 0);

    // Alice creates a Session with a relation
    const createdRecord: Record = await createSession(alice.cells[0]);
    assert.ok(createdRecord);
    let sessionRecord = decode((createdRecord.entry as any).Present.entry) as any

    const originalActionHash = createdRecord.signed_action.hashed.hash
    const createdRelation = {
      src: originalActionHash,
      dst: originalActionHash,
      content: {
        path: "session/rating",
        data: JSON.stringify(5),
      }
    }
    const _actionHashes = await createRelations(alice.cells[0], [createdRelation]);

    await dhtSync([alice, bob], alice.cells[0].cell_id[0]);
    
    // Bob gets all sessions again
    collectionOutput = await bob.cells[0].callZome({
      zome_name: "emergence",
      fn_name: "get_all_sessions",
      payload: null
    });
    assert.equal(collectionOutput.length, 1);
    assert.deepEqual(originalActionHash, collectionOutput[0].original_hash);
    assert.deepEqual(createdRecord, collectionOutput[0].record);
    assert.equal(collectionOutput[0].relations.length, 1);
    assert.deepEqual(createdRelation, collectionOutput[0].relations[0].relation);

    // Alice updates the session
    let updatedTitle = "title2";
    let updateInput = {
      original_session_hash: originalActionHash,
      previous_session_hash: originalActionHash,
      updated_type: sessionRecord.session_type,
      updated_title: updatedTitle,
      updated_amenities: 1,
      updated_description: sessionRecord.description,
      updated_leaders: sessionRecord.leaders,
      updated_smallest: sessionRecord.smallest,
      updated_largest: sessionRecord.largest,
      updated_duration: sessionRecord.duration,
      updated_trashed: sessionRecord.trashed,
    };

    let updatedRecord: Record = await alice.cells[0].callZome({
      zome_name: "emergence",
      fn_name: "update_session",
      payload: updateInput,
    });
    assert.ok(updatedRecord);

    await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

    // Bob gets all sessions again
    collectionOutput = await bob.cells[0].callZome({
      zome_name: "emergence",
      fn_name: "get_all_sessions",
      payload: null
    });
    assert.equal(collectionOutput.length, 1);
    assert.deepEqual(originalActionHash, collectionOutput[0].original_hash);
    assert.deepEqual(updatedRecord, collectionOutput[0].record);
    assert.equal(collectionOutput[0].relations.length, 1);
    assert.deepEqual(createdRelation, collectionOutput[0].relations[0].relation);


  });
});

