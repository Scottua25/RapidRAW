use rand::Rng;
use serde::{Deserialize, Serialize};
use serde_json;
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use crate::file_management::parse_virtual_path;
use crate::image_processing::ImageMetadata;

const COLLECTIONS_DIR_NAME: &str = "rr-collections";
const MAX_COLLECTION_NAME_LEN: usize = 128;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CollectionInfo {
    pub name: String,
    pub path: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CollectionImageInfo {
    pub file_name: String,
    pub path: String,
    pub vc_id: Option<String>,
    pub source_raw_relative_path: Option<String>,
    pub tags: Option<Vec<String>>,
    pub is_edited: bool,
    pub modified: u64,
    pub is_missing: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct CollectionOrderManifest {
    ordered_vc_ids: Vec<String>,
}

fn collections_root(session_root: &str) -> PathBuf {
    Path::new(session_root).join(COLLECTIONS_DIR_NAME)
}

fn collection_path(session_root: &str, collection_name: &str) -> PathBuf {
    collections_root(session_root).join(collection_name)
}

fn collection_order_path(session_root: &str, collection_name: &str) -> PathBuf {
    collection_path(session_root, collection_name).join(".order.json")
}

fn load_collection_order_from_disk(session_root: &str, collection_name: &str) -> Vec<String> {
    let path = collection_order_path(session_root, collection_name);
    if !path.exists() {
        return Vec::new();
    }

    fs::read_to_string(path)
        .ok()
        .and_then(|content| serde_json::from_str::<CollectionOrderManifest>(&content).ok())
        .map(|manifest| manifest.ordered_vc_ids)
        .unwrap_or_default()
}

fn sanitize_collection_name(name: &str) -> String {
    let mut out = String::with_capacity(name.len());

    for ch in name.chars() {
        match ch {
            '<' | '>' | ':' | '"' | '/' | '\\' | '|' | '?' | '*' => out.push('_'),
            _ => out.push(ch),
        }
    }

    let trimmed = out.trim().trim_end_matches([' ', '.']);
    let mut sanitized = trimmed.to_string();

    if sanitized.len() > MAX_COLLECTION_NAME_LEN {
        sanitized.truncate(MAX_COLLECTION_NAME_LEN);
    }

    sanitized
}

fn generate_vc_id() -> String {
    let mut rng = rand::rng();
    format!("{:08x}", rng.random::<u32>())
}

fn extract_query_param(path: &str, key: &str) -> Option<String> {
    let (_, query) = path.split_once('?')?;
    for part in query.split('&') {
        let (k, v) = part.split_once('=')?;
        if k == key {
            return Some(v.to_string());
        }
    }
    None
}

#[tauri::command]
pub fn list_collections(session_root: String) -> Result<Vec<CollectionInfo>, String> {
    let root = collections_root(&session_root);

    if !root.exists() {
        return Ok(Vec::new());
    }

    if !root.is_dir() {
        return Err(format!("Collections root is not a directory: {}", root.display()));
    }

    let mut collections = Vec::new();

    for entry in fs::read_dir(&root).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();

        if !path.is_dir() {
            continue;
        }

        let name = entry.file_name().to_string_lossy().into_owned();
        collections.push(CollectionInfo {
            name,
            path: path.to_string_lossy().into_owned(),
        });
    }

    collections.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    Ok(collections)
}

#[tauri::command]
pub fn create_collection(session_root: String, collection_name: String) -> Result<CollectionInfo, String> {
    let sanitized_name = sanitize_collection_name(&collection_name);

    if sanitized_name.is_empty() {
        return Err("Collection name is empty after sanitization.".to_string());
    }

    let root = collections_root(&session_root);
    if !root.exists() {
        fs::create_dir_all(&root).map_err(|e| e.to_string())?;
    }

    let path = root.join(&sanitized_name);

    if path.exists() {
        return Err("A collection with that name already exists.".to_string());
    }

    fs::create_dir(&path).map_err(|e| e.to_string())?;

    Ok(CollectionInfo {
        name: sanitized_name,
        path: path.to_string_lossy().into_owned(),
    })
}

#[tauri::command]
pub fn rename_collection(
    session_root: String,
    old_name: String,
    new_name: String,
) -> Result<CollectionInfo, String> {
    let sanitized_name = sanitize_collection_name(&new_name);
    if sanitized_name.is_empty() {
        return Err("Collection name is empty after sanitization.".to_string());
    }

    let old_path = collection_path(&session_root, &old_name);
    if !old_path.exists() || !old_path.is_dir() {
        return Err("Collection does not exist.".to_string());
    }

    let new_path = collection_path(&session_root, &sanitized_name);
    if new_path.exists() && new_path != old_path {
        return Err("A collection with that name already exists.".to_string());
    }

    fs::rename(&old_path, &new_path).map_err(|e| e.to_string())?;

    Ok(CollectionInfo {
        name: sanitized_name,
        path: new_path.to_string_lossy().into_owned(),
    })
}

#[tauri::command]
pub fn delete_collection(session_root: String, collection_name: String) -> Result<(), String> {
    let path = collection_path(&session_root, &collection_name);

    if !path.exists() || !path.is_dir() {
        return Err("Collection does not exist.".to_string());
    }

    fs::remove_dir_all(path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_collection_images(
    session_root: String,
    collection_name: String,
) -> Result<Vec<CollectionImageInfo>, String> {
    let session_root_path = Path::new(&session_root);
    let path = collection_path(&session_root, &collection_name);

    if !path.exists() {
        return Ok(Vec::new());
    }

    if !path.is_dir() {
        return Err(format!("Collection is not a directory: {}", path.display()));
    }

    let mut images = Vec::new();

    for entry in fs::read_dir(&path).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let entry_path = entry.path();

        if !entry_path.is_file() {
            continue;
        }

        let is_rrdata = entry_path
            .extension()
            .and_then(|e| e.to_str())
            .map(|e| e.eq_ignore_ascii_case("rrdata"))
            .unwrap_or(false);

        if !is_rrdata {
            continue;
        }

        let file_name = entry.file_name().to_string_lossy().into_owned();
        let vc_id = file_name
            .strip_suffix(".rrdata")
            .and_then(|s| s.rsplit_once(".vc_").map(|(_, vc)| vc.to_string()));

        let metadata = fs::read_to_string(&entry_path)
            .ok()
            .and_then(|content| serde_json::from_str::<ImageMetadata>(&content).ok())
            .unwrap_or_default();

        let is_edited = metadata.adjustments.as_object().map_or(false, |a| {
            a.keys().len() > 1 || (a.keys().len() == 1 && !a.contains_key("rating"))
        });

        let (modified, is_missing) = if let Some(rel) = &metadata.source_raw_relative_path {
            let raw_path = session_root_path.join(rel);
            let mod_time = fs::metadata(&raw_path)
                .ok()
                .and_then(|m| m.modified().ok())
                .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                .map(|d| d.as_secs())
                .unwrap_or(0);
            (mod_time, !raw_path.exists())
        } else {
            (0, true)
        };

        images.push(CollectionImageInfo {
            file_name,
            path: entry_path.to_string_lossy().into_owned(),
            vc_id,
            source_raw_relative_path: metadata.source_raw_relative_path,
            tags: metadata.tags,
            is_edited,
            modified,
            is_missing,
        });
    }

    images.sort_by(|a, b| a.file_name.to_lowercase().cmp(&b.file_name.to_lowercase()));

    let ordered_vc_ids = load_collection_order_from_disk(&session_root, &collection_name);
    if !ordered_vc_ids.is_empty() {
        let mut index_map = HashMap::new();
        for (index, vc_id) in ordered_vc_ids.iter().enumerate() {
            index_map.insert(vc_id.as_str(), index);
        }

        images.sort_by(|a, b| {
            let idx_a = a.vc_id.as_ref().and_then(|id| index_map.get(id.as_str()));
            let idx_b = b.vc_id.as_ref().and_then(|id| index_map.get(id.as_str()));

            match (idx_a, idx_b) {
                (Some(x), Some(y)) => x.cmp(y),
                (Some(_), None) => std::cmp::Ordering::Less,
                (None, Some(_)) => std::cmp::Ordering::Greater,
                (None, None) => a.file_name.to_lowercase().cmp(&b.file_name.to_lowercase()),
            }
        });
    }
    Ok(images)
}

#[tauri::command]
pub fn get_collection_order(session_root: String, collection_name: String) -> Result<Vec<String>, String> {
    let collection_dir = collection_path(&session_root, &collection_name);
    if !collection_dir.exists() || !collection_dir.is_dir() {
        return Err("Collection does not exist.".to_string());
    }
    Ok(load_collection_order_from_disk(&session_root, &collection_name))
}

#[tauri::command]
pub fn save_collection_order(
    session_root: String,
    collection_name: String,
    ordered_vc_ids: Vec<String>,
) -> Result<(), String> {
    let collection_dir = collection_path(&session_root, &collection_name);
    if !collection_dir.exists() || !collection_dir.is_dir() {
        return Err("Collection does not exist.".to_string());
    }

    let mut deduped = Vec::with_capacity(ordered_vc_ids.len());
    let mut seen = HashMap::new();
    for vc_id in ordered_vc_ids {
        if !seen.contains_key(&vc_id) {
            seen.insert(vc_id.clone(), true);
            deduped.push(vc_id);
        }
    }

    let manifest = CollectionOrderManifest {
        ordered_vc_ids: deduped,
    };
    let json = serde_json::to_string_pretty(&manifest).map_err(|e| e.to_string())?;
    fs::write(collection_order_path(&session_root, &collection_name), json).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn add_paths_to_collection(
    session_root: String,
    collection_name: String,
    paths: Vec<String>,
) -> Result<Vec<CollectionImageInfo>, String> {
    let session_root_path = Path::new(&session_root);
    let collection_dir = collection_path(&session_root, &collection_name);

    if !collection_dir.exists() {
        return Err("Collection does not exist.".to_string());
    }

    if !collection_dir.is_dir() {
        return Err(format!("Collection is not a directory: {}", collection_dir.display()));
    }

    let mut created = Vec::new();

    for source in paths {
        let source_for_parse = source
            .split("&collection=")
            .next()
            .map(|s| s.to_string())
            .unwrap_or_else(|| source.clone());
        let (source_raw_path, source_sidecar_path) = parse_virtual_path(&source_for_parse);
        let raw_filename = source_raw_path
            .file_name()
            .and_then(|s| s.to_str())
            .filter(|s| !s.is_empty())
            .ok_or_else(|| format!("Invalid source path: {}", source))?;

        let mut metadata: ImageMetadata = if source_sidecar_path.exists() {
            let content = fs::read_to_string(&source_sidecar_path).map_err(|e| e.to_string())?;
            serde_json::from_str(&content).unwrap_or_default()
        } else {
            ImageMetadata::default()
        };

        let source_rel = source_raw_path
            .strip_prefix(session_root_path)
            .map_err(|_| {
                format!(
                    "Source path is not inside session root: {}",
                    source_raw_path.display()
                )
            })?
            .to_string_lossy()
            .into_owned();
        metadata.source_raw_relative_path = Some(source_rel);

        let existing_vc_id = extract_query_param(&source, "vc")
            .map(|v| v.trim_start_matches("vc_").to_string())
            .filter(|v| !v.is_empty());

        let mut created_path: Option<PathBuf> = None;
        let mut used_vc_id: Option<String> = None;
        for attempt in 0..10 {
            let vc_id = if attempt == 0 {
                existing_vc_id.clone().unwrap_or_else(generate_vc_id)
            } else {
                generate_vc_id()
            };

            let rrdata_name = format!("{}.vc_{}.rrdata", raw_filename, vc_id);
            let candidate = collection_dir.join(rrdata_name);

            if candidate.exists() {
                continue;
            }

            let json = serde_json::to_string_pretty(&metadata).map_err(|e| e.to_string())?;
            fs::write(&candidate, json).map_err(|e| e.to_string())?;
            created_path = Some(candidate);
            used_vc_id = Some(vc_id);
            break;
        }

        let final_path = created_path.ok_or_else(|| {
            format!(
                "Failed to generate a unique collection rrdata filename for {}",
                source
            )
        })?;

        created.push(CollectionImageInfo {
            file_name: final_path
                .file_name()
                .unwrap_or_default()
                .to_string_lossy()
                .into_owned(),
            path: final_path.to_string_lossy().into_owned(),
            vc_id: used_vc_id,
            source_raw_relative_path: metadata.source_raw_relative_path.clone(),
            tags: metadata.tags.clone(),
            is_edited: metadata.adjustments.as_object().map_or(false, |a| {
                a.keys().len() > 1 || (a.keys().len() == 1 && !a.contains_key("rating"))
            }),
            modified: fs::metadata(&source_raw_path)
                .ok()
                .and_then(|m| m.modified().ok())
                .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                .map(|d| d.as_secs())
                .unwrap_or(0),
            is_missing: !source_raw_path.exists(),
        });
    }

    Ok(created)
}
