
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
    let links = get_links(path.path_entry_hash()?, LinkTypes::AllSessions, None)?;

    let mut records: Vec<Record> = Vec::new();
    let mut hashes: HashMap<ActionHash,ActionHash>= HashMap::new();
    for link in links {
        if let Some(record) = get_session(ActionHash::from(link.target.clone()))? {
            hashes.insert(record.action_address().clone(), ActionHash::from(link.target));
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
