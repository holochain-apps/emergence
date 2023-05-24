use hdk::prelude::*;
use emergence_integrity::*;

#[derive(Serialize, Deserialize, Debug)]
#[serde(tag = "type")]
pub enum EmergenceMessage {
    UpdateSettings(Settings),
}