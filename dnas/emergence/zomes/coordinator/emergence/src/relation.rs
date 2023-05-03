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
            AnyLinkableHash::from(relation.src.clone())
        };
        let action_hash = create_link_relaxed(base, relation.dst.clone(), LinkTypes::Relations, tag.clone())?;
        actions.push(action_hash.clone());
        if is_feed {
            let path = Path::from("feed");
            create_link_relaxed(path.path_entry_hash()?, relation.dst, LinkTypes::Relations, tag.clone())?;
        };
        if relation.content.path == "session.tag" {
//            let tag_path = Path::from(format!("tags.{}",relation.content.data));
            let tag_path = Path::from("tags");
            // let typed_path = tag_path.clone().into_typed(ScopedLinkType::try_from(LinkTypes::Relations)?);
            // typed_path.ensure()?;
            create_link_relaxed(
                tag_path.path_entry_hash()?,
                relation.src,
                LinkTypes::Relations,
                tag,
            )?;
    
        }
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
    agent_filter: Option<AgentPubKey> // Placeholder
}

#[hdk_extern]
pub fn get_feed(input: GetFeedInput) -> ExternResult<Vec<RelationInfo>> {
    let path = Path::from("feed");
    let links = get_links(path.path_entry_hash()?,  LinkTypes::Relations, None)?;
    let mut relations: Vec<RelationInfo> = Vec::new();
    for link in links {
        let relation = Relation 
        { 
            src: AnyLinkableHash::from(link.author.clone()),
            dst: link.target, 
            content: convert_relation_tag(link.tag)? 
        };
        let relation_info = RelationInfo {
            create_link_hash: link.create_link_hash,
            author: link.author.clone(),
            timestamp: link.timestamp,
            relation,
        };
        match input.agent_filter {
            Some(ref agent) => if *agent == link.author {
                relations.push(relation_info)
            }
            None => relations.push(relation_info)
        };
    }
    Ok(relations)
}

#[hdk_extern]
pub fn get_tags(_input: ()) -> ExternResult<Vec<String>> {
    let path = Path::from("tags");
    let links = get_links(path.path_entry_hash()?,  LinkTypes::Relations, None)?;
    let mut tags = HashSet::new();
    for link in links {
        let content = convert_relation_tag(link.tag)?;
        tags.insert(content.data);
    }
    Ok(tags.into_iter().map(|t| t).collect())
}


#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct RelationInfo {
    create_link_hash: ActionHash,
    author: AgentPubKey,
    timestamp: Timestamp,
    relation: Relation,
}

#[hdk_extern]
pub fn get_relations(input: AnyLinkableHash) -> ExternResult<Vec<RelationInfo>> {
    let hash = AnyLinkableHash::from(input);
    let links = get_links(hash.clone(), LinkTypes::Relations, None)?;

    let mut relations: Vec<RelationInfo> = Vec::new();
    for link in links {
        let relation = Relation 
        { 
            src: hash.clone(),
            dst: link.target, 
            content: convert_relation_tag(link.tag)? };
        let relation_info = RelationInfo {
            create_link_hash: link.create_link_hash,
            author: link.author,
            timestamp: link.timestamp,
            relation,
        };
        relations.push(relation_info);
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
