use emergence_integrity::*;
use hdk::prelude::*;
use crate::utils::*;

#[hdk_extern]
pub fn create_relations(input: Vec<Relation>) -> ExternResult<Vec<ActionHash>> {
    let mut actions: Vec<ActionHash> = Vec::new();
    for relation in input {
        let serialized: SerializedBytes = relation.content.clone().try_into().map_err(|_e| wasm_error!(WasmErrorInner::Guest(String::from("could not convert relation"))))?;
        let tag :LinkTag = LinkTag::new(serialized.bytes().clone());
        actions.push(create_link_relaxed(relation.src, relation.dst, LinkTypes::Relations, tag)?);
    }
    Ok(actions)
}
#[hdk_extern]
pub fn delete_relation(_input: Relation) -> ExternResult<()> {
    Err(wasm_error!(WasmErrorInner::Guest(String::from("delete relations not implmented"))))
   // Ok(())
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
