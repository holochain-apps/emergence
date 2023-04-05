use hdk::prelude::*;
use emergence_integrity::*;
#[hdk_extern]
pub fn create_space(space: Space) -> ExternResult<Record> {
    let space_hash = create_entry(&EntryTypes::Space(space.clone()))?;
    let record = get(space_hash.clone(), GetOptions::default())?
        .ok_or(
            wasm_error!(
                WasmErrorInner::Guest(String::from("Could not find the newly created Space"))
            ),
        )?;
    let path = Path::from("all_spaces");
    create_link(path.path_entry_hash()?, space_hash.clone(), LinkTypes::AllSpaces, ())?;
    Ok(record)
}
#[hdk_extern]
pub fn get_space(original_space_hash: ActionHash) -> ExternResult<Option<Record>> {
    let links = get_links(original_space_hash.clone(), LinkTypes::SpaceUpdates, None)?;
    let latest_link = links
        .into_iter()
        .max_by(|link_a, link_b| link_a.timestamp.cmp(&link_b.timestamp));
    let latest_space_hash = match latest_link {
        Some(link) => ActionHash::from(link.target.clone()),
        None => original_space_hash.clone(),
    };
    get(latest_space_hash, GetOptions::default())
}
#[derive(Serialize, Deserialize, Debug)]
pub struct UpdateSpaceInput {
    pub original_space_hash: ActionHash,
    pub previous_space_hash: ActionHash,
    pub updated_space: Space,
}
#[hdk_extern]
pub fn update_space(input: UpdateSpaceInput) -> ExternResult<Record> {
    let updated_space_hash = update_entry(
        input.previous_space_hash.clone(),
        &input.updated_space,
    )?;
    create_link(
        input.original_space_hash.clone(),
        updated_space_hash.clone(),
        LinkTypes::SpaceUpdates,
        (),
    )?;
    let record = get(updated_space_hash.clone(), GetOptions::default())?
        .ok_or(
            wasm_error!(
                WasmErrorInner::Guest(String::from("Could not find the newly updated Space"))
            ),
        )?;
    Ok(record)
}
#[hdk_extern]
pub fn delete_space(original_space_hash: ActionHash) -> ExternResult<ActionHash> {
    delete_entry(original_space_hash)
}
