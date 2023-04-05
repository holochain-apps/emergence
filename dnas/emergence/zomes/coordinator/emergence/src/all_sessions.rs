use hdk::prelude::*;
use emergence_integrity::*;
#[hdk_extern]
pub fn get_all_sessions(_: ()) -> ExternResult<Vec<Record>> {
    let path = Path::from("all_sessions");
    let links = get_links(path.path_entry_hash()?, LinkTypes::AllSessions, None)?;
    let get_input: Vec<GetInput> = links
        .into_iter()
        .map(|link| GetInput::new(
            ActionHash::from(link.target).into(),
            GetOptions::default(),
        ))
        .collect();
    let records = HDK.with(|hdk| hdk.borrow().get(get_input))?;
    let records: Vec<Record> = records.into_iter().filter_map(|r| r).collect();
    Ok(records)
}
