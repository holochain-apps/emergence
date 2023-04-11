use hdk::prelude::*;
use emergence_integrity::*;
#[hdk_extern]
pub fn create_note(note: Note) -> ExternResult<Record> {
    let note_hash = create_entry(&EntryTypes::Note(note.clone()))?;
    let record = get(note_hash.clone(), GetOptions::default())?
        .ok_or(
            wasm_error!(
                WasmErrorInner::Guest(String::from("Could not find the newly created Note"))
            ),
        )?;
    // let path = Path::from("all_notes");
    // create_link(path.path_entry_hash()?, note_hash.clone(), LinkTypes::AllNotes, ())?;
    Ok(record)
}
#[hdk_extern]
pub fn get_note(original_note_hash: ActionHash) -> ExternResult<Option<Record>> {
    let links = get_links(original_note_hash.clone(), LinkTypes::NoteUpdates, None)?;
    let latest_link = links
        .into_iter()
        .max_by(|link_a, link_b| link_a.timestamp.cmp(&link_b.timestamp));
    let latest_note_hash = match latest_link {
        Some(link) => ActionHash::from(link.target.clone()),
        None => original_note_hash.clone(),
    };
    get(latest_note_hash, GetOptions::default())
}
#[derive(Serialize, Deserialize, Debug)]
pub struct UpdateNoteInput {
    pub original_note_hash: ActionHash,
    pub previous_note_hash: ActionHash,
    pub updated_note: Note,
}
#[hdk_extern]
pub fn update_note(input: UpdateNoteInput) -> ExternResult<Record> {
    let updated_note_hash = update_entry(
        input.previous_note_hash.clone(),
        &input.updated_note,
    )?;
    create_link(
        input.original_note_hash.clone(),
        updated_note_hash.clone(),
        LinkTypes::NoteUpdates,
        (),
    )?;
    let record = get(updated_note_hash.clone(), GetOptions::default())?
        .ok_or(
            wasm_error!(
                WasmErrorInner::Guest(String::from("Could not find the newly updated Note"))
            ),
        )?;
    Ok(record)
}
#[hdk_extern]
pub fn delete_note(original_note_hash: ActionHash) -> ExternResult<ActionHash> {
    delete_entry(original_note_hash)
}
