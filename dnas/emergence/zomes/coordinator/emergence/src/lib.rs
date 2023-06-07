pub mod all_spaces;
pub mod space;
pub mod note;
pub mod all_sessions;
pub mod session;
pub mod time_window;
pub mod settings;
pub mod relation;
pub mod utils;
pub mod map;
pub mod all_maps;
pub mod proxy_agent;
pub mod all_proxy_agents;
pub mod messages;

use all_sessions::SessionInfo;
use all_spaces::SpaceInfo;
use hdk::prelude::*;
use emergence_integrity::*;
use note::get_note;
use relation::{get_relations, RelationInfo};
use session::get_session;
use space::get_space;
use messages::*;

#[hdk_extern]
pub fn init(_: ()) -> ExternResult<InitCallbackResult> {

    // let mut fns = BTreeSet::new();
    // fns.insert((zome_info()?.name, "recv_remote_signal".into()));
    // let functions = GrantedFunctions::Listed(fns);
    // create_cap_grant(CapGrantEntry {
    //     tag: "".into(),
    //     access: CapAccess::Unrestricted,
    //     functions,
    // })?;

    Ok(InitCallbackResult::Pass)
}
#[derive(Serialize, Deserialize, Debug)]
#[serde(tag = "type")]
pub enum Signal {
    LinkCreated { action: SignedActionHashed, link_type: LinkTypes },
    LinkDeleted { action: SignedActionHashed, link_type: LinkTypes },
    EntryCreated { action: SignedActionHashed, app_entry: EntryTypes },
    EntryUpdated {
        action: SignedActionHashed,
        app_entry: EntryTypes,
        original_app_entry: EntryTypes,
    },
    EntryDeleted { action: SignedActionHashed, original_app_entry: EntryTypes },
}
#[hdk_extern(infallible)]
pub fn post_commit(committed_actions: Vec<SignedActionHashed>) {
    for action in committed_actions {
        if let Err(err) = signal_action(action) {
            error!("Error signaling new action: {:?}", err);
        }
    }
}
fn signal_action(action: SignedActionHashed) -> ExternResult<()> {
    match action.hashed.content.clone() {
        Action::CreateLink(create_link) => {
            if let Ok(Some(link_type))
                = LinkTypes::from_type(create_link.zome_index, create_link.link_type) {
                emit_signal(Signal::LinkCreated {
                    action,
                    link_type,
                })?;
            }
            Ok(())
        }
        Action::DeleteLink(delete_link) => {
            let record = get(
                    delete_link.link_add_address.clone(),
                    GetOptions::default(),
                )?
                .ok_or(
                    wasm_error!(
                        WasmErrorInner::Guest("Failed to fetch CreateLink action"
                        .to_string())
                    ),
                )?;
            match record.action() {
                Action::CreateLink(create_link) => {
                    if let Ok(Some(link_type))
                        = LinkTypes::from_type(
                            create_link.zome_index,
                            create_link.link_type,
                        ) {
                        emit_signal(Signal::LinkDeleted {
                            action,
                            link_type,
                        })?;
                    }
                    Ok(())
                }
                _ => {
                    return Err(
                        wasm_error!(
                            WasmErrorInner::Guest("Create Link should exist".to_string())
                        ),
                    );
                }
            }
        }
        Action::Create(_create) => {
            if let Ok(Some(app_entry)) = get_entry_for_action(&action.hashed.hash) {
                emit_signal(Signal::EntryCreated {
                    action,
                    app_entry,
                })?;
            }
            Ok(())
        }
        Action::Update(update) => {
            if let Ok(Some(app_entry)) = get_entry_for_action(&action.hashed.hash) {
                if let Ok(Some(original_app_entry))
                    = get_entry_for_action(&update.original_action_address) {
                    emit_signal(Signal::EntryUpdated {
                        action,
                        app_entry,
                        original_app_entry,
                    })?;
                }
            }
            Ok(())
        }
        Action::Delete(delete) => {
            if let Ok(Some(original_app_entry))
                = get_entry_for_action(&delete.deletes_address) {
                emit_signal(Signal::EntryDeleted {
                    action,
                    original_app_entry,
                })?;
            }
            Ok(())
        }
        _ => Ok(()),
    }
}
fn get_entry_for_action(action_hash: &ActionHash) -> ExternResult<Option<EntryTypes>> {
    let record = match get_details(action_hash.clone(), GetOptions::default())? {
        Some(Details::Record(record_details)) => record_details.record,
        _ => {
            return Ok(None);
        }
    };
    let entry = match record.entry().as_option() {
        Some(entry) => entry,
        None => {
            return Ok(None);
        }
    };
    let (zome_index, entry_index) = match record.action().entry_type() {
        Some(EntryType::App(AppEntryDef { zome_index, entry_index, .. })) => {
            (zome_index, entry_index)
        }
        _ => {
            return Ok(None);
        }
    };
    Ok(
        EntryTypes::deserialize_from_type(
            zome_index.clone(),
            entry_index.clone(),
            entry,
        )?,
    )
}


#[derive(Serialize, Deserialize, Debug)]
pub struct GetStuffInput {
    sessions: Option<Vec<ActionHash>>,
    spaces: Option<Vec<ActionHash>>,
    notes: Option<Vec<ActionHash>>,
}

#[derive(Serialize, Deserialize, Debug, SerializedBytes, Clone)]
pub struct NoteInfo {
    pub original_hash: ActionHash,
    pub record: Record,
    pub relations: Vec<RelationInfo>,
}
#[derive(Serialize, Deserialize, Debug)]
pub struct GetStuffOutput {
    sessions: Option<Vec<Option<SessionInfo>>>,
    spaces: Option<Vec<Option<SpaceInfo>>>,
    notes: Option<Vec<Option<NoteInfo>>>,
}

#[hdk_extern]
pub fn get_stuff(input: GetStuffInput) -> ExternResult<GetStuffOutput> {
    let mut output = GetStuffOutput {
        sessions: None,
        spaces: None,
        notes: None, 
    };
    if let Some(sessions) = input.sessions{
        let mut infos = Vec::new();
        for original_hash in sessions {
            let maybe_record = get_session(original_hash.clone())?;
            match maybe_record {
                Some(record) => {
                    let relations = get_relations(AnyLinkableHash::from(original_hash.clone()))?;
                    infos.push(Some(SessionInfo{
                        original_hash: original_hash,
                        record,
                        relations
                    }))
                }
                None => infos.push(None)
            }
        };
        output.sessions = Some(infos);
    }
    if let Some(spaces) = input.spaces{
        let mut infos = Vec::new();
        for original_hash in spaces {
            let maybe_record = get_space(original_hash.clone())?;
            match maybe_record {
                Some(record) => {
                    let relations = get_relations(AnyLinkableHash::from(original_hash.clone()))?;
                    infos.push(Some(SpaceInfo{
                        original_hash: original_hash,
                        record,
                        relations
                    }))
                }
                None => infos.push(None)
            }
        };
        output.spaces = Some(infos);
    }
    if let Some(notes) = input.notes{
        let mut infos = Vec::new();
        for original_hash in notes {
            let maybe_record = get_note(original_hash.clone())?;
            match maybe_record {
                Some(record) => {
                    let relations = get_relations(AnyLinkableHash::from(original_hash.clone()))?;
                    infos.push(Some(NoteInfo{
                        original_hash: original_hash,
                        record,
                        relations
                    }))
                }
                None => infos.push(None)
            }
        };
        output.notes = Some(infos);
    }
    Ok(output)
}

#[derive(Serialize, Deserialize, Debug)]
pub struct EmergenceSignal {
    provenance: AgentPubKey,
    message: EmergenceMessage,
}

#[hdk_extern]
pub fn recv_remote_signal(message: EmergenceMessage) -> ExternResult<()> {
    let info = call_info()?;

    let notice = EmergenceSignal {
        message,
        provenance: info.provenance,
    };
    debug!("signal recevied: {:?}", notice);

    emit_signal(notice)
}
