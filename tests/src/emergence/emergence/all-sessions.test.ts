import { assert, test } from "vitest";

import { runScenario, pause, CallableCell } from '@holochain/tryorama';
import { NewEntryAction, ActionHash, Record, AppBundleSource,  fakeActionHash, fakeAgentPubKey, fakeEntryHash } from '@holochain/client';
import { decode } from '@msgpack/msgpack';

import { createRelations, createSession, sampleRelation } from './common.js';

test('create a Session and get all sessions', async () => {
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

    await pause(1200);
    
    // Bob gets all sessions again
    collectionOutput = await bob.cells[0].callZome({
      zome_name: "emergence",
      fn_name: "get_all_sessions",
      payload: null
    });
    assert.equal(collectionOutput.length, 1);
    const sessionInfo: any = {original_hash: originalActionHash, record:createdRecord, relations:[createdRelation]}
    assert.deepEqual(sessionInfo, collectionOutput[0]);

    // Alice updates the session
    let updatedTitle = "title2";
    let updateInput = {
      original_session_hash: originalActionHash,
      previous_session_hash: originalActionHash,
      updated_title: updatedTitle,
      updated_amenities: 1,
    };

    let updatedRecord: Record = await alice.cells[0].callZome({
      zome_name: "emergence",
      fn_name: "update_session",
      payload: updateInput,
    });
    assert.ok(updatedRecord);

    await pause(1200);
    
    // Bob gets all sessions again
    collectionOutput = await bob.cells[0].callZome({
      zome_name: "emergence",
      fn_name: "get_all_sessions",
      payload: null
    });
    assert.equal(collectionOutput.length, 1);
    const sessionInfo2: any = {original_hash: originalActionHash, record:updatedRecord, relations:[createdRelation]}
    assert.deepEqual(sessionInfo2, collectionOutput[0]);


  });
});

