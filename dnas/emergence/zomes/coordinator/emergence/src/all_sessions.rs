
use std::collections::HashMap;

use hdk::prelude::*;
use emergence_integrity::*;

use crate::{relation::{get_relations, RelationInfo}, session::get_session};


#[derive(Serialize, Deserialize, Debug, SerializedBytes, Clone)]
pub struct SessionInfo {
    pub original_hash: ActionHash,
    pub record: Record,
    pub relations: Vec<RelationInfo>,
}

#[hdk_extern]
pub fn get_all_sessions(_: ()) -> ExternResult<Vec<SessionInfo>> {
    let path = Path::from("all_sessions");
    let input: GetLinksInput = GetLinksInputBuilder::try_new(path.path_entry_hash()?, LinkTypes::AllSessions)?.build();
    let links = get_links(input)?;

    let mut records: Vec<Record> = Vec::new();
    let mut hashes: HashMap<ActionHash,ActionHash>= HashMap::new();
    for link in links {
        if let Some(record) = get_session(ActionHash::try_from(link.target.clone()).map_err(|err| wasm_error!(err))?)? {
            hashes.insert(record.action_address().clone(), ActionHash::try_from(link.target).map_err(|err| wasm_error!(err))?);
            records.push(record);
        }
    }

    // let get_input: Vec<GetInput> = links
    //     .into_iter()
    //     .map(|link| GetInput::new(
    //         ActionHash::from(link.target).into(),
    //         GetOptions::default(),
    //     ))
    //     .collect();
    // let records = HDK.with(|hdk| hdk.borrow().get(get_input))?;
    let mut sessions: Vec<SessionInfo> = Vec::new();
    for r in records {
        let hash = r.action_address().clone();
        let original_hash = hashes.get(&hash).unwrap().clone();
        let relations = get_relations(AnyLinkableHash::from(original_hash.clone()))?;
        sessions.push(SessionInfo {
            original_hash,
            record: r,
            relations
        })
    };
    Ok(sessions)
}
