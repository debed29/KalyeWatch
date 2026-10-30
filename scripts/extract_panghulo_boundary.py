import json
from pathlib import Path

SOURCE = Path("barangays.geojson")
OUTPUT = Path("storage/app/private/boundaries/panghulo.geojson")
TARGET_PSGC = "1380400014"

if not SOURCE.exists():
    raise SystemExit("barangays.geojson was not found in the project root.")

data = json.loads(SOURCE.read_text(encoding="utf-8"))

matches = [
    feature
    for feature in data.get("features", [])
    if str((feature.get("properties") or {}).get("psgc_code", "")).strip()
    == TARGET_PSGC
]

if len(matches) != 1:
    raise SystemExit(
        f"Expected one Panghulo boundary for PSGC {TARGET_PSGC}, "
        f"but found {len(matches)}. Obtain a confirmed boundary polygon "
        "from the barangay or Land Management Bureau before enabling "
        "boundary validation."
    )

feature = matches[0]
geometry = feature.get("geometry")

if not geometry or geometry.get("type") not in ("Polygon", "MultiPolygon"):
    raise SystemExit("The Panghulo feature has no usable polygon geometry.")

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
result = {
    "type": "FeatureCollection",
    "features": [feature],
}

OUTPUT.write_text(
    json.dumps(result, ensure_ascii=False),
    encoding="utf-8",
)

properties = feature.get("properties", {})
print("Boundary extracted successfully.")
print("Name:", properties.get("psgc_name", "Panghulo"))
print("Geometry:", geometry["type"])
print("Output:", OUTPUT)