# Ubuntu Install

This folder contains a one-shot installer for the `scottua/v1.5.3-integration` branch.

## What It Does

The script:

- installs the Linux build dependencies Tauri needs
- installs Node.js 22 if your system Node is too old
- installs Rust `1.94.0` and sets a repo-local override
- runs `npm install`
- builds a Debian package for RapidRAW
- installs that `.deb` with `apt`

## How To Run It

From the repo root on your Ubuntu machine:

```bash
chmod +x install/install-ubuntu-package.sh
./install/install-ubuntu-package.sh
```

If you prefer, this works too:

```bash
bash install/install-ubuntu-package.sh
```

## Recommended Clone Command

```bash
git clone --branch scottua/v1.5.3-integration https://github.com/Scottua25/RapidRAW.git
cd RapidRAW
./install/install-ubuntu-package.sh
```

## After Install

You can launch the app from the desktop applications menu.

If you want to try launching from a terminal:

```bash
gtk-launch io.github.CyberTimon.RapidRAW
```

If your desktop environment does not expose that launcher cleanly, you can also search for `RapidRAW` in the app menu.

## Notes

- The script uses `sudo` for system packages and for installing the generated `.deb`.
- The package identifier is still `io.github.CyberTimon.RapidRAW`, matching the current upstream-aligned branch.
- Re-running the script is safe if you want to rebuild after pulling updates.
