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
                SessionType {name:"Session".into(), color:"white".into(), can_rsvp: true, can_any_time: false, can_leaderless: false},
                SessionType {name:"Children".into(), color:"#54ded9".into(), can_rsvp: true, can_any_time: false, can_leaderless: false},
                SessionType {name:"Community Time".into(), color:"#54ded9".into(), can_rsvp: false, can_any_time: true, can_leaderless: true},
                SessionType {name:"Creativity Time".into(), color:"#acfc0d".into(), can_rsvp: false, can_any_time: true, can_leaderless: true},
                SessionType {name:"Dining".into(), color:"#f07567".into(), can_rsvp: false, can_any_time: true, can_leaderless: true},
                SessionType {name:"Chill & Relax".into(), color:"#dec2ff".into(), can_rsvp: false, can_any_time: true, can_leaderless: true},
                SessionType {name:"Mind-Body-Nature".into(), color:"#f07567".into(), can_rsvp: false, can_any_time: true, can_leaderless: true},
                SessionType {name:"Panel/Discussion".into(), color:"#b1b1b1".into(), can_rsvp: false, can_any_time: true, can_leaderless: false},
                SessionType {name:"Prep".into(), color:"#d1d7e0".into(), can_rsvp: false, can_any_time: true, can_leaderless: true},
                SessionType {name:"Talk".into(), color:"#6292f4".into(), can_rsvp: false, can_any_time: true, can_leaderless: false},
                SessionType {name:"Workshop".into(), color:"#6292f4".into(), can_rsvp: false, can_any_time: true, can_leaderless: false},
                ]});
    }
    links.sort_by(|a,b| b.timestamp.cmp(&a.timestamp));
    Ok(convert_settings_tag(links[0].tag.clone())?)
}
