# Sourced by the deploy scripts. Terraform runs locally only; CI passes everything as env vars.
TF_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../terraform/environments/dev" && pwd)"
tfout() { terraform -chdir="$TF_DIR" output -raw "$1"; }

# need VAR [terraform_output]: keep VAR if already set (CI passes everything as env vars),
# otherwise read it from `terraform output` (local use).
need() {
  local var="$1" out="${2:-}"
  if [ -n "${!var:-}" ]; then return 0; fi
  if [ -z "$out" ]; then echo "error: $var is required" >&2; exit 1; fi
  local val
  val="$(tfout "$out" 2>/dev/null)" || val=""
  if [ -z "$val" ]; then
    echo "error: $var is not set and 'terraform output $out' returned nothing (run make tf-apply, or pass $var)" >&2
    exit 1
  fi
  printf -v "$var" '%s' "$val"
  export "$var"
}

# Local pushes/deploys use the limited deployer profile. CI sets AWS_ACCESS_KEY_ID instead.
if [ -z "${AWS_ACCESS_KEY_ID:-}" ]; then
  export AWS_PROFILE="${AWS_PROFILE:-sumni-deployer}"
fi
export AWS_REGION="${AWS_REGION:-ap-southeast-2}"
