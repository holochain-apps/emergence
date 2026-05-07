use emergence_integrity::*;
use hdk::prelude::*;
use crate::messages::EmergenceMessage;

// Compatible struct for calling profiles zome functions
#[derive(Serialize, Deserialize, Debug, Clone)]
struct ZomeFnInput<T> {
    input: T,
    local: Option<bool>,
}

#[hdk_extern]
pub fn set_settings(input: Settings) -> ExternResult<ActionHash> {
    let path = Path::from("all_settings");
    let path_hash = path.path_entry_hash()?;
    let entry_action_hash = create_entry(EntryTypes::Settings(input.clone()))?;
    let action_hash = create_link(
        path_hash.clone(),
        entry_action_hash,
        LinkTypes::Settings,
        LinkTag::new(Vec::<u8>::new()),
    )?;
    if let ZomeCallResponse::Ok(response) = call(CallTargetCell::Local,"profiles",FunctionName::new("get_agents_with_profile"), None, ZomeFnInput { input: (), local: Some(true) })? {
        let agents : Vec<AgentPubKey> = response.decode().map_err(|_e| wasm_error!(WasmErrorInner::Guest(String::from("could not decode profiles agent list"))))?;
        debug!("agents: {:?}", agents);
        send_remote_signal(EmergenceMessage::UpdateSettings(input), agents)?;
    }
    Ok(action_hash)
}

#[hdk_extern]
pub fn get_settings(_: ()) -> ExternResult<Settings> {
    let path = Path::from("all_settings");
    let mut links = get_links(
        LinkQuery::try_new(
            path.path_entry_hash()?,
            LinkTypes::Settings,
        )?,
        GetStrategy::Local
    )?;
    if links.is_empty() {
        return Ok(Settings {
            game_active: false,
            current_sitemap: None,
            session_types: vec![],
            amenities: vec![],
            space_term: None,
            sitemap_term: None,
        });
    }
    links.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
    let action_hash = ActionHash::try_from(links[0].target.clone())
        .map_err(|err| wasm_error!(err))?;
    let record = get(action_hash, GetOptions::local())?
        .ok_or(wasm_error!(WasmErrorInner::Guest("Settings entry not found".into())))?;
    let settings: Settings = record
        .entry()
        .to_app_option()
        .map_err(|e| wasm_error!(e))?
        .ok_or(wasm_error!(WasmErrorInner::Guest("Settings link target was not a Settings entry".into())))?;
    Ok(settings)
}
