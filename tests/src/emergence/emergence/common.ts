import { CallableCell } from '@holochain/tryorama';
import { Timestamp, NewEntryAction, ActionHash, Record, AppBundleSource, fakeActionHash, fakeAgentPubKey, fakeEntryHash, fakeDnaHash } from '@holochain/client';

export async function sampleSession(cell: CallableCell, partialSession = {}) {
    return {
        ...{
	  key: "ABCD",
	  title: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
    description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
    leaders: [cell.cell_id[1]],
    smallest: 2,
    largest: 50,
    duration: 60,
    amenities: 1,
    trashed: false,
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
    amenities: 1,
    stewards: [cell.cell_id[1]],
    capacity: 10,
    tags: [],
    pic: null,
    trashed: false

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

export async function sampleNote(cell: CallableCell, partialNote = {}) {
  return {
      ...{
  text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
  tags: [],
  pic: null,
      },
      ...partialNote
  };
}

export async function createNote(cell: CallableCell, note = undefined): Promise<Record> {
  return cell.callZome({
    zome_name: "emergence",
    fn_name: "create_note",
    payload: note || await sampleNote(cell),
  });
}


export async function sampleTimeWindow(cell: CallableCell, partialTimeWindow = {}) {
    const start: Timestamp = 10000
    return {
        ...{
	  start,
	  duration: 30,
    tags: [],
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
        path: "entry.rating",
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
        path: "agent.rating",
        data: JSON.stringify(5),
      }
        },
        ...partialRelation
    };
}

export async function sampleRelationTag(cell: CallableCell, partialRelation = {}) {
  let sessionRecord = await createSession(cell)
  let noteRecord = await createNote(cell)

  return {
      ...{
      src: sessionRecord.signed_action.hashed.hash,
      dst: noteRecord.signed_action.hashed.hash,
    content: {
      path: "session.tag",
      data: "foo",
    }
      },
      ...partialRelation
  };
}


export async function createRelations(cell: CallableCell, relations = undefined): Promise<Record> {
    return cell.callZome({
      zome_name: "emergence",
      fn_name: "create_relations",
      payload: relations || [await sampleRelation(cell)],
    });
}

