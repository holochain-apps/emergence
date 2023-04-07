import { CallableCell } from '@holochain/tryorama';
import { Timestamp, NewEntryAction, ActionHash, Record, AppBundleSource, fakeActionHash, fakeAgentPubKey, fakeEntryHash, fakeDnaHash } from '@holochain/client';



export async function sampleSession(cell: CallableCell, partialSession = {}) {
    return {
        ...{
	  key: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
	  title: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
        },
        ...partialSession
    };
}

export async function createSession(cell: CallableCell, session = undefined): Promise<Record> {
    return cell.callZome({
      zome_name: "emergence",
      fn_name: "create_session",
      payload: session || await sampleSession(cell),
    });
}



export async function sampleSpace(cell: CallableCell, partialSpace = {}) {
    return {
        ...{
	  name: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
	  description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
        },
        ...partialSpace
    };
}

export async function createSpace(cell: CallableCell, space = undefined): Promise<Record> {
    return cell.callZome({
      zome_name: "emergence",
      fn_name: "create_space",
      payload: space || await sampleSpace(cell),
    });
}

export async function sampleTimeWindow(cell: CallableCell, partialTimeWindow = {}) {
    const start: Timestamp = 10000
    return {
        ...{
	  start,
	  length: 30,
        },
        ...partialTimeWindow
    };
}

export async function createTimeWindow(cell: CallableCell, timeWindow = undefined): Promise<Record> {
    return cell.callZome({
      zome_name: "emergence",
      fn_name: "create_time_window",
      payload: timeWindow || await sampleTimeWindow(cell),
    });
}


export async function sampleRelation(cell: CallableCell, partialRelation = {}) {
    let record = await createSpace(cell)

    return {
        ...{
      src: record.signed_action.hashed.hash,
      dst: record.signed_action.hashed.hash,
      content: {
        path: "entry/rating",
        data: JSON.stringify(5),
      }
        },
        ...partialRelation
    };
}

export async function sampleRelationAgent(cell: CallableCell, partialRelation = {}) {

    return {
        ...{
      src: cell.cell_id[1],
      dst: cell.cell_id[1],
      content: {
        path: "agent/rating",
        data: JSON.stringify(5),
      }
        },
        ...partialRelation
    };
}


export async function createRelation(cell: CallableCell, relation = undefined): Promise<Record> {
    return cell.callZome({
      zome_name: "emergence",
      fn_name: "create_relation",
      payload: relation || await sampleRelation(cell),
    });
}

