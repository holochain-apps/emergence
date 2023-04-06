use hdi::prelude::*;
use std::fmt;

#[derive(Serialize, Deserialize, Debug, SerializedBytes, Clone)]
pub struct TimeWindow {
    start: Timestamp,
    length: u32,
}
impl fmt::Display for TimeWindow {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}/{}", self.start, self.length)
    }
}

pub fn validate_create_link_time_windows(
    _action: CreateLink,
    _base_address: AnyLinkableHash,
    _target_address: AnyLinkableHash,
    tag: LinkTag,
) -> ExternResult<ValidateCallbackResult> {
    convert_time_window_tag(tag)?;
    Ok(ValidateCallbackResult::Valid)
}
pub fn validate_delete_link_time_windows(
    _action: DeleteLink,
    _original_action: CreateLink,
    _base: AnyLinkableHash,
    _target: AnyLinkableHash,
    _tag: LinkTag,
) -> ExternResult<ValidateCallbackResult> {
    Ok(
        ValidateCallbackResult::Invalid(
            String::from("TimeWindows links cannot be deleted"),
        ),
    )
}

pub fn convert_time_window_tag(tag: LinkTag) -> ExternResult<TimeWindow> {
    let time_window= TimeWindow::try_from(SerializedBytes::from(UnsafeBytes::from(tag.into_inner())))
        .map_err(|_e| wasm_error!(WasmErrorInner::Guest(String::from("could not convert tag into time_window"))))?;
    Ok(time_window)
}