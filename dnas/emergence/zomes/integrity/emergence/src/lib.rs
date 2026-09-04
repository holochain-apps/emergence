pub mod space;
pub use space::*;
pub mod note;
pub use note::*;
pub mod session;
pub use session::*;
pub mod time_window;
pub use time_window::*;
pub mod proxy_agent;
pub use proxy_agent::*;
pub mod settings;
pub use settings::*;
pub mod map;
pub use map::*;
use hdi::prelude::*;
pub mod relation;
pub use relation::*;
#[derive(Serialize, Deserialize)]
#[serde(tag = "type")]
#[hdk_entry_types]
#[unit_enum(UnitEntryTypes)]
pub enum EntryTypes {
    Session(Session),
    Space(Space),
    Note(Note),
    Map(Map),
    ProxyAgent(ProxyAgent),
    Settings(Settings),
}
#[derive(Serialize, Deserialize)]
#[hdk_link_types]
pub enum LinkTypes {
    TimeWindows,
    Settings,
    Relations,
    SessionUpdates,
    AllSessions,
    SpaceUpdates,
    NoteUpdates,
    MapUpdates,
    ProxyAgentUpdates,
    AllSpaces,
    AllMaps,
    AllProxyAgents,
}
#[hdk_extern]
pub fn genesis_self_check(
    _data: GenesisSelfCheckData,
) -> ExternResult<ValidateCallbackResult> {
    Ok(ValidateCallbackResult::Valid)
}
pub fn validate_agent_joining(
    _agent_pub_key: AgentPubKey,
    _membrane_proof: &Option<MembraneProof>,
) -> ExternResult<ValidateCallbackResult> {
    Ok(ValidateCallbackResult::Valid)
}

/// Dispatches every link type to its per-type validator.
///
/// 0.7 merged the create-link ops of both authorities onto the same
/// `TypedAction<CreateLinkData>` shape, so both call sites share this helper. Base,
/// target and tag are cloned out of `action.data` before the action is handed on,
/// because the per-type validators take the action by value.
fn dispatch_create_link(
    link_type: LinkTypes,
    action: TypedAction<CreateLinkData>,
) -> ExternResult<ValidateCallbackResult> {
    let base_address = action.data.base_address.clone();
    let target_address = action.data.target_address.clone();
    let tag = action.data.tag.clone();
    match link_type {
        LinkTypes::Relations => {
            validate_create_link_relations(action, base_address, target_address, tag)
        }
        LinkTypes::TimeWindows => {
            validate_create_link_time_windows(action, base_address, target_address, tag)
        }
        LinkTypes::Settings => {
            validate_create_link_settings(action, base_address, target_address, tag)
        }
        LinkTypes::NoteUpdates => {
            validate_create_link_note_updates(action, base_address, target_address, tag)
        }
        LinkTypes::MapUpdates => {
            validate_create_link_map_updates(action, base_address, target_address, tag)
        }
        LinkTypes::ProxyAgentUpdates => {
            validate_create_link_proxy_agent_updates(action, base_address, target_address, tag)
        }
        LinkTypes::SessionUpdates => {
            validate_create_link_session_updates(action, base_address, target_address, tag)
        }
        LinkTypes::AllSessions => {
            validate_create_link_all_sessions(action, base_address, target_address, tag)
        }
        LinkTypes::SpaceUpdates => {
            validate_create_link_space_updates(action, base_address, target_address, tag)
        }
        LinkTypes::AllSpaces => {
            validate_create_link_all_spaces(action, base_address, target_address, tag)
        }
        LinkTypes::AllMaps => {
            validate_create_link_all_maps(action, base_address, target_address, tag)
        }
        LinkTypes::AllProxyAgents => {
            validate_create_link_all_proxy_agents(action, base_address, target_address, tag)
        }
    }
}

/// Dispatches every link type to its per-type delete-link validator.
///
/// The deleted link's base comes off the DeleteLink action; its target and tag come off
/// the original CreateLink action, which is where 0.7 keeps them.
fn dispatch_delete_link(
    link_type: LinkTypes,
    action: TypedAction<DeleteLinkData>,
    original_action: TypedAction<CreateLinkData>,
) -> ExternResult<ValidateCallbackResult> {
    let base_address = action.data.base_address.clone();
    let target_address = original_action.data.target_address.clone();
    let tag = original_action.data.tag.clone();
    match link_type {
        LinkTypes::Relations => validate_delete_link_relations(
            action,
            original_action,
            base_address,
            target_address,
            tag,
        ),
        LinkTypes::TimeWindows => validate_delete_link_time_windows(
            action,
            original_action,
            base_address,
            target_address,
            tag,
        ),
        LinkTypes::Settings => validate_delete_link_settings(
            action,
            original_action,
            base_address,
            target_address,
            tag,
        ),
        LinkTypes::NoteUpdates => validate_delete_link_note_updates(
            action,
            original_action,
            base_address,
            target_address,
            tag,
        ),
        LinkTypes::MapUpdates => validate_delete_link_map_updates(
            action,
            original_action,
            base_address,
            target_address,
            tag,
        ),
        LinkTypes::ProxyAgentUpdates => validate_delete_link_proxy_agent_updates(
            action,
            original_action,
            base_address,
            target_address,
            tag,
        ),
        LinkTypes::SessionUpdates => validate_delete_link_session_updates(
            action,
            original_action,
            base_address,
            target_address,
            tag,
        ),
        LinkTypes::AllSessions => validate_delete_link_all_sessions(
            action,
            original_action,
            base_address,
            target_address,
            tag,
        ),
        LinkTypes::SpaceUpdates => validate_delete_link_space_updates(
            action,
            original_action,
            base_address,
            target_address,
            tag,
        ),
        LinkTypes::AllSpaces => validate_delete_link_all_spaces(
            action,
            original_action,
            base_address,
            target_address,
            tag,
        ),
        LinkTypes::AllMaps => validate_delete_link_all_maps(
            action,
            original_action,
            base_address,
            target_address,
            tag,
        ),
        LinkTypes::AllProxyAgents => validate_delete_link_all_proxy_agents(
            action,
            original_action,
            base_address,
            target_address,
            tag,
        ),
    }
}

/// Takes the entry by reference: `EntryTypes` is not `Clone`, and the record-authority
/// update path needs the entry again for the update validator afterwards.
fn dispatch_create_entry(
    app_entry: &EntryTypes,
    action: TypedAction<EntryCreationData>,
) -> ExternResult<ValidateCallbackResult> {
    match app_entry {
        EntryTypes::Session(session) => validate_create_session(action, session.clone()),
        EntryTypes::Space(space) => validate_create_space(action, space.clone()),
        EntryTypes::Note(note) => validate_create_note(action, note.clone()),
        EntryTypes::Map(map) => validate_create_map(action, map.clone()),
        EntryTypes::ProxyAgent(proxy_agent) => {
            validate_create_proxy_agent(action, proxy_agent.clone())
        }
        EntryTypes::Settings(settings) => validate_create_settings(action, settings.clone()),
    }
}

fn dispatch_update_entry(
    app_entry: EntryTypes,
    action: TypedAction<UpdateData>,
) -> ExternResult<ValidateCallbackResult> {
    match app_entry {
        EntryTypes::Space(space) => validate_update_space(action, space),
        EntryTypes::Session(session) => validate_update_session(action, session),
        EntryTypes::Note(note) => validate_update_note(action, note),
        EntryTypes::Map(map) => validate_update_map(action, map),
        EntryTypes::ProxyAgent(proxy_agent) => validate_update_proxy_agent(action, proxy_agent),
        EntryTypes::Settings(settings) => validate_update_settings(action, settings),
    }
}

#[hdk_extern]
pub fn validate(op: Op) -> ExternResult<ValidateCallbackResult> {
    match op.flattened::<EntryTypes, LinkTypes>()? {
        // 0.7 renamed the entry-authority op to CreateEntry.
        FlatOp::CreateEntry(store_entry) => match store_entry {
            OpEntry::CreateEntry { app_entry, action } => {
                dispatch_create_entry(&app_entry, action.into())
            }
            OpEntry::UpdateEntry { app_entry, action } => {
                dispatch_create_entry(&app_entry, action.into())
            }
            _ => Ok(ValidateCallbackResult::Valid),
        },
        // 0.7 renamed the update op and made it a tuple variant.
        FlatOp::Update(update_entry) => match update_entry {
            OpUpdate::Entry { app_entry, action } => dispatch_update_entry(app_entry, action),
            _ => Ok(ValidateCallbackResult::Valid),
        },
        // 0.7 renamed the delete op and made it a tuple variant.
        FlatOp::Delete(_) => Ok(ValidateCallbackResult::Valid),
        // 0.7 merged the two link ops into FlatOp::Link(OpLink::…).
        FlatOp::Link(op_link) => match op_link {
            OpLink::CreateLink { link_type, action } => dispatch_create_link(link_type, action),
            OpLink::DeleteLink {
                original_action,
                link_type,
                action,
            } => dispatch_delete_link(link_type, action, original_action),
        },
        // 0.7 renamed the record-authority op to CreateRecord.
        FlatOp::CreateRecord(store_record) => {
            match store_record {
                OpRecord::CreateEntry { app_entry, action } => {
                    dispatch_create_entry(&app_entry, action.into())
                }
                // 0.7: the variant no longer carries original_action_hash; it is
                // action.data.original_action_address.
                OpRecord::UpdateEntry { app_entry, action } => {
                    let original_record =
                        must_get_valid_record(action.data.original_action_address.clone())?;
                    if !matches!(
                        original_record.action().data,
                        ActionData::Create(_) | ActionData::Update(_)
                    ) {
                        return Ok(ValidateCallbackResult::Invalid(
                            "Original action for an update must be a Create or Update action"
                                .to_string(),
                        ));
                    }
                    match app_entry {
                        EntryTypes::Settings(settings) => validate_update_settings(action, settings),
                        app_entry => {
                            let result =
                                dispatch_create_entry(&app_entry, action.clone().into())?;
                            if let ValidateCallbackResult::Valid = result {
                                // The original record must still deserialize as the same
                                // entry type; `to_app_option` returning None means it did
                                // not.
                                let original_entry_is_same_type = match &app_entry {
                                    EntryTypes::Session(_) => original_record
                                        .entry()
                                        .to_app_option::<Session>()
                                        .map_err(|e| wasm_error!(e))?
                                        .is_some(),
                                    EntryTypes::Space(_) => original_record
                                        .entry()
                                        .to_app_option::<Space>()
                                        .map_err(|e| wasm_error!(e))?
                                        .is_some(),
                                    EntryTypes::Note(_) => original_record
                                        .entry()
                                        .to_app_option::<Note>()
                                        .map_err(|e| wasm_error!(e))?
                                        .is_some(),
                                    EntryTypes::Map(_) => original_record
                                        .entry()
                                        .to_app_option::<Map>()
                                        .map_err(|e| wasm_error!(e))?
                                        .is_some(),
                                    EntryTypes::ProxyAgent(_) => original_record
                                        .entry()
                                        .to_app_option::<ProxyAgent>()
                                        .map_err(|e| wasm_error!(e))?
                                        .is_some(),
                                    EntryTypes::Settings(_) => true,
                                };
                                if !original_entry_is_same_type {
                                    return Ok(ValidateCallbackResult::Invalid(
                                        "The updated entry type must be the same as the original entry type"
                                            .to_string(),
                                    ));
                                }
                                dispatch_update_entry(app_entry, action)
                            } else {
                                Ok(result)
                            }
                        }
                    }
                }
                // 0.7: the variant no longer carries original_action_hash; it is
                // action.data.deletes_address.
                OpRecord::DeleteEntry { action } => {
                    let original_record =
                        must_get_valid_record(action.data.deletes_address.clone())?;
                    let original_action = match TypedAction::<EntryCreationData>::try_from(
                        original_record.action().clone(),
                    ) {
                        Ok(original_action) => original_action,
                        Err(_) => {
                            return Ok(ValidateCallbackResult::Invalid(
                                "Original action for a delete must be a Create or Update action"
                                    .to_string(),
                            ));
                        }
                    };
                    let app_entry_type = match original_action.entry_type() {
                        EntryType::App(app_entry_type) => app_entry_type.clone(),
                        _ => {
                            return Ok(ValidateCallbackResult::Valid);
                        }
                    };
                    let entry = match original_record.entry().as_option() {
                        Some(entry) => entry,
                        None => {
                            // 0.7: visibility is read off the AppEntryDef, not through
                            // EntryType::visibility().
                            if app_entry_type.visibility.is_public() {
                                return Ok(ValidateCallbackResult::Invalid(
                                    "Original record for a delete of a public entry must contain an entry"
                                        .to_string(),
                                ));
                            } else {
                                return Ok(ValidateCallbackResult::Valid);
                            }
                        }
                    };
                    let original_app_entry = match EntryTypes::deserialize_from_type(
                        app_entry_type.zome_index,
                        app_entry_type.entry_index,
                        entry,
                    )? {
                        Some(app_entry) => app_entry,
                        None => {
                            return Ok(ValidateCallbackResult::Invalid(
                                "Original app entry must be one of the defined entry types for this zome"
                                    .to_string(),
                            ));
                        }
                    };
                    match original_app_entry {
                        EntryTypes::Session(original_session) => {
                            validate_delete_session(action, original_action, original_session)
                        }
                        EntryTypes::Space(original_space) => {
                            validate_delete_space(action, original_action, original_space)
                        }
                        EntryTypes::Note(original_note) => {
                            validate_delete_note(action, original_action, original_note)
                        }
                        EntryTypes::Map(original_map) => {
                            validate_delete_map(action, original_action, original_map)
                        }
                        EntryTypes::ProxyAgent(original_proxy_agent) => validate_delete_proxy_agent(
                            action,
                            original_action,
                            original_proxy_agent,
                        ),
                        EntryTypes::Settings(original_settings) => {
                            validate_delete_settings(action, original_action, original_settings)
                        }
                    }
                }
                OpRecord::CreateLink { link_type, action } => {
                    dispatch_create_link(link_type, action)
                }
                // 0.7: the variant carries only the action; the deleted link's address is
                // action.data.link_add_address and its base is action.data.base_address.
                OpRecord::DeleteLink { action } => {
                    let record = must_get_valid_record(action.data.link_add_address.clone())?;
                    let original_action = match TypedAction::<CreateLinkData>::try_from(
                        record.action().clone(),
                    ) {
                        Ok(original_action) => original_action,
                        Err(_) => {
                            return Ok(ValidateCallbackResult::Invalid(
                                "The action that a DeleteLink deletes must be a CreateLink"
                                    .to_string(),
                            ));
                        }
                    };
                    let link_type = match LinkTypes::from_type(
                        original_action.data.zome_index,
                        original_action.data.link_type,
                    )? {
                        Some(lt) => lt,
                        None => {
                            return Ok(ValidateCallbackResult::Valid);
                        }
                    };
                    dispatch_delete_link(link_type, action, original_action)
                }
                OpRecord::CreatePrivateEntry { .. } => Ok(ValidateCallbackResult::Valid),
                OpRecord::UpdatePrivateEntry { .. } => Ok(ValidateCallbackResult::Valid),
                OpRecord::CreateCapClaim { .. } => Ok(ValidateCallbackResult::Valid),
                OpRecord::CreateCapGrant { .. } => Ok(ValidateCallbackResult::Valid),
                OpRecord::UpdateCapClaim { .. } => Ok(ValidateCallbackResult::Valid),
                OpRecord::UpdateCapGrant { .. } => Ok(ValidateCallbackResult::Valid),
                OpRecord::Dna { .. } => Ok(ValidateCallbackResult::Valid),
                OpRecord::OpenChain { .. } => Ok(ValidateCallbackResult::Valid),
                OpRecord::CloseChain { .. } => Ok(ValidateCallbackResult::Valid),
                OpRecord::InitZomesComplete { .. } => Ok(ValidateCallbackResult::Valid),
                _ => Ok(ValidateCallbackResult::Valid),
            }
        }
        // 0.7 renamed the chain-authority op and made it a tuple variant.
        FlatOp::AgentActivity(agent_activity) => match agent_activity {
            OpActivity::CreateAgent { agent, action } => {
                // 0.7: prev_action is a method returning Option (0.6 had an infallible
                // field), so the genesis case has to be handled explicitly.
                let prev_action_hash = action.prev_action().cloned().ok_or(wasm_error!(
                    WasmErrorInner::Guest(
                        "CreateAgent action must have a previous action".to_string()
                    )
                ))?;
                let previous_action = must_get_action(prev_action_hash)?;
                match &previous_action.action().data {
                    ActionData::AgentValidationPkg(AgentValidationPkgData { membrane_proof }) => {
                        validate_agent_joining(agent, membrane_proof)
                    }
                    _ => Ok(ValidateCallbackResult::Invalid(
                        "The previous action for a `CreateAgent` action must be an `AgentValidationPkg`"
                            .to_string(),
                    )),
                }
            }
            _ => Ok(ValidateCallbackResult::Valid),
        },
    }
}
