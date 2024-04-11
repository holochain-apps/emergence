use hdk::prelude::*;
use emergence_integrity::*;
use std::collections::HashMap;
use crate::{relation::{get_relations, RelationInfo}, map::get_map};

#[derive(Serialize, Deserialize, Debug, SerializedBytes, Clone)]
pub struct MapInfo{
    pub original_hash: ActionHash,
    pub record: Record,
    pub relations: Vec<RelationInfo>,
}

#[hdk_extern]
pub fn get_all_maps(_: ()) -> ExternResult<Vec<MapInfo>> {
    let path = Path::from("all_maps");
    let input: GetLinksInput = GetLinksInputBuilder::try_new(path.path_entry_hash()?, LinkTypes::AllMaps)?.build();
    let links = get_links(input)?;

    let mut records: Vec<Record> = Vec::new();
    let mut hashes: HashMap<ActionHash,ActionHash>= HashMap::new();
    for link in links {
        if let Some(record) = get_map(ActionHash::try_from(link.target.clone()).map_err(|err| wasm_error!(err))?)? {
            hashes.insert(record.action_address().clone(), ActionHash::try_from(link.target).map_err(|err| wasm_error!(err))?);
            records.push(record);
        }
    }
    let mut maps: Vec<MapInfo> = Vec::new();
    for r in records {
        let hash = r.action_address().clone();
        let original_hash = hashes.get(&hash).unwrap().clone();
        let relations = get_relations(AnyLinkableHash::from(original_hash.clone()))?;
        maps.push(MapInfo {
            original_hash,
            record: r,
            relations
        })
    };
    Ok(maps)
}
