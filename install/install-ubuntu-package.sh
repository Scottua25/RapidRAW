#!/usr/bin/env bash
set -euo pipefail

REPO_URL="https://github.com/Scottua25/RapidRAW.git"
REPO_BRANCH="scottua/v1.5.3-integration"
REQUIRED_RUST="1.94.0"
NODE_VERSION="22.19.0"

WORK_DIR="$(mktemp -d -t rapidraw-install-XXXXXX)"
REPO_DIR="${WORK_DIR}/RapidRAW"
NODE_DIR="${WORK_DIR}/node"
export CARGO_HOME="${WORK_DIR}/cargo-home"
export RUSTUP_HOME="${WORK_DIR}/rustup-home"
export npm_config_cache="${WORK_DIR}/npm-cache"

APT_UPDATED=0
declare -a NEW_BUILD_PACKAGES=()

log() {
  printf '\n[%s] %s\n' "install" "$1"
}

cleanup() {
  local exit_code=$?

  if [ "${#NEW_BUILD_PACKAGES[@]}" -gt 0 ]; then
    log "Removing build-only packages installed by this script"
    sudo apt-get purge -y "${NEW_BUILD_PACKAGES[@]}" >/dev/null 2>&1 || true
    sudo apt-get autoremove -y >/dev/null 2>&1 || true
  fi

  rm -rf "${WORK_DIR}"

  if [ "${exit_code}" -eq 0 ]; then
    log "Temporary build files cleaned up"
  fi

  exit "${exit_code}"
}

trap cleanup EXIT

require_cmd() {
  command -v "$1" >/dev/null 2>&1
}

apt_update_once() {
  if [ "${APT_UPDATED}" -eq 0 ]; then
    sudo apt-get update
    APT_UPDATED=1
  fi
}

package_installed() {
  dpkg-query -W -f='${Status}' "$1" 2>/dev/null | grep -q "install ok installed"
}

install_build_packages() {
  local packages=("$@")
  local missing=()

  for pkg in "${packages[@]}"; do
    if ! package_installed "${pkg}"; then
      missing+=("${pkg}")
    fi
  done

  if [ "${#missing[@]}" -eq 0 ]; then
    return
  fi

  apt_update_once
  log "Installing required build packages: ${missing[*]}"
  sudo apt-get install -y "${missing[@]}"
  NEW_BUILD_PACKAGES+=("${missing[@]}")
}

ensure_prerequisites() {
  install_build_packages \
    git \
    curl \
    ca-certificates \
    file \
    xz-utils \
    build-essential \
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

download_node_temp() {
  if require_cmd node; then
    local node_major
    node_major="$(node -p "process.versions.node.split('.')[0]")"
    if [ "${node_major}" -ge 20 ]; then
      log "Using existing Node.js $(node -v)"
      return
    fi
  fi

  local arch
  case "$(uname -m)" in
    x86_64) arch="x64" ;;
    aarch64) arch="arm64" ;;
    *)
      printf '[install] ERROR: Unsupported CPU architecture: %s\n' "$(uname -m)" >&2
      exit 1
      ;;
  esac

  local tarball="node-v${NODE_VERSION}-linux-${arch}.tar.xz"
  local url="https://nodejs.org/dist/v${NODE_VERSION}/${tarball}"

  log "Downloading temporary Node.js ${NODE_VERSION}"
  curl -fsSL "${url}" -o "${WORK_DIR}/${tarball}"
  mkdir -p "${NODE_DIR}"
  tar -xf "${WORK_DIR}/${tarball}" -C "${NODE_DIR}" --strip-components=1
  export PATH="${NODE_DIR}/bin:${PATH}"
}

install_temp_rust() {
  mkdir -p "${CARGO_HOME}" "${RUSTUP_HOME}"

  log "Installing temporary Rust toolchain ${REQUIRED_RUST}"
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs -o "${WORK_DIR}/rustup-init.sh"
  sh "${WORK_DIR}/rustup-init.sh" -y --profile minimal --default-toolchain "${REQUIRED_RUST}"
  export PATH="${CARGO_HOME}/bin:${PATH}"
}

clone_repo() {
  log "Cloning ${REPO_BRANCH}"
  git clone --depth 1 --branch "${REPO_BRANCH}" "${REPO_URL}" "${REPO_DIR}"
}

build_deb() {
  cd "${REPO_DIR}"

  log "Installing JavaScript dependencies"
  npm install

  log "Building Debian package"
  npm run tauri build -- --config src-tauri/tauri.linux.conf.json --bundles deb
}

install_deb() {
  local deb_path
  deb_path="$(find "${REPO_DIR}/src-tauri/target/release/bundle/deb" -maxdepth 1 -type f -name '*.deb' | sort | tail -n 1)"

  if [ -z "${deb_path}" ]; then
    printf '[install] ERROR: No .deb package was produced.\n' >&2
    exit 1
  fi

  log "Installing package $(basename "${deb_path}")"
  sudo apt-get install -y "${deb_path}"
}

main() {
  ensure_prerequisites
  download_node_temp
  install_temp_rust
  clone_repo
  build_deb
  install_deb

  log "RapidRAW is installed. Launch it from your applications menu or run: gtk-launch io.github.CyberTimon.RapidRAW"
}

main "$@"
