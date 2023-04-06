use emergence_integrity::*;
use hdk::prelude::*;



#[hdk_extern]
pub fn create_time_window(input: TimeWindow) -> ExternResult<ActionHash> {
    let path = Path::from("all_time_windows");
    let serialized: SerializedBytes = input.clone().try_into().map_err(|_e| wasm_error!(WasmErrorInner::Guest(String::from("could not convert time_window"))))?;
    let str_time_window = input.to_string();
    let time_window_path = Path::from(str_time_window);
    let tag :LinkTag = LinkTag::new(serialized.bytes().clone());
    let action_hash = create_link(
        path.path_entry_hash()?,
        time_window_path.path_entry_hash()?,
        LinkTypes::TimeWindows,
        tag,
    )?;
    Ok(action_hash)
}
#[hdk_extern]
pub fn delete_time_window(_input: TimeWindow) -> ExternResult<()> {
    Err(wasm_error!(WasmErrorInner::Guest(String::from("delete time_windows not implmented"))))
   // Ok(())
}

#[hdk_extern]
pub fn get_time_windows(_: ()) -> ExternResult<Vec<TimeWindow>> {
    let path = Path::from("all_time_windows");
    let links = get_links(path.path_entry_hash()?, LinkTypes::TimeWindows, None)?;

    let mut time_windows: Vec<TimeWindow> = Vec::new();
    for link in links {
        time_windows.push(convert_time_window_tag(link.tag)?);
    }
    Ok(time_windows)
}

