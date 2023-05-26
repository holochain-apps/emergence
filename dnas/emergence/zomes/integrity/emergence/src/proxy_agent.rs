use hdi::prelude::*;
#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct ProxyAgent {
    pub nickname: String,
    pub bio: String,
    pub location: String,
    pub pic: Option<EntryHash>,
}
pub fn validate_create_proxy_agent(
    _action: EntryCreationAction,
    _proxy_agent: ProxyAgent,
) -> ExternResult<ValidateCallbackResult> {
    Ok(ValidateCallbackResult::Valid)
}
pub fn validate_update_proxy_agent(
    _action: Update,
    _proxy_agent: ProxyAgent,
    _original_action: EntryCreationAction,
    _original_proxy_agent: ProxyAgent,
) -> ExternResult<ValidateCallbackResult> {
    Ok(ValidateCallbackResult::Valid)
}
pub fn validate_delete_proxy_agent(
    _action: Delete,
    _original_action: EntryCreationAction,
    _original_proxy_agent: ProxyAgent,
) -> ExternResult<ValidateCallbackResult> {
    Ok(ValidateCallbackResult::Valid)
}
pub fn validate_create_link_proxy_agent_updates(
    _action: CreateLink,
    base_address: AnyLinkableHash,
    target_address: AnyLinkableHash,
    _tag: LinkTag,
) -> ExternResult<ValidateCallbackResult> {
    let action_hash = ActionHash::try_from(base_address).map_err(|err| wasm_error!(err))?;
    let record = must_get_valid_record(action_hash)?;
    let _proxy_agent: crate::ProxyAgent = record
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
    let _proxy_agent: crate::ProxyAgent = record
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
pub fn validate_delete_link_proxy_agent_updates(
    _action: DeleteLink,
    _original_action: CreateLink,
    _base: AnyLinkableHash,
    _target: AnyLinkableHash,
    _tag: LinkTag,
) -> ExternResult<ValidateCallbackResult> {
    Ok(
        ValidateCallbackResult::Invalid(
            String::from("ProxyAgentUpdates links cannot be deleted"),
        ),
    )
}
pub fn validate_create_link_all_proxy_agents(
    _action: CreateLink,
    _base_address: AnyLinkableHash,
    target_address: AnyLinkableHash,
    _tag: LinkTag,
) -> ExternResult<ValidateCallbackResult> {
    // Check the entry type for the given action hash
    let action_hash = ActionHash::try_from(target_address).map_err(|err| wasm_error!(err))?;
    let record = must_get_valid_record(action_hash)?;
    let _space: crate::ProxyAgent = record
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
pub fn validate_delete_link_all_proxy_agents(
    _action: DeleteLink,
    _original_action: CreateLink,
    _base: AnyLinkableHash,
    _target: AnyLinkableHash,
    _tag: LinkTag,
) -> ExternResult<ValidateCallbackResult> {
    Ok(
        ValidateCallbackResult::Invalid(
            String::from("AllProxyAgents links cannot be deleted"),
        ),
    )
}
