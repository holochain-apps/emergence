use hdk::prelude::*;
use emergence_integrity::*;
#[hdk_extern]
pub fn create_session(session: Session) -> ExternResult<Record> {
    let session_hash = create_entry(&EntryTypes::Session(session.clone()))?;
    let record = get(session_hash.clone(), GetOptions::default())?
        .ok_or(
            wasm_error!(
                WasmErrorInner::Guest(String::from("Could not find the newly created Session"))
            ),
        )?;
    let path = Path::from("all_sessions");
    create_link(
        path.path_entry_hash()?,
        session_hash.clone(),
        LinkTypes::AllSessions,
        (),
    )?;
    Ok(record)
}
#[hdk_extern]
pub fn get_session(original_session_hash: ActionHash) -> ExternResult<Option<Record>> {
    let links = get_links(
        original_session_hash.clone(),
        LinkTypes::SessionUpdates,
        None,
    )?;
    let latest_link = links
        .into_iter()
        .max_by(|link_a, link_b| link_a.timestamp.cmp(&link_b.timestamp));
    let latest_session_hash = match latest_link {
        Some(link) => ActionHash::try_from(link.target.clone()).map_err(|err| wasm_error!(err))?,
        None => original_session_hash.clone(),
    };
    get(latest_session_hash, GetOptions::default())
}
#[derive(Serialize, Deserialize, Debug)]
pub struct UpdateSessionInput {
    pub original_session_hash: ActionHash,
    pub previous_session_hash: ActionHash,
    pub updated_type: u32,
    pub updated_title: String,
    pub updated_description: String,
    pub updated_leaders: Vec<AnyAgent>,
    pub updated_amenities: u32,
    pub updated_smallest: u32,
    pub updated_largest: u32,
    pub updated_duration: u32,
    pub updated_trashed: bool,
}
#[hdk_extern]
pub fn update_session(input: UpdateSessionInput) -> ExternResult<Record> {
    let record = get_session(input.original_session_hash.clone())?
        .ok_or(
            wasm_error!(
                WasmErrorInner::Guest(String::from("Could not find the original Session"))
            ),
        )?;
    let session = Session::try_from(record)?;
    let updated_session_hash = update_entry(
        input.previous_session_hash.clone(),
        &Session {
            key: session.key,
            session_type: input.updated_type,
            title: input.updated_title,
            description: input.updated_description,
            leaders: input.updated_leaders,
            amenities: input.updated_amenities,
            smallest: input.updated_smallest,
            largest: input.updated_largest,
            duration: input.updated_duration,
            trashed: input.updated_trashed,
        },
    )?;
    create_link(
        input.original_session_hash.clone(),
        updated_session_hash.clone(),
        LinkTypes::SessionUpdates,
        (),
    )?;
    let record = get(updated_session_hash.clone(), GetOptions::default())?
        .ok_or(
            wasm_error!(
                WasmErrorInner::Guest(String::from("Could not find the newly updated Session"))
            ),
        )?;
    Ok(record)
}
#[hdk_extern]
pub fn delete_session(original_session_hash: ActionHash) -> ExternResult<ActionHash> {
    delete_entry(original_session_hash)
}
