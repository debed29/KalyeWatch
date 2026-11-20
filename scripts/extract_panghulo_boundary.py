
import json
import subprocess
from pathlib import Path

# Resolve paths from the project root, regardless of the current directory.
PROJECT_ROOT = Path(__file__).resolve().parents[1]

# Read the source barangay dataset from the project root.
SOURCE = PROJECT_ROOT / "barangays.geojson"

# Save only the Panghulo polygon in the version-controlled resources folder.
OUTPUT = PROJECT_ROOT / "resources" / "data" / "panghulo-boundary.geojson"

TARGET_PSGC = "1380400014"

if not SOURCE.exists():
    raise SystemExit("barangays.geojson was not found in the project root.")

# Read the source GeoJSON dataset.
data = json.loads(SOURCE.read_text(encoding="utf-8"))

# Find the exact Panghulo barangay using its PSGC code.
matches = [
    feature
    for feature in data.get("features", [])
    if str((feature.get("properties") or {}).get("psgc_code", "")).strip()
    == TARGET_PSGC
]

# Stop if the source dataset does not contain exactly one matching barangay.
if len(matches) != 1:
    raise SystemExit(
        f"Expected one Panghulo boundary for PSGC {TARGET_PSGC}, "
        f"but found {len(matches)}. Obtain a confirmed boundary polygon "
        "from the barangay or Land Management Bureau before enabling "
        "boundary validation."
    )

feature = matches[0]
geometry = feature.get("geometry")

# Only accept usable polygon boundary geometries.
if not geometry or geometry.get("type") not in ("Polygon", "MultiPolygon"):
    raise SystemExit("The Panghulo feature has no usable polygon geometry.")

# Prepare a GeoJSON FeatureCollection containing only Panghulo.
OUTPUT.parent.mkdir(parents=True, exist_ok=True)

result = {
    "type": "FeatureCollection",
    "features": [feature],
}

# Write the extracted boundary as valid JSON.
OUTPUT.write_text(
    json.dumps(result, ensure_ascii=False, indent=4) + "\n",
    encoding="utf-8",
)

# Apply the same formatter used by the KalyeWatch project.
# This ensures generated GeoJSON passes npm run check.
subprocess.run(
    f'npx vp fmt "{OUTPUT}" --write',
    cwd=PROJECT_ROOT,
    check=True,
    shell=True,
)

properties = feature.get("properties", {})

print("Boundary extracted and formatted successfully.")
print("Name:", properties.get("psgc_name", "Panghulo"))
print("Geometry:", geometry["type"])
print("Output:", OUTPUT)
