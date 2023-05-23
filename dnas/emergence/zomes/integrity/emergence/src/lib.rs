pub mod space;
pub use space::*;
pub mod note;
pub use note::*;
pub mod session;
pub use session::*;
pub mod time_window;
pub use time_window::*;
pub mod settings;
pub use settings::*;
pub mod map;
pub use map::*;
use hdi::prelude::*;
pub mod relation;
pub use relation::*;
#[derive(Serialize, Deserialize)]
#[serde(tag = "type")]
#[hdk_entry_defs]
#[unit_enum(UnitEntryTypes)]
pub enum EntryTypes {
    Session(Session),
    Space(Space),
    Note(Note),
    Map(Map),
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
    AllSpaces,
    AllMaps,
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
#[hdk_extern]
pub fn validate(op: Op) -> ExternResult<ValidateCallbackResult> {
    match op.to_type::<EntryTypes, LinkTypes>()? {
        OpType::StoreEntry(store_entry) => {
            match store_entry {
                OpEntry::CreateEntry { app_entry, action } => {
                    match app_entry {
                        EntryTypes::Session(session) => {
                            validate_create_session(
                                EntryCreationAction::Create(action),
                                session,
                            )
                        }
                        EntryTypes::Space(space) => {
                            validate_create_space(
                                EntryCreationAction::Create(action),
                                space,
                            )
                        }
                        EntryTypes::Note(note) => {
                            validate_create_note(
                                EntryCreationAction::Create(action),
                                note,
                            )
                        }
                        EntryTypes::Map(map) => {
                            validate_create_map(
                                EntryCreationAction::Create(action),
                                map,
                            )
                        }
                    }
                }
                OpEntry::UpdateEntry { app_entry, action, .. } => {
                    match app_entry {
                        EntryTypes::Session(session) => {
                            validate_create_session(
                                EntryCreationAction::Update(action),
                                session,
                            )
                        }
                        EntryTypes::Space(space) => {
                            validate_create_space(
                                EntryCreationAction::Update(action),
                                space,
                            )
                        }
                        EntryTypes::Note(note) => {
                            validate_create_note(
                                EntryCreationAction::Update(action),
                                note,
                            )
                        }
                        EntryTypes::Map(map) => {
                            validate_create_map(
                                EntryCreationAction::Update(action),
                                map,
                            )
                        }
                    }
                }
                _ => Ok(ValidateCallbackResult::Valid),
            }
        }
        OpType::RegisterUpdate(update_entry) => {
            match update_entry {
                OpUpdate::Entry {
                    original_action,
                    original_app_entry,
                    app_entry,
                    action,
                } => {
                    match (app_entry, original_app_entry) {
                        (EntryTypes::Space(space), EntryTypes::Space(original_space)) => {
                            validate_update_space(
                                action,
                                space,
                                original_action,
                                original_space,
                            )
                        }
                        (
                            EntryTypes::Session(session),
                            EntryTypes::Session(original_session),
                        ) => {
                            validate_update_session(
                                action,
                                session,
                                original_action,
                                original_session,
                            )
                        }
                        (
                            EntryTypes::Note(session),
                            EntryTypes::Note(original_session),
                        ) => {
                            validate_update_note(
                                action,
                                session,
                                original_action,
                                original_session,
                            )
                        }
                        (
                            EntryTypes::Map(session),
                            EntryTypes::Map(original_session),
                        ) => {
                            validate_update_map(
                                action,
                                session,
                                original_action,
                                original_session,
                            )
                        }
                        _ => {
                            Ok(
                                ValidateCallbackResult::Invalid(
                                    "Original and updated entry types must be the same"
                                        .to_string(),
                                ),
                            )
                        }
                    }
                }
                _ => Ok(ValidateCallbackResult::Valid),
            }
        }
        OpType::RegisterDelete(delete_entry) => {
            match delete_entry {
                OpDelete::Entry { original_action, original_app_entry, action } => {
                    match original_app_entry {
                        EntryTypes::Session(session) => {
                            validate_delete_session(action, original_action, session)
                        }
                        EntryTypes::Space(space) => {
                            validate_delete_space(action, original_action, space)
                        }
                        EntryTypes::Note(note) => {
                            validate_delete_note(action, original_action, note)
                        }
                        EntryTypes::Map(map) => {
                            validate_delete_map(action, original_action, map)
                        }
                    }
                }
                _ => Ok(ValidateCallbackResult::Valid),
            }
        }
        OpType::RegisterCreateLink {
            link_type,
            base_address,
            target_address,
            tag,
            action,
        } => {
            match link_type {
                LinkTypes::Relations => {
                    validate_create_link_relations(
                        action,
                        base_address,
                        target_address,
                        tag,
                    )
                }
               LinkTypes::TimeWindows => {
                    validate_create_link_time_windows(
                        action,
                        base_address,
                        target_address,
                        tag,
                    )
                }
                LinkTypes::Settings => {
                    validate_create_link_settings(
                        action,
                        base_address,
                        target_address,
                        tag,
                    )
                }
                LinkTypes::NoteUpdates => {
                    validate_create_link_note_updates(
                        action,
                        base_address,
                        target_address,
                        tag,
                    )
                }
                LinkTypes::MapUpdates => {
                    validate_create_link_map_updates(
                        action,
                        base_address,
                        target_address,
                        tag,
                    )
                }
                LinkTypes::SessionUpdates => {
                    validate_create_link_session_updates(
                        action,
                        base_address,
                        target_address,
                        tag,
                    )
                }
                LinkTypes::AllSessions => {
                    validate_create_link_all_sessions(
                        action,
                        base_address,
                        target_address,
                        tag,
                    )
                }
                LinkTypes::SpaceUpdates => {
                    validate_create_link_space_updates(
                        action,
                        base_address,
                        target_address,
                        tag,
                    )
                }
                LinkTypes::AllSpaces => {
                    validate_create_link_all_spaces(
                        action,
                        base_address,
                        target_address,
                        tag,
                    )
                }
                LinkTypes::AllMaps => {
                    validate_create_link_all_maps(
                        action,
                        base_address,
                        target_address,
                        tag,
                    )
                }
            }
        }
        OpType::RegisterDeleteLink {
            link_type,
            base_address,
            target_address,
            tag,
            original_action,
            action,
        } => {
            match link_type {
                LinkTypes::Relations => {
                    validate_delete_link_relations(
                        action,
                        original_action,
                        base_address,
                        target_address,
                        tag,
                    )
                }
                LinkTypes::TimeWindows => {
                    validate_delete_link_time_windows(
                        action,
                        original_action,
                        base_address,
                        target_address,
                        tag,
                    )
                }
                LinkTypes::Settings => {
                    validate_delete_link_settings(
                        action,
                        original_action,
                        base_address,
                        target_address,
                        tag,
                    )
                }
                LinkTypes::NoteUpdates => {
                    validate_delete_link_note_updates(
                        action,
                        original_action,
                        base_address,
                        target_address,
                        tag,
                    )
                }
                LinkTypes::MapUpdates => {
                    validate_delete_link_map_updates(
                        action,
                        original_action,
                        base_address,
                        target_address,
                        tag,
                    )
                }
                LinkTypes::SessionUpdates => {
                    validate_delete_link_session_updates(
                        action,
                        original_action,
                        base_address,
                        target_address,
                        tag,
                    )
                }
                LinkTypes::AllSessions => {
                    validate_delete_link_all_sessions(
                        action,
                        original_action,
                        base_address,
                        target_address,
                        tag,
                    )
                }
                LinkTypes::SpaceUpdates => {
                    validate_delete_link_space_updates(
                        action,
                        original_action,
                        base_address,
                        target_address,
                        tag,
                    )
                }
                LinkTypes::AllSpaces => {
                    validate_delete_link_all_spaces(
                        action,
                        original_action,
                        base_address,
                        target_address,
                        tag,
                    )
                }
                LinkTypes::AllMaps => {
                    validate_delete_link_all_maps(
                        action,
                        original_action,
                        base_address,
                        target_address,
                        tag,
                    )
                }
            }
        }
        OpType::StoreRecord(store_record) => {
            match store_record {
                OpRecord::CreateEntry { app_entry, action } => {
                    match app_entry {
                        EntryTypes::Session(session) => {
                            validate_create_session(
                                EntryCreationAction::Create(action),
                                session,
                            )
                        }
                        EntryTypes::Space(space) => {
                            validate_create_space(
                                EntryCreationAction::Create(action),
                                space,
                            )
                        }
                        EntryTypes::Note(note) => {
                            validate_create_note(
                                EntryCreationAction::Create(action),
                                note,
                            )
                        }
                        EntryTypes::Map(map) => {
                            validate_create_map(
                                EntryCreationAction::Create(action),
                                map,
                            )
                        }
                    }
                }
                OpRecord::UpdateEntry {
                    original_action_hash,
                    app_entry,
                    action,
                    ..
                } => {
                    let original_record = must_get_valid_record(original_action_hash)?;
                    let original_action = original_record.action().clone();
                    let original_action = match original_action {
                        Action::Create(create) => EntryCreationAction::Create(create),
                        Action::Update(update) => EntryCreationAction::Update(update),
                        _ => {
                            return Ok(
                                ValidateCallbackResult::Invalid(
                                    "Original action for an update must be a Create or Update action"
                                        .to_string(),
                                ),
                            );
                        }
                    };
                    match app_entry {
                        EntryTypes::Session(session) => {
                            let result = validate_create_session(
                                EntryCreationAction::Update(action.clone()),
                                session.clone(),
                            )?;
                            if let ValidateCallbackResult::Valid = result {
                                let original_session: Option<Session> = original_record
                                    .entry()
                                    .to_app_option()
                                    .map_err(|e| wasm_error!(e))?;
                                let original_session = match original_session {
                                    Some(session) => session,
                                    None => {
                                        return Ok(
                                            ValidateCallbackResult::Invalid(
                                                "The updated entry type must be the same as the original entry type"
                                                    .to_string(),
                                            ),
                                        );
                                    }
                                };
                                validate_update_session(
                                    action,
                                    session,
                                    original_action,
                                    original_session,
                                )
                            } else {
                                Ok(result)
                            }
                        }
                        EntryTypes::Space(space) => {
                            let result = validate_create_space(
                                EntryCreationAction::Update(action.clone()),
                                space.clone(),
                            )?;
                            if let ValidateCallbackResult::Valid = result {
                                let original_space: Option<Space> = original_record
                                    .entry()
                                    .to_app_option()
                                    .map_err(|e| wasm_error!(e))?;
                                let original_space = match original_space {
                                    Some(space) => space,
                                    None => {
                                        return Ok(
                                            ValidateCallbackResult::Invalid(
                                                "The updated entry type must be the same as the original entry type"
                                                    .to_string(),
                                            ),
                                        );
                                    }
                                };
                                validate_update_space(
                                    action,
                                    space,
                                    original_action,
                                    original_space,
                                )
                            } else {
                                Ok(result)
                            }
                        }
                        EntryTypes::Note(note) => {
                            let result = validate_create_note(
                                EntryCreationAction::Update(action.clone()),
                                note.clone(),
                            )?;
                            if let ValidateCallbackResult::Valid = result {
                                let original_note: Option<Note> = original_record
                                    .entry()
                                    .to_app_option()
                                    .map_err(|e| wasm_error!(e))?;
                                let original_note = match original_note {
                                    Some(note) => note,
                                    None => {
                                        return Ok(
                                            ValidateCallbackResult::Invalid(
                                                "The updated entry type must be the same as the original entry type"
                                                    .to_string(),
                                            ),
                                        );
                                    }
                                };
                                validate_update_note(
                                    action,
                                    note,
                                    original_action,
                                    original_note,
                                )
                            } else {
                                Ok(result)
                            }
                        }
                        EntryTypes::Map(map) => {
                            let result = validate_create_map(
                                EntryCreationAction::Update(action.clone()),
                                map.clone(),
                            )?;
                            if let ValidateCallbackResult::Valid = result {
                                let original_map: Option<Map> = original_record
                                    .entry()
                                    .to_app_option()
                                    .map_err(|e| wasm_error!(e))?;
                                let original_map = match original_map {
                                    Some(map) => map,
                                    None => {
                                        return Ok(
                                            ValidateCallbackResult::Invalid(
                                                "The updated entry type must be the same as the original entry type"
                                                    .to_string(),
                                            ),
                                        );
                                    }
                                };
                                validate_update_map(
                                    action,
                                    map,
                                    original_action,
                                    original_map,
                                )
                            } else {
                                Ok(result)
                            }
                        }
                    }
                }
                OpRecord::DeleteEntry { original_action_hash, action, .. } => {
                    let original_record = must_get_valid_record(original_action_hash)?;
                    let original_action = original_record.action().clone();
                    let original_action = match original_action {
                        Action::Create(create) => EntryCreationAction::Create(create),
                        Action::Update(update) => EntryCreationAction::Update(update),
                        _ => {
                            return Ok(
                                ValidateCallbackResult::Invalid(
                                    "Original action for a delete must be a Create or Update action"
                                        .to_string(),
                                ),
                            );
                        }
                    };
                    let app_entry_type = match original_action.entry_type() {
                        EntryType::App(app_entry_type) => app_entry_type,
                        _ => {
                            return Ok(ValidateCallbackResult::Valid);
                        }
                    };
                    let entry = match original_record.entry().as_option() {
                        Some(entry) => entry,
                        None => {
                            if original_action.entry_type().visibility().is_public() {
                                return Ok(
                                    ValidateCallbackResult::Invalid(
                                        "Original record for a delete of a public entry must contain an entry"
                                            .to_string(),
                                    ),
                                );
                            } else {
                                return Ok(ValidateCallbackResult::Valid);
                            }
                        }
                    };
                    let original_app_entry = match EntryTypes::deserialize_from_type(
                        app_entry_type.zome_index.clone(),
                        app_entry_type.entry_index.clone(),
                        &entry,
                    )? {
                        Some(app_entry) => app_entry,
                        None => {
                            return Ok(
                                ValidateCallbackResult::Invalid(
                                    "Original app entry must be one of the defined entry types for this zome"
                                        .to_string(),
                                ),
                            );
                        }
                    };
                    match original_app_entry {
                        EntryTypes::Session(original_session) => {
                            validate_delete_session(
                                action,
                                original_action,
                                original_session,
                            )
                        }
                        EntryTypes::Space(original_space) => {
                            validate_delete_space(
                                action,
                                original_action,
                                original_space,
                            )
                        }
                        EntryTypes::Note(original_note) => {
                            validate_delete_note(
                                action,
                                original_action,
                                original_note,
                            )
                        }
                        EntryTypes::Map(original_map) => {
                            validate_delete_map(
                                action,
                                original_action,
                                original_map,
                            )
                        }
                    }
                }
                OpRecord::CreateLink {
                    base_address,
                    target_address,
                    tag,
                    link_type,
                    action,
                } => {
                    match link_type {
                        LinkTypes::Relations => {
                            validate_create_link_relations(
                                action,
                                base_address,
                                target_address,
                                tag,
                            )
                        }
                        LinkTypes::TimeWindows => {
                            validate_create_link_time_windows(
                                action,
                                base_address,
                                target_address,
                                tag,
                            )
                        }
                        LinkTypes::Settings => {
                            validate_create_link_settings(
                                action,
                                base_address,
                                target_address,
                                tag,
                            )
                        }
                        LinkTypes::NoteUpdates => {
                            validate_create_link_note_updates(
                                action,
                                base_address,
                                target_address,
                                tag,
                            )
                        }
                        LinkTypes::MapUpdates => {
                            validate_create_link_map_updates(
                                action,
                                base_address,
                                target_address,
                                tag,
                            )
                        }
                        LinkTypes::SessionUpdates => {
                            validate_create_link_session_updates(
                                action,
                                base_address,
                                target_address,
                                tag,
                            )
                        }
                        LinkTypes::AllSessions => {
                            validate_create_link_all_sessions(
                                action,
                                base_address,
                                target_address,
                                tag,
                            )
                        }
                        LinkTypes::SpaceUpdates => {
                            validate_create_link_space_updates(
                                action,
                                base_address,
                                target_address,
                                tag,
                            )
                        }
                        LinkTypes::AllSpaces => {
                            validate_create_link_all_spaces(
                                action,
                                base_address,
                                target_address,
                                tag,
                            )
                        }
                        LinkTypes::AllMaps => {
                            validate_create_link_all_maps(
                                action,
                                base_address,
                                target_address,
                                tag,
                            )
                        }
                    }
                }
                OpRecord::DeleteLink { original_action_hash, base_address, action } => {
                    let record = must_get_valid_record(original_action_hash)?;
                    let create_link = match record.action() {
                        Action::CreateLink(create_link) => create_link.clone(),
                        _ => {
                            return Ok(
                                ValidateCallbackResult::Invalid(
                                    "The action that a DeleteLink deletes must be a CreateLink"
                                        .to_string(),
                                ),
                            );
                        }
                    };
                    let link_type = match LinkTypes::from_type(
                        create_link.zome_index.clone(),
                        create_link.link_type.clone(),
                    )? {
                        Some(lt) => lt,
                        None => {
                            return Ok(ValidateCallbackResult::Valid);
                        }
                    };
                    match link_type {
                        LinkTypes::Relations => {
                            validate_delete_link_relations(
                                action,
                                create_link.clone(),
                                base_address,
                                create_link.target_address,
                                create_link.tag,
                            )
                        }
                        LinkTypes::TimeWindows => {
                            validate_delete_link_time_windows(
                                action,
                                create_link.clone(),
                                base_address,
                                create_link.target_address,
                                create_link.tag,
                            )
                        }
                        LinkTypes::Settings => {
                            validate_delete_link_settings(
                                action,
                                create_link.clone(),
                                base_address,
                                create_link.target_address,
                                create_link.tag,
                            )
                        }
                        LinkTypes::NoteUpdates => {
                            validate_delete_link_note_updates(
                                action,
                                create_link.clone(),
                                base_address,
                                create_link.target_address,
                                create_link.tag,
                            )
                        }
                        LinkTypes::MapUpdates => {
                            validate_delete_link_map_updates(
                                action,
                                create_link.clone(),
                                base_address,
                                create_link.target_address,
                                create_link.tag,
                            )
                        }
                        LinkTypes::SessionUpdates => {
                            validate_delete_link_session_updates(
                                action,
                                create_link.clone(),
                                base_address,
                                create_link.target_address,
                                create_link.tag,
                            )
                        }
                        LinkTypes::AllSessions => {
                            validate_delete_link_all_sessions(
                                action,
                                create_link.clone(),
                                base_address,
                                create_link.target_address,
                                create_link.tag,
                            )
                        }
                        LinkTypes::SpaceUpdates => {
                            validate_delete_link_space_updates(
                                action,
                                create_link.clone(),
                                base_address,
                                create_link.target_address,
                                create_link.tag,
                            )
                        }
                        LinkTypes::AllSpaces => {
                            validate_delete_link_all_spaces(
                                action,
                                create_link.clone(),
                                base_address,
                                create_link.target_address,
                                create_link.tag,
                            )
                        }
                        LinkTypes::AllMaps => {
                            validate_delete_link_all_maps(
                                action,
                                create_link.clone(),
                                base_address,
                                create_link.target_address,
                                create_link.tag,
                            )
                        }
                    }
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
        OpType::RegisterAgentActivity(agent_activity) => {
            match agent_activity {
                OpActivity::CreateAgent { agent, action } => {
                    let previous_action = must_get_action(action.prev_action)?;
                    match previous_action.action() {
                        Action::AgentValidationPkg(
                            AgentValidationPkg { membrane_proof, .. },
                        ) => validate_agent_joining(agent, membrane_proof),
                        _ => {
                            Ok(
                                ValidateCallbackResult::Invalid(
                                    "The previous action for a `CreateAgent` action must be an `AgentValidationPkg`"
                                        .to_string(),
                                ),
                            )
                        }
                    }
                }
                _ => Ok(ValidateCallbackResult::Valid),
            }
        }
    }
}
