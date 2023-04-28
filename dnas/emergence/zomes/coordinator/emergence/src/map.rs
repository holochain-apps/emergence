use hdk::prelude::*;
use emergence_integrity::*;
#[hdk_extern]
pub fn create_map(map: Map) -> ExternResult<Record> {
    let map_hash = create_entry(&EntryTypes::Map(map.clone()))?;

    let record = get(map_hash.clone(), GetOptions::default())?
        .ok_or(
            wasm_error!(
                WasmErrorInner::Guest(String::from("Could not find the newly created Map"))
            ),
        )?;
    let path = Path::from("all_maps");
    create_link(path.path_entry_hash()?, map_hash.clone(), LinkTypes::AllMaps, ())?;
    Ok(record)
}
#[hdk_extern]
pub fn get_map(original_map_hash: ActionHash) -> ExternResult<Option<Record>> {
    let links = get_links(original_map_hash.clone(), LinkTypes::MapUpdates, None)?;
    let latest_link = links
        .into_iter()
        .max_by(|link_a, link_b| link_a.timestamp.cmp(&link_b.timestamp));
    let latest_map_hash = match latest_link {
        Some(link) => ActionHash::from(link.target.clone()),
        None => original_map_hash.clone(),
    };
    get(latest_map_hash, GetOptions::default())
}
#[derive(Serialize, Deserialize, Debug)]
pub struct UpdateMapInput {
    pub original_map_hash: ActionHash,
    pub previous_map_hash: ActionHash,
    pub updated_map: Map,
}
#[hdk_extern]
pub fn update_map(input: UpdateMapInput) -> ExternResult<Record> {
    let updated_map_hash = update_entry(
        input.previous_map_hash.clone(),
        &input.updated_map,
    )?;
    create_link(
        input.original_map_hash.clone(),
        updated_map_hash.clone(),
        LinkTypes::MapUpdates,
        (),
    )?;
    let record = get(updated_map_hash.clone(), GetOptions::default())?
        .ok_or(
            wasm_error!(
                WasmErrorInner::Guest(String::from("Could not find the newly updated Map"))
            ),
        )?;
    Ok(record)
}
#[hdk_extern]
pub fn delete_map(original_map_hash: ActionHash) -> ExternResult<ActionHash> {
    delete_entry(original_map_hash)
}
