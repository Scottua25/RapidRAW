#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
REQUIRED_RUST="1.94.0"

log() {
  printf '\n[%s] %s\n' "install" "$1"
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1
}

ensure_node() {
  if require_cmd node; then
    local node_major
    node_major="$(node -p "process.versions.node.split('.')[0]")"
    if [ "${node_major}" -ge 20 ]; then
      log "Node.js $(node -v) detected"
      return
    fi
  fi

  log "Installing Node.js 22.x from NodeSource"
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
}

ensure_rust() {
  if ! require_cmd rustup; then
    log "Installing rustup"
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
  fi

  # shellcheck disable=SC1091
  source "${HOME}/.cargo/env"

  log "Installing Rust ${REQUIRED_RUST}"
  rustup toolchain install "${REQUIRED_RUST}"
  rustup override set "${REQUIRED_RUST}"
}

install_system_dependencies() {
  log "Installing Ubuntu build dependencies"
  sudo apt-get update
  sudo apt-get install -y \
    build-essential \
    curl \
    file \
    patchelf \
    pkg-config \
    libssl-dev \
    libgtk-3-dev \
    librsvg2-dev \
    libayatana-appindicator3-dev \
    libsoup-3.0-dev \
    libwebkit2gtk-4.1-dev \
    javascriptcoregtk-4.1-dev
}

build_and_install() {
  cd "${REPO_ROOT}"

  log "Installing JavaScript dependencies"
  npm install

  log "Building Debian package"
  npm run tauri build -- --config src-tauri/tauri.linux.conf.json --bundles deb

  local deb_path
  deb_path="$(find "${REPO_ROOT}/src-tauri/target/release/bundle/deb" -maxdepth 1 -type f -name '*.deb' | sort | tail -n 1)"

  if [ -z "${deb_path}" ]; then
    printf '[install] ERROR: No .deb package was produced.\n' >&2
    exit 1
  fi

  log "Installing package ${deb_path}"
  sudo apt-get install -y "${deb_path}"

  log "RapidRAW is installed. Launch it from your applications menu or run: gtk-launch io.github.CyberTimon.RapidRAW"
}

main() {
  install_system_dependencies
  ensure_node
  ensure_rust
  build_and_install
}

main "$@"
