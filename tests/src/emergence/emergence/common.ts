import { CallableCell } from '@holochain/tryorama';
import { NewEntryAction, ActionHash, Record, AppBundleSource, fakeActionHash, fakeAgentPubKey, fakeEntryHash, fakeDnaHash } from '@holochain/client';



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
	  title: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
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

