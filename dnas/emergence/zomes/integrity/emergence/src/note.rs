use hdi::prelude::*;
#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct Note {
    pub text: String,
    pub session: ActionHash,
    pub tags: Vec<String>,
    pub pic: Option<EntryHash>,
    pub trashed: bool,
}
pub fn validate_create_note(
    _action: TypedAction<EntryCreationData>,
    _note: Note,
) -> ExternResult<ValidateCallbackResult> {
    Ok(ValidateCallbackResult::Valid)
}
pub fn validate_update_note(
    _action: TypedAction<UpdateData>,
    _note: Note,
) -> ExternResult<ValidateCallbackResult> {
    Ok(ValidateCallbackResult::Valid)
}
pub fn validate_delete_note(
    _action: TypedAction<DeleteData>,
    _original_action: TypedAction<EntryCreationData>,
    _original_note: Note,
) -> ExternResult<ValidateCallbackResult> {
    Ok(ValidateCallbackResult::Valid)
}
pub fn validate_create_link_note_updates(
    _action: TypedAction<CreateLinkData>,
    base_address: AnyLinkableHash,
    target_address: AnyLinkableHash,
    _tag: LinkTag,
) -> ExternResult<ValidateCallbackResult> {
    let action_hash = ActionHash::try_from(base_address).map_err(|err| wasm_error!(err))?;
    let record = must_get_valid_record(action_hash)?;
    let _note: crate::Note = record
        .entry()
        .to_app_option()
        .map_err(|e| wasm_error!(e))?
        .ok_or(
            wasm_error!(
                WasmErrorInner::Guest(String::from("Linked action must reference an entry"))
            ),
        )?;
    let action_hash = ActionHash::try_from(target_address).map_err(|err| wasm_error!(err))?;
    let record = must_get_valid_record(action_hash)?;
    let _note: crate::Note = record
        .entry()
        .to_app_option()
        .map_err(|e| wasm_error!(e))?
        .ok_or(
            wasm_error!(
                WasmErrorInner::Guest(String::from("Linked action must reference an entry"))
            ),
        )?;
    Ok(ValidateCallbackResult::Valid)
}
pub fn validate_delete_link_note_updates(
    _action: TypedAction<DeleteLinkData>,
    _original_action: TypedAction<CreateLinkData>,
    _base: AnyLinkableHash,
    _target: AnyLinkableHash,
    _tag: LinkTag,
) -> ExternResult<ValidateCallbackResult> {
    Ok(
        ValidateCallbackResult::Invalid(
            String::from("NoteUpdates links cannot be deleted"),
        ),
    )
}
pub fn validate_create_link_all_notes(
    _action: TypedAction<CreateLinkData>,
    _base_address: AnyLinkableHash,
    target_address: AnyLinkableHash,
    _tag: LinkTag,
) -> ExternResult<ValidateCallbackResult> {
    // Check the entry type for the given action hash
    let action_hash = ActionHash::try_from(target_address).map_err(|err| wasm_error!(err))?;
    let record = must_get_valid_record(action_hash)?;
    let _note: crate::Note = record
        .entry()
        .to_app_option()
        .map_err(|e| wasm_error!(e))?
        .ok_or(
            wasm_error!(
                WasmErrorInner::Guest(String::from("Linked action must reference an entry"))
            ),
        )?;
    // TODO: add the appropriate validation rules
    Ok(ValidateCallbackResult::Valid)
}
// pub fn validate_delete_link_all_notes(
//     _action: DeleteLink,
//     _original_action: CreateLink,
//     _base: AnyLinkableHash,
//     _target: AnyLinkableHash,
//     _tag: LinkTag,
// ) -> ExternResult<ValidateCallbackResult> {
//     Ok(
//         ValidateCallbackResult::Invalid(
//             String::from("AllNotes links cannot be deleted"),
//         ),
//     )
// }
