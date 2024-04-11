use hdk::prelude::*;
use emergence_integrity::*;
use std::collections::HashMap;
use crate::{relation::{get_relations, RelationInfo}, space::get_space};

#[derive(Serialize, Deserialize, Debug, SerializedBytes, Clone)]
pub struct SpaceInfo{
    pub original_hash: ActionHash,
    pub record: Record,
    pub relations: Vec<RelationInfo>,
}

#[hdk_extern]
pub fn get_all_spaces(_: ()) -> ExternResult<Vec<SpaceInfo>> {
    let path = Path::from("all_spaces");
    let input: GetLinksInput = GetLinksInputBuilder::try_new(path.path_entry_hash()?, LinkTypes::AllSpaces)?.build();
    let links = get_links(input)?;

    let mut records: Vec<Record> = Vec::new();
    let mut hashes: HashMap<ActionHash,ActionHash>= HashMap::new();
    for link in links {
        if let Some(record) = get_space(ActionHash::try_from(link.target.clone()).map_err(|err| wasm_error!(err))?)? {
            hashes.insert(record.action_address().clone(), ActionHash::try_from(link.target).map_err(|err| wasm_error!(err))?);
            records.push(record);
        }
    }
    let mut spaces: Vec<SpaceInfo> = Vec::new();
    for r in records {
        let hash = r.action_address().clone();
        let original_hash = hashes.get(&hash).unwrap().clone();
        let relations = get_relations(AnyLinkableHash::from(original_hash.clone()))?;
        spaces.push(SpaceInfo {
            original_hash,
            record: r,
            relations
        })
    };
    Ok(spaces)

    // let get_input: Vec<GetInput> = links
    //     .into_iter()
    //     .map(|link| GetInput::new(
    //         ActionHash::from(link.target).into(),
    //         GetOptions::default(),
    //     ))
    //     .collect();
    // let records = HDK.with(|hdk| hdk.borrow().get(get_input))?;
    // let records: Vec<Record> = records.into_iter().filter_map(|r| r).collect();
    // Ok(records)
}
