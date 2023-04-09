use emergence_integrity::*;
use hdk::prelude::*;
use crate::utils::*;

#[hdk_extern]
pub fn create_relations(input: Vec<Relation>) -> ExternResult<Vec<ActionHash>> {
    let mut actions: Vec<ActionHash> = Vec::new();
    for relation in input {
        let serialized: SerializedBytes = relation.content.clone().try_into().map_err(|_e| wasm_error!(WasmErrorInner::Guest(String::from("could not convert relation"))))?;
        let tag :LinkTag = LinkTag::new(serialized.bytes().clone());
        let is_feed = relation.content.path.starts_with("feed");
        let base = if is_feed {
            AnyLinkableHash::from(agent_info()?.agent_latest_pubkey)
        } else {
            AnyLinkableHash::from(relation.src)
        };
        let action_hash = create_link_relaxed(base, relation.dst.clone(), LinkTypes::Relations, tag.clone())?;
        actions.push(action_hash.clone());
        if is_feed {
            let path = Path::from("feed");
            create_link_relaxed(path.path_entry_hash()?, relation.dst, LinkTypes::Relations, tag)?;
        };
    }
    Ok(actions)
}
#[hdk_extern]
pub fn delete_relation(_input: Relation) -> ExternResult<()> {
    Err(wasm_error!(WasmErrorInner::Guest(String::from("delete relations not implmented"))))
   // Ok(())
}

#[derive(Serialize, Deserialize, Debug)]
pub struct GetFeedInput {
    filter: u32 // Placeholder
}

#[hdk_extern]
pub fn get_feed(_input: GetFeedInput) -> ExternResult<Vec<Relation>> {
    let path = Path::from("feed");
    let links = get_links(path.path_entry_hash()?,  LinkTypes::Relations, None)?;
    let mut relations: Vec<Relation> = Vec::new();
    for link in links {
        let relation = Relation 
        { 
            src: AnyLinkableHash::from(link.author),
            dst: link.target, 
            content: convert_relation_tag(link.tag)? 
        };
        relations.push(relation);
    }
    Ok(relations)
   
}

#[hdk_extern]
pub fn get_relations(input: AnyLinkableHash) -> ExternResult<Vec<Relation>> {
    let hash = AnyLinkableHash::from(input);
    let links = get_links(hash.clone(), LinkTypes::Relations, None)?;

    let mut relations: Vec<Relation> = Vec::new();
    for link in links {
        let relation = Relation 
        { 
            src: hash.clone(),
            dst: link.target, 
            content: convert_relation_tag(link.tag)? };
        relations.push(relation);
    }
    Ok(relations)
}

#[hdk_extern]
pub fn get_relations_agent(input: AgentPubKey) -> ExternResult<Vec<Relation>> {
    let hash = AnyLinkableHash::from(input);
    let links = get_links(hash.clone(), LinkTypes::Relations, None)?;

    let mut relations: Vec<Relation> = Vec::new();
    for link in links {
        let relation = Relation 
        { 
            src: hash.clone(),
            dst: link.target, 
            content: convert_relation_tag(link.tag)? };
        relations.push(relation);
    }
    Ok(relations)
}
