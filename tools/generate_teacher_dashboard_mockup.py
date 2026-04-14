from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public" / "generated" / "teacher-dashboard-mockup.png"
OUTPUT.parent.mkdir(parents=True, exist_ok=True)


def load_font(size: int, bold: bool = False):
    candidates = [
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf",
    ]
    for path in candidates:
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()


FONT_XS = load_font(18)
FONT_SM = load_font(20)
FONT_MD = load_font(28)
FONT_LG = load_font(32, bold=True)
FONT_XL = load_font(44, bold=True)
FONT_2XL = load_font(66, bold=True)


def rounded_box(draw, box, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def shadowed_card(base, box, radius=28, fill="white", shadow=(26, 38, 80, 25), outline="#E2E8F0"):
    shadow_layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow_layer)
    shadow_draw.rounded_rectangle(box, radius=radius, fill=shadow)
    shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(18))
    base.alpha_composite(shadow_layer)
    draw = ImageDraw.Draw(base)
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=2)


def write(draw, xy, text, font, fill, anchor=None):
    draw.text(xy, text, font=font, fill=fill, anchor=anchor)


def metric_card(base, box, title, value, subtitle, accent):
    shadowed_card(base, box, radius=26, fill="white")
    draw = ImageDraw.Draw(base)
    x1, y1, x2, y2 = box
    rounded_box(draw, (x1 + 26, y1 + 24, x1 + 78, y1 + 76), 18, accent)
    write(draw, (x1 + 26, y1 + 94), title, FONT_SM, "#64748B")
    write(draw, (x1 + 26, y1 + 136), value, FONT_XL, "#0F172A")
    write(draw, (x1 + 26, y2 - 44), subtitle, FONT_XS, "#94A3B8")


def progress_bar(draw, box, progress, fill, bg="#E2E8F0"):
    x1, y1, x2, y2 = box
    rounded_box(draw, box, radius=(y2 - y1) // 2, fill=bg)
    width = max(int((x2 - x1) * progress), 18)
    rounded_box(draw, (x1, y1, x1 + width, y2), radius=(y2 - y1) // 2, fill=fill)


def pie_slice(draw, center, radius, start, end, fill):
    x, y = center
    draw.pieslice((x - radius, y - radius, x + radius, y + radius), start=start, end=end, fill=fill)


def main():
    width, height = 1680, 1080
    image = Image.new("RGBA", (width, height), "#F4F8FD")
    draw = ImageDraw.Draw(image)

    draw.rectangle((0, 0, width, height), fill="#F4F8FD")
    draw.ellipse((-200, -180, 620, 420), fill="#D9ECFF")
    draw.ellipse((width - 540, -120, width + 180, 420), fill="#EAF5FF")
    draw.ellipse((width - 420, height - 260, width + 120, height + 120), fill="#DBF1FF")

    rounded_box(draw, (40, 28, width - 40, height - 28), 42, fill=(255, 255, 255, 130), outline="#E5EEF7", width=2)

    sidebar = (72, 64, 188, height - 68)
    rounded_box(draw, sidebar, 36, fill="#0F2A52")
    write(draw, (130, 120), "BM", FONT_LG, "white", anchor="mm")
    write(draw, (130, 160), "Teacher", FONT_SM, "#D6E6FF", anchor="mm")
    write(draw, (130, 188), "Portal", FONT_SM, "#9FB8D7", anchor="mm")

    nav_items = [
        ("Dashboard", True),
        ("Courses", False),
        ("Assignments", False),
        ("Students", False),
        ("Analytics", False),
        ("Settings", False),
    ]
    y = 270
    for label, active in nav_items:
        fill = "white" if active else "#173A69"
        text_fill = "#0F172A" if active else "#D5E4F7"
        rounded_box(draw, (88, y, 172, y + 62), 22, fill=fill)
        write(draw, (130, y + 31), label[:1], FONT_MD, text_fill, anchor="mm")
        y += 88

    write(draw, (130, height - 122), "SUNIL", FONT_SM, "white", anchor="mm")
    write(draw, (130, height - 92), "TR8K29QP", FONT_XS, "#9FB8D7", anchor="mm")

    header_x = 226
    write(draw, (header_x, 92), "Teacher Command Center", FONT_XS, "#2563EB")
    write(draw, (header_x, 126), "Manage students, courses, and project progress", FONT_LG, "#0F172A")
    write(draw, (header_x, 176), "Canvas-style admin workspace for live classroom operations", FONT_SM, "#64748B")

    rounded_box(draw, (1298, 86, 1428, 132), 22, fill="white", outline="#D6E2F0", width=2)
    write(draw, (1363, 109), "TR8K29QP", FONT_SM, "#0F172A", anchor="mm")
    rounded_box(draw, (1450, 86, 1594, 132), 22, fill="#0F172A")
    write(draw, (1522, 109), "Create Task", FONT_SM, "white", anchor="mm")

    hero = (226, 222, 1130, 430)
    shadowed_card(image, hero, radius=34, fill="#FFFFFF")
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((226, 222, 1130, 308), radius=34, fill="#2B72FF")
    draw.rounded_rectangle((870, 242, 1088, 402), radius=28, fill="#F8FBFF", outline="#D7E6FB", width=2)
    write(draw, (266, 252), "Class pulse", FONT_XS, "#DBEBFF")
    write(draw, (266, 298), "84%", FONT_2XL, "white")
    write(draw, (266, 362), "Average student accuracy across all connected classrooms.", FONT_SM, "#E4F0FF")
    write(draw, (902, 274), "Weakest topic", FONT_XS, "#64748B")
    write(draw, (902, 314), "Linear Algebra", FONT_MD, "#0F172A")
    write(draw, (902, 360), "Recommended next move: assign a short revision quiz.", FONT_XS, "#64748B")

    side_panel = (1160, 222, 1608, 430)
    shadowed_card(image, side_panel, radius=34, fill="#0F172A", outline="#0F172A")
    draw = ImageDraw.Draw(image)
    write(draw, (1198, 258), "Admin Watchlist", FONT_XS, "#93C5FD")
    write(draw, (1198, 296), "Courses losing momentum", FONT_MD, "white")
    items = [
        ("Weekend DA Cohort", "72% accuracy • 58% completion"),
        ("AIML Batch Alpha", "69% accuracy • 61% completion"),
        ("Morning Classroom", "74% accuracy • 64% completion"),
    ]
    y = 344
    for title, sub in items:
        rounded_box(draw, (1192, y, 1574, y + 70), 20, fill="#162B47")
        write(draw, (1218, y + 16), title, FONT_SM, "white")
        write(draw, (1218, y + 42), sub, FONT_XS, "#B4C6DD")
        y += 82

    metric_card(image, (226, 466, 438, 650), "Tracked Learners", "128", "Across 6 active courses", "#E0F2FE")
    metric_card(image, (458, 466, 670, 650), "Active Courses", "06", "Every course has a unique code", "#FFEDD5")
    metric_card(image, (690, 466, 902, 650), "Assignments", "19", "Homework and project checkpoints", "#DCFCE7")
    metric_card(image, (922, 466, 1134, 650), "At-Risk Learners", "14", "Students needing intervention", "#FFE4E6")

    board = (226, 682, 920, 996)
    shadowed_card(image, board, radius=34, fill="white")
    draw = ImageDraw.Draw(image)
    write(draw, (258, 724), "Project Board", FONT_XS, "#2563EB")
    write(draw, (258, 760), "Assignments that need teacher attention", FONT_MD, "#0F172A")

    left_card = (258, 810, 570, 958)
    right_card = (588, 810, 888, 958)
    rounded_box(draw, left_card, 28, fill="#EEF6FF", outline="#D8EAFE", width=2)
    rounded_box(draw, right_card, 28, fill="#FFF5E8", outline="#FFE1B1", width=2)
    write(draw, (286, 836), "Needs review", FONT_SM, "#0F172A")
    write(draw, (616, 836), "Due next", FONT_SM, "#0F172A")
    review = [
        ("Project Milestone 2", "18/32 submitted"),
        ("Probability Quiz", "24/30 submitted"),
    ]
    y = 870
    for title, sub in review:
        rounded_box(draw, (282, y, 546, y + 46), 16, fill="white")
        write(draw, (300, y + 8), title, FONT_XS, "#0F172A")
        write(draw, (300, y + 25), sub, FONT_XS, "#64748B")
        y += 54
    due = [
        ("Database Sprint", "Due Apr 12, 5:00 PM"),
        ("Matrix Drill", "Due Apr 14, 9:00 AM"),
    ]
    y = 870
    for title, sub in due:
        rounded_box(draw, (612, y, 864, y + 46), 16, fill="white")
        write(draw, (630, y + 8), title, FONT_XS, "#0F172A")
        write(draw, (630, y + 25), sub, FONT_XS, "#64748B")
        y += 54

    analytics = (952, 466, 1608, 996)
    shadowed_card(image, analytics, radius=34, fill="white")
    draw = ImageDraw.Draw(image)
    write(draw, (984, 508), "Analytics Snapshot", FONT_XS, "#2563EB")
    write(draw, (984, 544), "Submission and cohort performance", FONT_MD, "#0F172A")

    # Completion chart
    chart_box = (984, 586, 1304, 770)
    rounded_box(draw, chart_box, 26, fill="#F8FAFC", outline="#E2E8F0", width=2)
    write(draw, (1012, 612), "Completion by Course", FONT_SM, "#0F172A")
    bars = [
        ("DA 1", 0.76, "#2563EB"),
        ("ML 2", 0.64, "#38BDF8"),
        ("AI 3", 0.82, "#0EA5E9"),
        ("DB 4", 0.58, "#60A5FA"),
    ]
    x = 1030
    for label, progress, color in bars:
        y1 = 732 - int(progress * 96)
        draw.rounded_rectangle((x, y1, x + 42, 732), radius=12, fill=color)
        write(draw, (x + 21, 746), label, FONT_XS, "#64748B", anchor="ma")
        x += 64

    # Donut chart
    donut_box = (1330, 586, 1578, 770)
    rounded_box(draw, donut_box, 26, fill="#F8FAFC", outline="#E2E8F0", width=2)
    write(draw, (1358, 612), "Risk Mix", FONT_SM, "#0F172A")
    center = (1454, 684)
    pie_slice(draw, center, 62, -90, 42, "#2563EB")
    pie_slice(draw, center, 62, 42, 168, "#F59E0B")
    pie_slice(draw, center, 62, 168, 270, "#10B981")
    rounded_box(draw, (1418, 648, 1490, 720), 36, fill="#F8FAFC")
    write(draw, center, "128", FONT_MD, "#0F172A", anchor="mm")
    write(draw, (1358, 742), "High 14  •  Med 28  •  Low 86", FONT_XS, "#64748B")

    roster_box = (984, 794, 1578, 958)
    rounded_box(draw, roster_box, 26, fill="#0F172A")
    write(draw, (1012, 822), "Student Monitoring", FONT_XS, "#93C5FD")
    write(draw, (1012, 856), "Intervention queue", FONT_MD, "white")
    students = [
        ("Aarav Sharma", "58% accuracy • 42% completion", "#F97316"),
        ("Diya Patel", "49% accuracy • 39% completion", "#EF4444"),
        ("Ishaan Verma", "61% accuracy • 52% completion", "#38BDF8"),
    ]
    y = 890
    for name, meta, color in students:
        draw.rounded_rectangle((1012, y, 1550, y + 18), radius=9, fill="#1E293B")
        draw.rounded_rectangle((1012, y, 1120, y + 18), radius=9, fill=color)
        write(draw, (1012, y + 30), name, FONT_XS, "white")
        write(draw, (1360, y + 30), meta, FONT_XS, "#B6C4D8", anchor="ma")
        y += 42

    image = image.convert("RGB")
    image.save(OUTPUT, quality=95)
    print(OUTPUT)


if __name__ == "__main__":
    main()
