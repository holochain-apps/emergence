use hdi::prelude::*;

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub struct SessionType {
    pub name: String,
    pub color: String,
    pub can_rsvp: bool,
    pub can_any_time: bool,
    pub can_leaderless: bool,
    #[serde(default)]
    pub deleted: bool,
    #[serde(default)]
    pub order: u8,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub struct Amenity {
    pub name: String,
    #[serde(default)]
    pub deleted: bool,
    #[serde(default)]
    pub order: u8,
}

#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct Settings {
    pub game_active: bool,
    pub current_sitemap: Option<ActionHash>,
    pub session_types: Vec<SessionType>,
    #[serde(default)]
    pub amenities: Vec<Amenity>,
}

pub fn validate_create_settings(
    _action: EntryCreationAction,
    _settings: Settings,
) -> ExternResult<ValidateCallbackResult> {
    Ok(ValidateCallbackResult::Valid)
}
pub fn validate_update_settings(
    _action: Update,
    _settings: Settings,
) -> ExternResult<ValidateCallbackResult> {
    Ok(ValidateCallbackResult::Valid)
}
pub fn validate_delete_settings(
    _action: Delete,
    _original_action: EntryCreationAction,
    _original_settings: Settings,
) -> ExternResult<ValidateCallbackResult> {
    Ok(ValidateCallbackResult::Invalid("Settings cannot be deleted".to_string()))
}

pub fn validate_create_link_settings(
    _action: CreateLink,
    _base_address: AnyLinkableHash,
    target_address: AnyLinkableHash,
    _tag: LinkTag,
) -> ExternResult<ValidateCallbackResult> {
    let action_hash = ActionHash::try_from(target_address).map_err(|err| wasm_error!(err))?;
    let record = must_get_valid_record(action_hash)?;
    let _settings: crate::Settings = record
        .entry()
        .to_app_option()
        .map_err(|e| wasm_error!(e))?
        .ok_or(wasm_error!(WasmErrorInner::Guest(
            "Settings link must reference a Settings entry".to_string()
        )))?;
    Ok(ValidateCallbackResult::Valid)
}
pub fn validate_delete_link_settings(
    _action: DeleteLink,
    _original_action: CreateLink,
    _base: AnyLinkableHash,
    _target: AnyLinkableHash,
    _tag: LinkTag,
) -> ExternResult<ValidateCallbackResult> {
    Ok(
        ValidateCallbackResult::Invalid("Settings links cannot be deleted"
        .to_string()),
    )
}