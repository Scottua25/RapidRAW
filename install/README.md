# Standalone Ubuntu Installer

This installer is meant to be usable as a single downloaded script.

## Quickest Way

Download and run it directly:

```bash
curl -fsSL https://raw.githubusercontent.com/Scottua25/RapidRAW/scottua/v1.5.3-integration/install/install-ubuntu-package.sh -o install-rapidraw.sh
bash install-rapidraw.sh
```

## What It Does

The script will:

- install any missing Ubuntu build prerequisites it needs
- download a temporary Node.js runtime if your system Node is missing or too old
- install a temporary Rust toolchain in a temporary folder
- clone the `scottua/v1.5.3-integration` branch into a temporary directory
- build a `.deb` package for RapidRAW
- install that package with `apt`
- remove the temporary clone, temporary Rust toolchain, temporary Node download, and other temporary build files
- remove build-only Ubuntu packages that the script itself had to install

## What It Leaves Installed

After cleanup, the goal is to leave only what is needed for the installed app to run locally.

That means:

- the installed RapidRAW Debian package remains
- runtime libraries pulled in by `apt` remain
- temporary source/build artifacts are removed
- temporary Rust and Node downloads are removed

## Running It From A Cloned Repo

If you already cloned the repo, you can still use the same script:

```bash
bash install/install-ubuntu-package.sh
```

It will still perform its own temporary clone/build/install flow.

## Launching The App

After installation, launch RapidRAW from your application menu.

You can also try:

```bash
gtk-launch io.github.CyberTimon.RapidRAW
```

## Notes

- The script uses `sudo` for package installation.
- The package identifier is currently `io.github.CyberTimon.RapidRAW`.
- Re-running the script is safe if you want to rebuild after updates.
