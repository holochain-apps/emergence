use emergence_integrity::*;
use hdk::prelude::*;



#[hdk_extern]
pub fn create_slot(input: Slot) -> ExternResult<ActionHash> {
    let path = Path::from("all_slots");
    let serialized: SerializedBytes = input.clone().try_into().map_err(|_e| wasm_error!(WasmErrorInner::Guest(String::from("could not convert slot"))))?;
    let str_slot = input.to_string();
    let slot_path = Path::from(str_slot);
    let tag :LinkTag = LinkTag::new(serialized.bytes().clone());
    let action_hash = create_link(
        path.path_entry_hash()?,
        slot_path.path_entry_hash()?,
        LinkTypes::Slots,
        tag,
    )?;
    Ok(action_hash)
}
#[hdk_extern]
pub fn delete_slot(_input: Slot) -> ExternResult<()> {
    Err(wasm_error!(WasmErrorInner::Guest(String::from("delete slots not implmented"))))
   // Ok(())
}

#[hdk_extern]
pub fn get_slots(_: ()) -> ExternResult<Vec<Slot>> {
    let path = Path::from("all_slots");
    let links = get_links(path.path_entry_hash()?, LinkTypes::Slots, None)?;

    let mut slots: Vec<Slot> = Vec::new();
    for link in links {
        slots.push(convert_slot_tag(link.tag)?);
    }
    Ok(slots)
}

