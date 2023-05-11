import { assert, test } from "vitest";
import { pathToFileURL, fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { EntryRecord } from "@holochain-open-dev/utils";

import { TryCpServer, TryCpScenario, runScenario, pause, CallableCell, createConductor, addAllAgentsToAllConductors, cleanAllConductors, TryCpClient, AgentsAppsOptions, AgentApp } from '@holochain/tryorama';
import { NewEntryAction, ActionHash, Record, AppBundleSource, fakeActionHash, fakeAgentPubKey, fakeEntryHash, EntryHash, AppAgentCallZomeRequest, AppAgentClient, AppAgentWebsocket, AppBundle } from '@holochain/client';
import { decode } from '@msgpack/msgpack';

import { createNote, createSession, createSpace, sampleNote, sampleSession, sampleSpace } from './common.js';
// const fs = require("fs");

//import { FileStorageClient } from "@holochain-open-dev/file-storage";

import { EmergenceClient } from '../../../../ui/src/emergence-client';
import { EmergenceStore } from '../../../../ui/src/emergence-store';
import { get } from "svelte/store";
import { Note, Session, Space } from "../../../../ui/src/emergence/emergence/types.js";

export interface FileMetadata {
  name: string;
  last_modifed: number;
  size: number;
  file_type: string;
  chunks_hashes: Array<EntryHash>;
}
export class FileStorageClient {
  /**
   * @param client connection to the holochain backend
   * @param zomeName the zome name of the file_storage zome in the given cell
   */
  constructor(
    public cell,
    public zomeName: string = "file_storage"
  ) { }

  /**
   * Upload a file to the file_storage zome, splitting it into chunks
   *
   * @param file file to split and upload
   * @param chunkSize chunk size to split the file, default 256 KB
   */
  async uploadFile(
    file: File,
    onProgress:
      | undefined
      | ((percentatgeProgress: number, bytesSent: number) => void) = undefined,
    chunkSize: number = 256 * 1024
  ): Promise<EntryHash> {
    const blobs = this._splitFile(file, chunkSize);
    const numberOfChunks = blobs.length;
    const bytesPerChunk = blobs[0].size;

    const chunksHashes: Array<EntryHash> = [];
    for (let i = 0; i < blobs.length; i++) {
      const chunkHash = await this._createChunk(blobs[i]);
      chunksHashes.push(chunkHash);
      if (onProgress) {
        onProgress(((i + 1) * 1.0) / numberOfChunks, bytesPerChunk * (i + 1));
      }
    }

    const fileToCreate = {
      name: file.name,
      size: file.size,
      file_type: file.type,
      last_modified: file.lastModified,
      chunks_hashes: chunksHashes,
    };
    const hash = await this._callZome("create_file_metadata", fileToCreate);

    return hash;
  }

  /**
   * Downloads the whole file with the given hash
   * @param fileHash
   */
  async downloadFile(fileHash: EntryHash): Promise<File> {
    const metadata = await this.getFileMetadata(fileHash);

    const fetchChunksPromises = metadata.chunks_hashes.map((hash) =>
      this.fetchChunk(hash)
    );

    const chunks = await Promise.all(fetchChunksPromises);

    const file = new File(chunks, metadata.name, {
      lastModified: metadata.last_modifed,
      type: metadata.file_type,
    });

    return file;
  }

  /**
   * Gets only the metadata of the file with the given hash
   * This is specially useful if you want to fetch the chunks one by one
   * @param fileHash the hash of the file
   */
  async getFileMetadata(fileHash: EntryHash): Promise<FileMetadata> {
    return await this._callZome("get_file_metadata", fileHash);
  }

  /**
   * Fetch the chunk identified with the given hash
   * This is useful if used with the chunk hashes received with `getFileMetadata`
   * @param fileChunkHash
   */
  async fetchChunk(fileChunkHash: EntryHash): Promise<Blob> {
    const bytes = await this._callZome("get_file_chunk", fileChunkHash);

    return new Blob([new Uint8Array(bytes)]);
  }

  /** Private helpers */

  private _splitFile(file: File, chunkSize: number): Blob[] {
    let offset = 0;
    const chunks: Blob[] = [];

    while (file.size > offset) {
      const chunk = file.slice(offset, offset + chunkSize);
      offset += chunkSize;
      chunks.push(chunk);
    }

    return chunks;
  }

  private async _createChunk(chunk: Blob): Promise<EntryHash> {
    const bytes = await chunk.arrayBuffer();

    return this._callZome("create_file_chunk", new Uint8Array(bytes));
  }

  private _callZome(fn_name: string, payload: any) {
    return this.cell.callZome(this.zomeName, fn_name, payload);
  }
}

// test('scale testing', async () => {
//   // Construct proper paths for your app.
//   // This assumes app bundle created by the `hc app pack` command.
//   const testAppPath = process.cwd() + '/../workdir/emergence.happ';

//   //   console.log("FISH")
//   //   fs.readFile('./package.json',
//   //   // callback function that is called when reading file is done
//   //   function(err, data) {       
//   //     console.log("FISH1", err, data)

//   //       if (err) throw err;
//   //       // data is a buffer containing file content
//   //       console.log("FISH3",data.toString('utf8'))
//   //  });

//   // Set up the app to be installed 
//   const appSource = { path: testAppPath };

//   const conductorCount = 2
//   const agentsPerConductor = 10
//   const spacesCount = 50
//   const sessionsCount = 60
//   const windowsCount = 4
//   const notesPerMin = 10
//   const minuntesOfNotes = 2

//   const conductors = []
//   for (let x = 0; x < conductorCount; x++) {
//     conductors.push(await createConductor())
//   };

//   const appDefs = []
//   for (let x = 0; x < agentsPerConductor; x++) {
//     appDefs.push({ app: appSource })
//   }
//   const conductorPlayers = []
//   for (let x = 0; x < conductorCount; x++) {
//     conductorPlayers[x] = await conductors[x].installAgentsApps({
//       agentsApps: appDefs,
//     })
//   };
//   await addAllAgentsToAllConductors(conductors);

//   const spaces = []
//   // agent 1 creates a bunch of spaces
//   for (let x = 0; x < spacesCount; x++) {
//     const space = await sampleSpace(conductorPlayers[0][0].cells[0])
//     space.name = `space ${x}`
//     const createdRecord: Record = await createSpace(conductorPlayers[0][0].cells[0], space);
//     const originalActionHash = createdRecord.signed_action.hashed.hash
//     assert.ok(createdRecord);
//     spaces.push(originalActionHash)
//   }

//   const sessions = []
//   // agent 1 creates a bunch of spaces
//   for (let x = 0; x < sessionsCount; x++) {
//     const session = await sampleSession(conductorPlayers[0][0].cells[0])
//     session.title = `session ${x}`
//     const createdRecord: Record = await createSession(conductorPlayers[0][0].cells[0], session);
//     const originalActionHash = createdRecord.signed_action.hashed.hash
//     assert.ok(createdRecord);
//     sessions.push(originalActionHash)
//   }

//   await pause(5000);

//   let collectionOutput = await conductorPlayers[1][0].cells[0].callZome({
//     zome_name: "emergence",
//     fn_name: "get_all_spaces",
//     payload: null
//   });
//   assert.equal(collectionOutput.length, spacesCount);

//   collectionOutput = await conductorPlayers[1][0].cells[0].callZome({
//     zome_name: "emergence",
//     fn_name: "get_all_sessions",
//     payload: null
//   });
//   assert.equal(collectionOutput.length, sessionsCount);


//   const fileBits = ["foo"]
//   for (let i = 0; i < minuntesOfNotes; i = i + 1) {
//     const start = new Date
//     for (let x = 0; x < notesPerMin; x++) {

//       const cell = conductorPlayers[x % conductorCount][x % agentsPerConductor].cells[0]

//       const fsClient = new FileStorageClient(cell);

//       // fileBits[0] = `note: minute ${i}, note ${x}`
//       // const file = new File(fileBits, "foo.txt", {
//       //   type: "text/plain",
//       // });

//       //   let file = undefined
//       //   fs.readFile('./package.json',
//       //   // callback function that is called when reading file is done
//       //   function(err, data) {       
//       //       if (err) throw err;
//       //       // data is a buffer containing file content
//       //       file = data
//       //  });


//       //   const fileHash: EntryHash = await fsClient.uploadFile(file);
//       //   console.log("FILEHASH" ,fileHash)

//       const note = await sampleNote(cell)
//       note.text = `note: minute ${i}, note ${x}`
//       // note.pic = fileHash
//       console.log("Adding NOTE", note.text)

//       const record: Record = await createNote(cell, note);
//       assert.ok(record);
//     }
//     const end = new Date
//     //@ts-ignore
//     const elapsed = (end - start)
//     console.log("ELAPSED", elapsed)
//   }
//   for (let x = 0; x < conductorCount; x++) {
//     conductors[x].shutDown()
//   }
//   await cleanAllConductors();
// });


test.only('scale test using scenario', async () => {
  await runScenario(async scenario => {

    const conductorCount = 2
    const agentsPerConductor = 10
    const spacesCount = 1
    const sessionsCount = 1
    const notesPerMin = 500
    const minutesOfNotes = 2
    const testDuration = 1000 * 5; // 5 seconds
    const windowsCount = 4
    const outputInterval = 1000; // each second

    const testAppPath = process.cwd() + '/../workdir/emergence.happ';

    // Set up the app to be installed 
    const appDef: AppBundleSource = { path: testAppPath };
    const appSource = { appBundleSource: appDef };

    const appSources = []
    for (let x = 0; x < conductorCount; x++) {
      appSources.push(appSource)
    };
    const players = await scenario.addPlayersWithApps(appSources);

    const agentAppsPerConductor: AgentApp[][] = new Array(conductorCount);

    const appDefs = []
    for (let x = 1; x < agentsPerConductor; x++) { // one agent is part of the players array
      appDefs.push({ app: appDef })
    }

    for (let x = 0; x < conductorCount; x++) {
      try {
        const agentsApps = await players[x].conductor.installAgentsApps({
          agentsApps: appDefs,
        })
        agentsApps.push(players[x]);
        agentAppsPerConductor[x] = agentsApps;
      } catch (e) {
        console.log("ERROR installAgentsApps", e)
      }
    }

    await scenario.shareAllAgents();

    const aliceAppAgentWs = players[0].conductor.appAgentWs();
    const emergenceClient = new EmergenceClient(aliceAppAgentWs, "emergence");
    const store = new EmergenceStore(emergenceClient, null, null, aliceAppAgentWs.myPubKey)

    // agent 1 creates a bunch of spaces
    for (let x = 0; x < spacesCount; x++) {
      const space = await store.createSpace(x.toString(), `space ${x}`, "description", [], 10, 1, [], null, null);
      assert.ok(space);
    }
    await pause(100);  // we wait here because creating spaces calls fetchSpaces and doesn't await

    let spaces = get(store.spaces);
    assert.equal(spaces.length, spacesCount);

    // agent 1 creates a bunch of sessions
    for (let x = 0; x < sessionsCount; x++) {
      const session = await store.createSession(`session ${x}`, "description", [], 2, 10, 60, 1, null, [])
      assert.ok(session);
    }
    await pause(100);  // we wait here because creating sessions calls fetchSessions and doesn't await

    let sessions = get(store.sessions);
    assert.equal(sessions.length, sessionsCount);

    let startTime = Date.now();
    let timePassed: number;
    let outputPrinted = false;
    let notesCreatedThisMinute = 0;
    let notesCreatedTotal = 0;

    do {
      timePassed = Date.now() - startTime;

      if (notesCreatedThisMinute < notesPerMin) {
        for (let i = 0; i < conductorCount; i++) {
          const notesForConductor = [];
          for (let j = 0; j < agentsPerConductor; j++) {
            const cell = agentAppsPerConductor[i][j].cells[0];
            const note = { text: `note: minute ${Math.ceil(timePassed / 1000 / 60)}`, tags: [] };
            notesForConductor.push(createNote(cell, note));
          }
          const notes = await Promise.all(notesForConductor);
          assert.equal(notes.length, agentsPerConductor);
          notesCreatedThisMinute += notes.length;
          notesCreatedTotal += notes.length;
        }
      }

      if (!outputPrinted && (timePassed % outputInterval === 0)) {
        console.log(`checkpoint at ${timePassed} ms: ${notesCreatedThisMinute} have been created this minute and ${notesCreatedTotal} in total`);
        outputPrinted = true;
        await pause(0);
      } else {
        outputPrinted = false;
      }

      if (timePassed > 0 && timePassed % (1000 * 60) === 0) { // a minute has passed
        notesCreatedThisMinute = 0;
      }
    } while (timePassed < testDuration);

    await pause(1000);  // we wait here because creating notes calls fetchSessions and doesn't await

    // for (const conductor of agentAppsPerConductor) {
    //   for (const agentApps of conductor) {
    //     const seshon = await store.client.getFeed(agentApps.agentPubKey);
    //     console.log('seson', seshon);
    //   }
    // }

    // for (let x = 0; x < sessionsCount; x++) {
    //   const session = store.getSession(sessions[x].original_hash);
    //   const sessionNotes = store.getSessionNotes(session);
    //   assert.equal(sessionNotes.length, agentsPerConductor * testDuration / outputInterval + 1);
    // }

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
    // 4. ?

  });
});

// test.only("random number", () => {
//   let items = [0, 1, 2, 3, 4];
//   console.log('hello', getRandomNumber(items));
// });

const getRandomNumber = (items: Array<any>) => {
  const randomNumber = Math.floor(Math.random() * items.length);
  console.log('number of items', items.length, 'random number', randomNumber);
  return randomNumber;
};

test('scale test with local trycp servers', async () => {

  /**
   * HoloPorts
   * 172.26.175.163
   * 172.26.44.97
   * 0dg3nzqhsywsgtjfgbij48zsph74gcqc2jm4u9xdujo8j9hhs - 172.26.69.163
   */

  // const testAppPath = pathToFileURL(process.cwd() + '/../workdir/emergence.happ');
  // console.log('test app path', testAppPath);

  // Set up the app to be installed 
  // const appSource: AppBundle = {
  //   manifest: {
  //     manifest_version: "1",
  //     name: "kurt", roles: [
  //       {
  //         name: "emergence",
  //         dna: {
  //           url: "",
  //         }
  //       }]
  //   },
  //   resources: {},
  // };

  // const clientCleaner = await TryCpClient.create(new URL("ws://172.26.44.97:9000"));
  // await clientCleaner.cleanAllConductors();
  // const conductor = await clientCleaner.addConductor();
  // const aliceKey = await conductor.adminWs().generateAgentPubKey();
  // const appInfo = await conductor.adminWs().installApp({
  //   agent_key: aliceKey,
  //   bundle: appSource,
  //   installed_app_id: "test" + Math.random(),
  //   membrane_proofs: {},
  // });
  // // await conductor.disconnectAppInterface();
  // // const alice = await conductor.installApp(appSource);
  // // console.log("alice", alice.agentPubKey);
  // await clientCleaner.cleanAllConductors();
  // await clientCleaner.close();

  // const scenario = new TryCpScenario();

  // const [{ client, players }] = await scenario.addClientsPlayers([new URL("ws://172.26.44.97:9000")], {
  //   numberOfConductorsPerClient: 1,
  //   numberOfAgentsPerConductor: 1,
  //   app: appSource
  // });

  // assert.equal(client.conductors.length, 1);
  // assert.equal(players.length, 1);

  // const conductorCount = 2
  // const agentsPerConductor = 10
  // const spacesCount = 5
  // const sessionsCount = 5
  // const windowsCount = 4
  // const notesPerMin = 10
  // const minuntesOfNotes = 2

  // const appDefs = []
  // for (let x = 1; x < agentsPerConductor; x++) {
  //   appDefs.push({ app: appDef })
  // }
  // for (let x = 0; x < conductorCount; x++) {
  //   try {
  //     await players[x].conductor.installAgentsApps({
  //       agentsApps: appDefs,
  //     })
  //   } catch (e) {
  //     console.log("ERROR installAgentsApps", e)
  //   }
  // }
  // await scenario.shareAllAgents();

  // const alice = players[0];
  // const aliceAppAgentWs: AppAgentClient = {
  //   myPubKey: alice.agentPubKey,
  //   appInfo: alice.conductor.appWs().appInfo.bind(null, { installed_app_id: players[0].appId }),
  //   on: alice.conductor.on,
  //   callZome: alice.cells[0].callZome,
  //   createCloneCell: alice.conductor.appWs().createCloneCell,
  //   disableCloneCell: alice.conductor.appWs().disableCloneCell,
  //   enableCloneCell: alice.conductor.appWs().enableCloneCell
  // } as AppAgentClient;
  // const store = new EmergenceStore(new EmergenceClient(aliceAppAgentWs, "emergence"), undefined, undefined, players[0].agentPubKey)

  // const spaces = []
  // // agent 1 creates a bunch of spaces
  // for (let x = 0; x < spacesCount; x++) {
  //   const space = await store.createSpace(`${x}`, `space ${x}`, "description", [], 10, 1, [], undefined, undefined);
  //   assert.ok(space);
  //   spaces.push(space)
  // }

  // const sessions = []
  // // agent 1 creates a bunch of sessions
  // for (let x = 0; x < sessionsCount; x++) {
  //   const leaders = []
  //   const session = await store.createSession(`session ${x}`, "description", leaders, 2, 10, 60, 1, undefined, [])
  //   assert.ok(session);
  //   sessions.push(session)
  // }
  // await pause(4000)  // we wait here because creating sessions calls fetcSessions and doesn't await

  // assert.equal(get(store.sessions).length, sessionsCount);

  // await scenario.cleanUp();

  // Test involves creating the expected number of spaces and sessions and then simulating 
  // user behavior.  Then the test is run multiple times while recording performance metrics 
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
  // 4. ?

});
