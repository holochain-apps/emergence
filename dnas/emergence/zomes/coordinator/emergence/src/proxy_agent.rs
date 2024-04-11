use hdk::prelude::*;
use emergence_integrity::*;
#[hdk_extern]
pub fn create_proxy_agent(proxy_agent: ProxyAgent) -> ExternResult<Record> {
    let proxy_agent_hash = create_entry(&EntryTypes::ProxyAgent(proxy_agent.clone()))?;

    let record = get(proxy_agent_hash.clone(), GetOptions::default())?
        .ok_or(
            wasm_error!(
                WasmErrorInner::Guest(String::from("Could not find the newly created ProxyAgent"))
            ),
        )?;
    let path = Path::from("all_proxy_agents");
    create_link(path.path_entry_hash()?, proxy_agent_hash.clone(), LinkTypes::AllProxyAgents, ())?;
    Ok(record)
}
#[hdk_extern]
pub fn get_proxy_agent(original_proxy_agent_hash: ActionHash) -> ExternResult<Option<Record>> {
    let input: GetLinksInput = GetLinksInputBuilder::try_new(original_proxy_agent_hash.clone(), LinkTypes::ProxyAgentUpdates)?.build();
    let links = get_links(input)?;
    let latest_link = links
        .into_iter()
        .max_by(|link_a, link_b| link_a.timestamp.cmp(&link_b.timestamp));
    let latest_proxy_agent_hash = match latest_link {
        Some(link) => ActionHash::try_from(link.target.clone()).map_err(|err| wasm_error!(err))?,
        None => original_proxy_agent_hash.clone(),
    };
    get(latest_proxy_agent_hash, GetOptions::default())
}
#[derive(Serialize, Deserialize, Debug)]
pub struct UpdateProxyAgentInput {
    pub original_hash: ActionHash,
    pub previous_hash: ActionHash,
    pub updated_proxy_agent: ProxyAgent,
}
#[hdk_extern]
pub fn update_proxy_agent(input: UpdateProxyAgentInput) -> ExternResult<Record> {
    let updated_proxy_agent_hash = update_entry(
        input.previous_hash.clone(),
        &input.updated_proxy_agent,
    )?;
    create_link(
        input.original_hash.clone(),
        updated_proxy_agent_hash.clone(),
        LinkTypes::ProxyAgentUpdates,
        (),
    )?;
    let record = get(updated_proxy_agent_hash.clone(), GetOptions::default())?
        .ok_or(
            wasm_error!(
                WasmErrorInner::Guest(String::from("Could not find the newly updated ProxyAgent"))
            ),
        )?;
    Ok(record)
}
#[hdk_extern]
pub fn delete_proxy_agent(original_proxy_agent_hash: ActionHash) -> ExternResult<ActionHash> {
    delete_entry(original_proxy_agent_hash)
}
