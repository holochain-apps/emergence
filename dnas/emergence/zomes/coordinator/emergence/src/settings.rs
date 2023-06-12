use emergence_integrity::*;
use hdk::prelude::*;
use crate::messages::EmergenceMessage;

#[hdk_extern]
pub fn set_settings(input: Settings) -> ExternResult<ActionHash> {
    let path = Path::from("all_settings");
    let serialized: SerializedBytes = input.clone().try_into().map_err(|_e| wasm_error!(WasmErrorInner::Guest(String::from("could not convert setting"))))?;
    let path_hash = path.path_entry_hash()?;
    let tag :LinkTag = LinkTag::new(serialized.bytes().clone());
    let action_hash = create_link(
        path_hash.clone(),
        path_hash,
        LinkTypes::Settings,
        tag,
    )?;
    if let ZomeCallResponse::Ok(response) = call(CallTargetCell::Local,"profiles",FunctionName::new("get_agents_with_profile"), None, ())? {
        let agents : Vec<AgentPubKey> = response.decode().map_err(|_e| wasm_error!(WasmErrorInner::Guest(String::from("could not decode profiles agent list"))))?;
        // let me = agent_info()?.agent_latest_pubkey;
        //let agents = agents.into_iter().filter(|a| a != &me).collect();
        debug!("agents: {:?}", agents);
        remote_signal(EmergenceMessage::UpdateSettings(input), agents)?;
    }
    Ok(action_hash)
}

#[hdk_extern]
pub fn get_settings(_: ()) -> ExternResult<Settings> {
    let path = Path::from("all_settings");
    let mut links = get_links(path.path_entry_hash()?, LinkTypes::Settings, None)?;
    if links.len() == 0 {
        return Ok(Settings {
            game_active: false,
            current_sitemap:None, 
            session_types:vec![
                SessionType {name:"Session".into(), color:"white".into(), can_rsvp: true, can_slot: true, can_leaderless: false},
                SessionType {name:"Dining".into(), color:"#f3827f".into(), can_rsvp: false, can_slot: false, can_leaderless: true},
                SessionType {name:"Chill & Relax".into(), color:"#b7cdff".into(), can_rsvp: false, can_slot: false, can_leaderless: true},
                SessionType {name:"Community Time".into(), color:"#ffbc57".into(), can_rsvp: false, can_slot: false, can_leaderless: true},
                SessionType {name:"Crativity Time".into(), color:"#9edf7d".into(), can_rsvp: false, can_slot: false, can_leaderless: true},
                SessionType {name:"Mind-Body-Nature".into(), color:"#efc8fe".into(), can_rsvp: false, can_slot: false, can_leaderless: true},
                SessionType {name:"Prep".into(), color:"#efc8fe".into(), can_rsvp: false, can_slot: false, can_leaderless: true},
                ]});
    }
    links.sort_by(|a,b| b.timestamp.cmp(&a.timestamp));
    Ok(convert_settings_tag(links[0].tag.clone())?)
}
