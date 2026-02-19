# RapidRAW Feature Specification

# Collections (Filesystem-Native Virtual Copy Collections)

## Version

1.0

## Status

Approved for implementation

## Scope

This specification defines the filesystem structure, indexing behavior, UI behavior, and lifecycle rules for RapidRAW Collections.

This feature introduces filesystem-native collections using virtual copy `.rrdata` sidecar files stored in a dedicated folder.

This spec intentionally does NOT modify:

- master edit storage behavior
- existing `.rrdata` sidecar handling next to RAW files
- edit engine behavior
- metadata format
- export system
- RREdits folder model (deferred to future version)

---

# Core Principles

1. RapidRAW remains a filesystem-native editor with no required catalog database.
2. Collections are implemented as folders containing virtual copy `.rrdata` files.
3. RAW files are never duplicated, moved, or modified by Collections.
4. Virtual copies created for Collections are fully independent edit instances.
5. All Collection state must be recoverable solely from filesystem contents.
6. RapidRAW must not create hidden folders or hidden storage dependencies.

---

# Definitions

Session Root  
The folder opened by the user in RapidRAW.

Example:

```
/Photos/2026/photoshoot/
```

Collection Root Folder  
The folder containing all collections within a session root.

Path:

```
<session_root>/rr-collections/
```

Collection Folder  
A folder inside the collection root representing one collection.

Example:

```
<session_root>/rr-collections/Morning/
```

Virtual Copy rrdata File  
A `.rrdata` file inside a collection folder representing a virtual copy edit instance.

---

# Filesystem Structure

## Required Folder Name

The collection root folder MUST be named exactly:

```
rr-collections
```

Lowercase only.

---

## Full Example Structure

```
photoshoot/
  IMG_0001.ARW
  IMG_0001.rrdata

  rr-collections/
    Morning/
      IMG_0001.vc_ab12.rrdata
      IMG_0002.vc_ff91.rrdata

    Afternoon/
      IMG_0003.vc_8821.rrdata
```

---

# Collection Discovery Rules

## On Session Root Open

RapidRAW MUST check for existence of:

```
<session_root>/rr-collections/
```

If folder does not exist:

Collections panel MUST display empty state.

No folder creation MUST occur automatically.

---

If folder exists:

RapidRAW MUST enumerate immediate subdirectories only.

Each subdirectory MUST be treated as one Collection.

RapidRAW MUST NOT recursively search nested directories.

---

## Collection Contents

Each Collection folder MUST be scanned for files with extension:

```
*.rrdata
```

Each `.rrdata` file represents one virtual copy in that collection.

Non-rrdata files MUST be ignored.

---

# Collection Creation

## Trigger

User creates collection via UI.

## Behavior

If folder does not exist:

Create:

```
<session_root>/rr-collections/
```

Then create collection folder:

```
<session_root>/rr-collections/<collection_name>/
```

Folder name MUST match collection display name exactly after sanitization.

---

## Sanitization Rules

Remove or replace invalid filesystem characters:

Windows invalid characters:

```
< > : " / \ | ? *
```

Trim trailing spaces and periods.

Maximum folder name length: 128 characters.

If folder already exists:

Operation MUST fail with UI error.

---

# Adding Images to Collection

## Trigger

User selects one or more images and chooses:

Add to Collection → <collection_name>

---

## Behavior Per Image

RapidRAW MUST:

1. Generate new Virtual Copy ID

Format recommendation:

```
vc_<8 hex chars>
```

Example:

```
vc_ab12f91e
```

2. Create new rrdata file inside collection folder

Path:

```
<session_root>/rr-collections/<collection_name>/<original_filename>.<vc_id>.rrdata
```

Example:

```
IMG_0001.vc_ab12f91e.rrdata
```

3. Initialize rrdata contents

Initialization MUST be:

- clone of master rrdata if exists, OR
- default edit state if no master rrdata exists

4. rrdata source RAW reference MUST use relative path from rrdata file to RAW file.

Example:

```
../../IMG_0001.ARW
```

Relative path MUST be used.

Absolute paths MUST NOT be used.

---

# Editing Collection Virtual Copies

When viewing a Collection:

RapidRAW MUST load edit state exclusively from the collection rrdata file.

RapidRAW MUST NOT read or modify master rrdata next to RAW.

Edits MUST be saved only to collection rrdata.

---

# Folder View Behavior

When browsing folders normally:

RapidRAW MUST ignore:

```
rr-collections/
```

Collection virtual copies MUST NOT appear in folder view.

Folder view MUST only display RAW files and master edit states.

---

# Deleting Virtual Copies from Collection

## Trigger

User deletes image from Collection via UI.

## Behavior

RapidRAW MUST immediately delete corresponding rrdata file from filesystem.

RAW file MUST NOT be modified.

Master rrdata MUST NOT be modified.

If rrdata file deletion fails, operation MUST abort with error.

---

# Deleting Collection

## Trigger

User deletes collection via UI.

## Behavior

RapidRAW MUST delete entire folder:

```
<session_root>/rr-collections/<collection_name>/
```

Including all rrdata files inside.

RAW files MUST NOT be modified.

Master rrdata MUST NOT be modified.

---

# Renaming Collection

## Trigger

User renames collection via UI.

## Behavior

RapidRAW MUST rename corresponding folder.

No rrdata file contents modification required.

---

# Missing RAW Handling

If rrdata file references RAW file that does not exist:

Virtual copy MUST appear in Collection with "Missing File" indicator.

RapidRAW MUST NOT delete rrdata automatically.

Relink functionality is out of scope for version 1.

---

# UI Requirements

## Collections Panel

Collections panel MUST display list of folders inside:

```
<session_root>/rr-collections/
```

Display name MUST equal folder name.

Selecting Collection MUST display its virtual copies.

---

## Context Menu

When right-clicking image(s):

Context menu MUST include:

```
Add to Collection →
    <existing collections>
    New Collection…
```

---

# Performance Requirements

RapidRAW MUST NOT recursively scan entire session root for collections.

Only scan:

```
<session_root>/rr-collections/
```

Collection contents MUST be scanned only when Collection is selected.

---

# Compatibility Requirements

Existing RapidRAW behavior MUST remain unchanged for:

- folder browsing
- master edits
- existing rrdata files
- virtual copy editing engine

Feature MUST be fully backward compatible.

---

# Failure Safety Requirements

RapidRAW MUST:

- never modify RAW files
- never modify master rrdata during collection operations
- never create hidden folders
- never use absolute paths in collection rrdata

---

# Acceptance Tests

## Test 1: Create Collection

Given session root open  
When user creates collection  
Then folder rr-collections/<collection_name>/ exists

---

## Test 2: Add Image to Collection

Given RAW image selected  
When user adds to collection  
Then new rrdata file exists in collection folder  
And RAW file remains unchanged

---

## Test 3: Edit Collection Image

Given image opened from Collection  
When user edits image  
Then collection rrdata changes  
And master rrdata remains unchanged

---

## Test 4: Delete Collection Image

Given virtual copy exists in collection  
When user deletes image from collection  
Then rrdata file is deleted  
And RAW file remains

---

## Test 5: Delete Collection

Given collection exists  
When user deletes collection  
Then collection folder is deleted  
And RAW files remain

---

# Out of Scope (Future Versions)

- global collections spanning multiple session roots
- RREdits folder model
- relinking missing RAW files
- export collection bundles
- collection stacking/grouping
- collection metadata database
- collection thumbnails caching optimization

---

# Implementation Target

RapidRAW codebase:

Frontend: React / TypeScript  
Backend: Rust / Tauri  
Edit Engine: existing rrdata virtual copy system

Collections feature MUST integrate with existing virtual copy handling logic.

---

# End Specification