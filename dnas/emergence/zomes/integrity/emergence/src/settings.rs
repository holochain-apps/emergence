use hdi::prelude::*;

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub struct SessionType {
    pub name: String,
    pub color: String,
    pub can_rsvp: bool,
    pub can_slot: bool,  
}

#[derive(Serialize, Deserialize, Debug, SerializedBytes, Clone, PartialEq)]
pub struct Settings {
    pub game_active: bool,
    pub current_sitemap: Option<ActionHash>,
    pub session_types: Vec<SessionType>
}

pub fn validate_create_link_settings(
    _action: CreateLink,
    _base_address: AnyLinkableHash,
    _target_address: AnyLinkableHash,
    tag: LinkTag,
) -> ExternResult<ValidateCallbackResult> {
    convert_settings_tag(tag)?;
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
        ValidateCallbackResult::Invalid("Settings cannot be deleted"
        .to_string()),
    )
}

pub fn convert_settings_tag(tag: LinkTag) -> ExternResult<Settings> {
    let time_window= Settings::try_from(SerializedBytes::from(UnsafeBytes::from(tag.into_inner())))
        .map_err(|_e| wasm_error!(WasmErrorInner::Guest(String::from("could not convert tag into settings"))))?;
    Ok(time_window)
}