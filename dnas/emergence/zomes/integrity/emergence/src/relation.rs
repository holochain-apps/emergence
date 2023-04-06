use hdi::prelude::*;
use std::fmt;

#[derive(Serialize, Deserialize, Debug, SerializedBytes, Clone)]
pub struct Relation {
    pub src: AnyLinkableHash,
    pub dst: AnyLinkableHash,
    pub content: RelationContent,
}

#[derive(Serialize, Deserialize, Debug, SerializedBytes, Clone)]
pub struct RelationContent {
    pub path: String,
    pub data: String,
}
impl fmt::Display for RelationContent {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{};{}", self.path, self.path)
    }
}

pub fn validate_create_link_relations(
    _action: CreateLink,
    _base_address: AnyLinkableHash,
    _target_address: AnyLinkableHash,
    tag: LinkTag,
) -> ExternResult<ValidateCallbackResult> {
    convert_relation_tag(tag)?;
    Ok(ValidateCallbackResult::Valid)
}
pub fn validate_delete_link_relations(
    _action: DeleteLink,
    _original_action: CreateLink,
    _base: AnyLinkableHash,
    _target: AnyLinkableHash,
    _tag: LinkTag,
) -> ExternResult<ValidateCallbackResult> {
    Ok(
        ValidateCallbackResult::Invalid(
            String::from("Relations links cannot be deleted"),
        ),
    )
}

pub fn convert_relation_tag(tag: LinkTag) -> ExternResult<RelationContent> {
    let relation= RelationContent::try_from(SerializedBytes::from(UnsafeBytes::from(tag.into_inner())))
        .map_err(|_e| wasm_error!(WasmErrorInner::Guest(String::from("could not convert tag into relation"))))?;
    Ok(relation)
}