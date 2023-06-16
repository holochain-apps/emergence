use emergence_integrity::*;
use hdk::prelude::*;
use crate::utils::*;
use std::collections::HashMap;

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
pub fn delete_relations(input: Vec<ActionHash>) -> ExternResult<()> {
    for relation_hash in input {
        delete_link(relation_hash)?;
    }
    Ok(())
}

#[derive(Serialize, Deserialize, Debug)]
pub struct GetFeedInput {
    agent_filter: Option<AgentPubKey>, // Placeholder
    newer_than: Option<Timestamp>,
    older_than: Option<Timestamp>,
    count: Option<usize>,
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

        let mut filtered = 
            match input.newer_than {
                Some(newer_than) => link.timestamp> newer_than ,
                None => false
            };
        if !filtered {
            filtered = 
                match input.older_than {
                    Some(older_than) => link.timestamp< older_than ,
                    None => false
                };

            if !filtered {
                filtered = 
                    match input.agent_filter {
                        Some(ref agent) => *agent == link.author ,
                        None => false
                    };
            }
        }
        if !filtered {
            relations.push(relation_info)
        }
        relations.sort_by(|a,b| b.timestamp.cmp(&a.timestamp));

        if let Some(count) = input.count {
            relations.truncate(count);
        }
    }
    Ok(relations)
}

#[derive(Serialize, Deserialize, Debug)]
pub struct SessionAgent {
    session: ActionHash,
    agent: AgentPubKey,
}


#[derive(Serialize, Deserialize, Debug)]
pub struct TagUse {
    tag: String,
    session_agents: Vec<SessionAgent>,
}

#[hdk_extern]
pub fn get_tags(_input: ()) -> ExternResult<Vec<TagUse>> {
    let path = Path::from("tags");
    let links = get_links(path.path_entry_hash()?,  LinkTypes::Relations, None)?;
    let mut tags: HashMap<String,Vec<SessionAgent>> = HashMap::new();
    for link in links {
        let content = convert_relation_tag(link.tag)?;
        let tag = content.data;
        let sa = SessionAgent{
            session: link.target.try_into()?,
            agent: link.author
        };
        if let Some(session_agent) = tags.get_mut(&tag) {
            session_agent.push(sa)
        } else {
            tags.insert(tag, vec![sa]);
        };
    }
    Ok(tags.into_iter().map(|(tag,session_agents)| TagUse{tag,session_agents}).collect())
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
