use hdi::prelude::*;
use std::fmt;

#[derive(Serialize, Deserialize, Debug, SerializedBytes, Clone)]
pub struct Slot {
    start: Timestamp,
    length: u32,
}
impl fmt::Display for Slot {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}/{}", self.start, self.length)
    }
}

pub fn validate_create_link_slots(
    _action: CreateLink,
    _base_address: AnyLinkableHash,
    _target_address: AnyLinkableHash,
    tag: LinkTag,
) -> ExternResult<ValidateCallbackResult> {
    convert_slot_tag(tag)?;
    Ok(ValidateCallbackResult::Valid)
}
pub fn validate_delete_link_slots(
    _action: DeleteLink,
    _original_action: CreateLink,
    _base: AnyLinkableHash,
    _target: AnyLinkableHash,
    _tag: LinkTag,
) -> ExternResult<ValidateCallbackResult> {
    Ok(
        ValidateCallbackResult::Invalid(
            String::from("SessionUpdates links cannot be deleted"),
        ),
    )
}

pub fn convert_slot_tag(tag: LinkTag) -> ExternResult<Slot> {
    let slot= Slot::try_from(SerializedBytes::from(UnsafeBytes::from(tag.into_inner())))
        .map_err(|_e| wasm_error!(WasmErrorInner::Guest(String::from("could not convert tag into slot"))))?;
    Ok(slot)
}