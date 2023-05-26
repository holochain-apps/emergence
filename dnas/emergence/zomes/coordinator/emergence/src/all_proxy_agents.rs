use hdk::prelude::*;
use emergence_integrity::*;
use std::collections::HashMap;
use crate::{relation::{get_relations, RelationInfo}, proxy_agent::get_proxy_agent};

#[derive(Serialize, Deserialize, Debug, SerializedBytes, Clone)]
pub struct ProxyAgentInfo{
    pub original_hash: ActionHash,
    pub record: Record,
    pub relations: Vec<RelationInfo>,
}

#[hdk_extern]
pub fn get_all_proxy_agents(_: ()) -> ExternResult<Vec<ProxyAgentInfo>> {
    let path = Path::from("all_proxy_agents");
    let links = get_links(path.path_entry_hash()?, LinkTypes::AllProxyAgents, None)?;
    let mut records: Vec<Record> = Vec::new();
    let mut hashes: HashMap<ActionHash,ActionHash>= HashMap::new();
    for link in links {
        if let Some(record) = get_proxy_agent(ActionHash::try_from(link.target.clone()).map_err(|err| wasm_error!(err))?)? {
            hashes.insert(record.action_address().clone(), ActionHash::try_from(link.target).map_err(|err| wasm_error!(err))?);
            records.push(record);
        }
    }
    let mut proxy_agents: Vec<ProxyAgentInfo> = Vec::new();
    for r in records {
        let hash = r.action_address().clone();
        let original_hash = hashes.get(&hash).unwrap().clone();
        let relations = get_relations(AnyLinkableHash::from(original_hash.clone()))?;
        proxy_agents.push(ProxyAgentInfo {
            original_hash,
            record: r,
            relations
        })
    };
    Ok(proxy_agents)
}
