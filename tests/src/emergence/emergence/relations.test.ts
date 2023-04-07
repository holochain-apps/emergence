import { assert, test } from "vitest";
import { runScenario, pause, CallableCell } from '@holochain/tryorama';
import { NewEntryAction, ActionHash, Record, AppBundleSource,  fakeActionHash, fakeAgentPubKey, fakeEntryHash } from '@holochain/client';
import { decode } from '@msgpack/msgpack';

import { createRelation, sampleRelation, sampleRelationAgent } from './common.js';

test('create a relation and get all relations', async () => {
  await runScenario(async scenario => {
    // Construct relationer paths for your app.
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

    const createdRelation = await sampleRelation(alice.cells[0])

    // Bob gets all relations
    let collectionOutput: any[] = await bob.cells[0].callZome({
      zome_name: "emergence",
      fn_name: "get_relations",
      payload: createdRelation.src
    });
    assert.equal(collectionOutput.length, 0);

    // Alice creates a Relation
    const actionHash = await createRelation(alice.cells[0], createdRelation);
    assert.ok(actionHash);
    
    await pause(1200);
    
    // Bob gets all relations again
    collectionOutput = await bob.cells[0].callZome({
      zome_name: "emergence",
      fn_name: "get_relations",
      payload: createdRelation.src
    });
    assert.equal(collectionOutput.length, 1);
    assert.deepEqual(createdRelation, collectionOutput[0]);   

    // const agentRelation = await sampleRelationAgent(bob.cells[0])
    // const actionHash2 = await createRelation(bob.cells[0], agentRelation);
    // assert.ok(actionHash2);

    // // Bob gets all relations again
    // collectionOutput = await bob.cells[0].callZome({
    //   zome_name: "emergence",
    //   fn_name: "get_relations_agent",
    //   payload: bob.cells[0].cell_id[1]
    // });
    // assert.equal(collectionOutput.length, 1);
    // assert.deepEqual(agentRelation, collectionOutput[0]);    

  });


});

