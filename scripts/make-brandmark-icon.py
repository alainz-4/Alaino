from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


def vertical_gradient(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size))
    px = img.load()
    top = (23, 50, 77, 255)
    mid = (37, 78, 114, 255)
    bottom = (217, 124, 68, 255)

    for y in range(size):
        t = y / max(1, size - 1)
        if t < 0.68:
          u = t / 0.68
          color = tuple(int(top[i] * (1 - u) + mid[i] * u) for i in range(4))
        else:
          u = (t - 0.68) / 0.32
          color = tuple(int(mid[i] * (1 - u) + bottom[i] * u) for i in range(4))

        for x in range(size):
            px[x, y] = color

    return img


def draw_icon(size: int = 256) -> Image.Image:
    base = vertical_gradient(size)
    overlay = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    draw.rounded_rectangle((12, 12, size - 12, size - 12), radius=58, fill=(255, 255, 255, 18))
    draw.ellipse((20, 22, 88, 90), fill=(255, 255, 255, 18))
    draw.ellipse((168, 14, 246, 92), fill=(255, 255, 255, 18))
    draw.ellipse((180, 178, 262, 260), fill=(255, 255, 255, 10))

    shadow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_draw.rounded_rectangle((62, 52, 194, 204), radius=24, fill=(0, 0, 0, 180))
    shadow = shadow.filter(ImageFilter.GaussianBlur(10))
    shadow = Image.eval(shadow, lambda v: v // 8)
    shadow = shadow.convert("RGBA")

    page_shadow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    page_shadow.alpha_composite(shadow)

    page = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    page_draw = ImageDraw.Draw(page)
    page_draw.rounded_rectangle((62, 52, 194, 204), radius=24, fill=(255, 255, 255, 245))
    page_draw.rounded_rectangle((74, 62, 182, 192), radius=20, outline=(24, 36, 52, 35), width=2)
    page_draw.rounded_rectangle((82, 72, 110, 79), radius=4, fill=(217, 124, 68, 255))

    for i, width in enumerate((54, 90, 72, 78)):
        page_draw.rounded_rectangle((82, 88 + i * 14, 82 + width, 94 + i * 14), radius=4, fill=(220, 229, 238, 255))

    page_draw.line(
        [(84, 148), (100, 134), (118, 126), (136, 118), (151, 102), (165, 88), (180, 72)],
        fill=(23, 50, 77, 255),
        width=9,
        joint="curve",
    )
    for x, y, r, color in [
        (180, 72, 8, (217, 124, 68, 255)),
        (118, 126, 6, (23, 50, 77, 255)),
        (151, 102, 6, (23, 50, 77, 255)),
        (136, 118, 5, (23, 50, 77, 230)),
    ]:
        page_draw.ellipse((x - r, y - r, x + r, y + r), fill=color)

    page_draw.rounded_rectangle((84, 168, 154, 178), radius=5, fill=(23, 50, 77, 35))

    composed = Image.alpha_composite(base, overlay)
    composed = Image.alpha_composite(composed, page_shadow)
    composed = Image.alpha_composite(composed, page)
    return composed


def main() -> None:
    repo_root = Path(__file__).resolve().parents[1]
    out_path = repo_root / "apps" / "web" / "public" / "brandmark.ico"
    png_path = repo_root / "apps" / "web" / "public" / "brandmark-256.png"

    icon = draw_icon()
    icon.save(out_path, format="ICO", sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
    icon.save(png_path, format="PNG")
    print(out_path)
    print(png_path)


if __name__ == "__main__":
    main()
