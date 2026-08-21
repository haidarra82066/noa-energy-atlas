from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public" / "assets" / "noa-phoenix-editorial-idle.png"
OUTPUT = ROOT / "public" / "icons"
OUTPUT.mkdir(parents=True, exist_ok=True)

phoenix = Image.open(SOURCE).convert("RGBA")

def icon(size: int, filename: str, safe_scale: float) -> None:
    canvas = Image.new("RGBA", (size, size), "#081820")
    draw = ImageDraw.Draw(canvas)
    draw.ellipse((size * .05, size * .05, size * .95, size * .95), fill="#102d37", outline="#69b6c9", width=max(2, size // 80))
    target_w = int(size * safe_scale)
    target_h = int(target_w * phoenix.height / phoenix.width)
    if target_h > int(size * safe_scale):
        target_h = int(size * safe_scale)
        target_w = int(target_h * phoenix.width / phoenix.height)
    mascot = phoenix.resize((target_w, target_h), Image.Resampling.LANCZOS)
    x = (size - target_w) // 2
    y = (size - target_h) // 2 + int(size * .025)
    canvas.alpha_composite(mascot, (x, y))
    canvas.convert("RGB").save(OUTPUT / filename, optimize=True)

icon(180, "icon-180.png", .82)
icon(32, "icon-32.png", .82)
icon(192, "icon-192.png", .82)
icon(512, "icon-512.png", .82)
icon(512, "icon-512-maskable.png", .62)
