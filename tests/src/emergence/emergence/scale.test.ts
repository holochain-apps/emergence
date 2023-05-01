import { assert, test } from "vitest";

import { runScenario, pause, CallableCell, createConductor, addAllAgentsToAllConductors, cleanAllConductors } from '@holochain/tryorama';
import { NewEntryAction, ActionHash, Record, AppBundleSource,  fakeActionHash, fakeAgentPubKey, fakeEntryHash, EntryHash, AppAgentCallZomeRequest, AppAgentClient } from '@holochain/client';
import { decode } from '@msgpack/msgpack';

import { createNote, createSession, createSpace, sampleNote, sampleSession, sampleSpace } from './common.js';
// const fs = require("fs");

//import { FileStorageClient } from "@holochain-open-dev/file-storage";

import { EmergenceClient } from '../../../../ui/src/emergence-client';
import { EmergenceStore } from '../../../../ui/src/emergence-store';
import { get } from "svelte/store";

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
  ) {}

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
    return this.cell.callZome(this.zomeName,fn_name,payload);
  }
}

test('scale testing', async () => {
    // Construct proper paths for your app.
    // This assumes app bundle created by the `hc app pack` command.
    const testAppPath = process.cwd() + '/../workdir/emergence.happ';

  //   console.log("FISH")
  //   fs.readFile('./package.json',
  //   // callback function that is called when reading file is done
  //   function(err, data) {       
  //     console.log("FISH1", err, data)

  //       if (err) throw err;
  //       // data is a buffer containing file content
  //       console.log("FISH3",data.toString('utf8'))
  //  });
    
    // Set up the app to be installed 
    const appSource = { path: testAppPath } ;

    const conductorCount = 2
    const agentsPerConductor = 10
    const spacesCount = 50
    const sessionsCount = 60
    const windowsCount = 4
    const notesPerMin = 10
    const minuntesOfNotes = 2

    const conductors = []
    for (let x=0; x< conductorCount; x=x+1) {
      conductors.push(await createConductor())
    };

    const appDefs = []
    for (let x=0; x< agentsPerConductor; x=x+1) {
      appDefs.push({app: appSource})
    }
    const conductorPlayers = []
    for (let x=0; x< conductorCount; x=x+1) {
      conductorPlayers[x] = await conductors[x].installAgentsApps({
        agentsApps: appDefs,
      })
    };
    await addAllAgentsToAllConductors(conductors);

    const spaces = []
    // agent 1 creates a bunch of spaces
    for (let x=0; x< spacesCount; x=x+1) {
      const space = await sampleSpace(conductorPlayers[0][0].cells[0])
      space.name = `space ${x}`
      const createdRecord: Record = await createSpace(conductorPlayers[0][0].cells[0], space);
      const originalActionHash = createdRecord.signed_action.hashed.hash
      assert.ok(createdRecord);
      spaces.push(originalActionHash)
    }

    const sessions = []
    // agent 1 creates a bunch of spaces
    for (let x=0; x< sessionsCount; x=x+1) {
      const session = await sampleSession(conductorPlayers[0][0].cells[0])
      session.title = `session ${x}`
      const createdRecord: Record = await createSession(conductorPlayers[0][0].cells[0], session);
      const originalActionHash = createdRecord.signed_action.hashed.hash
      assert.ok(createdRecord);
      sessions.push(originalActionHash)
    }

    await pause(5000);
    
    let collectionOutput = await conductorPlayers[1][0].cells[0].callZome({
      zome_name: "emergence",
      fn_name: "get_all_spaces",
      payload: null
    });
    assert.equal(collectionOutput.length, spacesCount);

    collectionOutput = await conductorPlayers[1][0].cells[0].callZome({
      zome_name: "emergence",
      fn_name: "get_all_sessions",
      payload: null
    });
    assert.equal(collectionOutput.length, sessionsCount);


    const fileBits = ["foo"]
    for (let i=0; i< minuntesOfNotes; i=i+1) {
      const start = new Date
      for (let x=0; x< notesPerMin; x=x+1) {

        const cell = conductorPlayers[x%conductorCount][x%agentsPerConductor].cells[0]

        const fsClient = new FileStorageClient(cell);

        // fileBits[0] = `note: minute ${i}, note ${x}`
        // const file = new File(fileBits, "foo.txt", {
        //   type: "text/plain",
        // });
    
      //   let file = undefined
      //   fs.readFile('./package.json',
      //   // callback function that is called when reading file is done
      //   function(err, data) {       
      //       if (err) throw err;
      //       // data is a buffer containing file content
      //       file = data
      //  });


      //   const fileHash: EntryHash = await fsClient.uploadFile(file);
      //   console.log("FILEHASH" ,fileHash)

        const note = await sampleNote(cell)
        note.text = `note: minute ${i}, note ${x}`
        // note.pic = fileHash
        console.log("Adding NOTE", note.text)

        const record: Record = await createNote(cell, note);
        assert.ok(record);
      }
      const end = new Date
      //@ts-ignore
      const elapsed = (end - start)
      console.log("ELAPSED", elapsed)
    }
    for (let x=0; x< conductorCount; x=x+1) {
      conductors[x].shutDown()
    }
    await cleanAllConductors();
  });


  test('scale test using scenario', async () => {
    await runScenario(async scenario => {

      const conductorCount = 2
      const agentsPerConductor = 10
      const spacesCount = 5
      const sessionsCount = 5
      const windowsCount = 4
      const notesPerMin = 10
      const minuntesOfNotes = 2
  

      const testAppPath = process.cwd() + '/../workdir/emergence.happ';

      // Set up the app to be installed 
      const appSource = { appBundleSource: { path: testAppPath } };
      const appSources = []
      for (let x=0; x< conductorCount; x=x+1) {
        appSources.push(appSource)
      };
      const players = await scenario.addPlayersWithApps(appSources);


      const appDef = { path: testAppPath } ;

      const appDefs = []
      for (let x=1; x< agentsPerConductor; x=x+1) {
        appDefs.push({app: appDef})
      }
      for (let x=0; x< conductorCount; x=x+1) {
        try {
          await players[x].conductor.installAgentsApps({
            agentsApps: appDefs,
          })
        } catch(e) {
          console.log("ERROR installAgentsApps",e )
        }
      }
      await scenario.shareAllAgents();

      const aliceAppAgentWs = players[0].conductor.appAgentWs();
      const store = new EmergenceStore(new EmergenceClient(aliceAppAgentWs, "emergence"), undefined, undefined, aliceAppAgentWs.myPubKey)

      const spaces = []
      // agent 1 creates a bunch of spaces
      for (let x=0; x< spacesCount; x=x+1) {
        const space = await store.createSpace(`space ${x}`,"description",[], 10,1,[], undefined,undefined);
        assert.ok(space);
        spaces.push(space)
      }

      const sessions = []
      // agent 1 creates a bunch of sessions
      for (let x=0; x< sessionsCount; x=x+1) {
        const leaders = []
        const session = await store.createSession(`session ${x}`,"description",leaders, 2,10,60,1,undefined)
        assert.ok(session);
        sessions.push(session)
      }
      await pause(4000)  // we wait here because creating sessions calls fetcSessions and doesn't await t

      assert.equal(get(store.sessions).length, sessionsCount);

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

  });
