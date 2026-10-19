"""Render static review images from local Pinky Lamb assets; no app or browser runtime."""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
ASSETS = ROOT / '../../pinky-lamb-cms/public-baseline/assets'
ASSETS = ASSETS.resolve()
PAPER = '#fbf8f6'
SURFACE = '#ffffff'
SIDEBAR = '#fffaf7'
PLUM = '#352430'
ROSE = '#9f375d'
BLUSH = '#f6e6ed'
MUTED = '#776a71'
LINE = '#ecdee4'
GREEN = '#32624f'
GREEN_BG = '#eaf4ee'


def font(size, weight='regular'):
    file = {'regular': 'montserrat-400.woff', 'semi': 'montserrat-600.woff', 'bold': 'montserrat-700.woff'}[weight]
    return ImageFont.truetype(ASSETS / file, size)


class Art:
    def __init__(self, width, height):
        self.im = Image.new('RGB', (width, height), PAPER)
        self.d = ImageDraw.Draw(self.im)
        self.width = width
        self.height = height

    def box(self, x, y, w, h, fill=SURFACE, radius=10, outline=LINE, stroke=1):
        self.d.rounded_rectangle((x, y, x+w, y+h), radius=radius, fill=fill, outline=outline, width=stroke)

    def line(self, x1, y1, x2, y2, fill=LINE, width=1):
        self.d.line((x1, y1, x2, y2), fill=fill, width=width)

    def text(self, x, y, value, size=12, fill=PLUM, weight='regular', max_width=None):
        value = str(value)
        original = value
        face = font(size, weight)
        if max_width:
            while value and self.d.textlength(value, font=face) > max_width:
                value = value[:-1]
            if value and value != original:
                value = value[:-1] + '…'
        self.d.text((x, y), value, font=face, fill=fill)

    def centered(self, cx, y, value, size=12, fill=PLUM, weight='regular'):
        face = font(size, weight)
        self.text(cx-self.d.textlength(value, font=face)/2, y, value, size, fill, weight)

    def image(self, file, x, y, w, h, fit='contain', radius=0):
        source = Image.open(ASSETS / file).convert('RGBA')
        sw, sh = source.size
        scale = max(w/sw, h/sh) if fit == 'cover' else min(w/sw, h/sh)
        nw, nh = max(1, round(sw*scale)), max(1, round(sh*scale))
        source = source.resize((nw, nh), Image.Resampling.LANCZOS)
        if fit == 'cover':
            left, top = (nw-w)//2, (nh-h)//2
            source = source.crop((left, top, left+w, top+h))
            layer = source
        else:
            layer = Image.new('RGBA', (w, h), '#ffffff')
            layer.alpha_composite(source, ((w-nw)//2, (h-nh)//2))
        if radius:
            mask = Image.new('L', (w, h), 0)
            ImageDraw.Draw(mask).rounded_rectangle((0, 0, w-1, h-1), radius, fill=255)
            layer.putalpha(mask)
        self.im.paste(layer, (x, y), layer)

    def pill(self, x, y, value, fill=GREEN_BG, text=GREEN, w=None):
        value = value.replace('✓ ', '').replace('● ', '')
        face = font(9, 'semi')
        w = w or round(self.d.textlength(value, font=face) + 18)
        self.box(x, y, w, 23, fill, 12, fill)
        self.centered(x+w/2, y+5, value, 9, text, 'semi')

    def button(self, x, y, w, value, primary=False):
        fill = PLUM if primary else SURFACE
        self.box(x, y, w, 38, fill, 8, PLUM if primary else '#d7c2cc')
        self.centered(x+w/2, y+11, value, 10, SURFACE if primary else PLUM, 'semi')

    def save(self, name):
        self.im.save(ROOT / name, 'PNG', optimize=True)


def desktop_shell(art, screen, title, crumb):
    w = art.width
    art.d.rectangle((0, 0, 238, art.height), fill=SIDEBAR)
    art.line(238, 0, 238, art.height)
    art.d.rectangle((239, 0, w, 76), fill=SURFACE)
    art.line(239, 76, w, 76)
    art.image('pinky-mascot.webp', 27, 25, 34, 34)
    art.text(70, 27, 'PINKY LAMB', 12, '#bd6b87', 'semi')
    art.text(70, 46, 'CONTENT STUDIO', 9, MUTED, 'regular')
    nav = ['Đầu trang, Hero và SEO', 'Khách hàng', 'Dự án', 'Dịch vụ', 'Giới thiệu', 'IP Studio', 'Liên hệ', 'Chân trang']
    art.text(27, 102, 'NỘI DUNG CẦN QUẢN LÝ', 9, '#a09199', 'semi')
    for i, label in enumerate(nav):
        y = 129+i*46
        if screen == label:
            art.box(15, y, 208, 39, BLUSH, 8, BLUSH)
            art.d.rectangle((15, y+8, 18, y+31), fill=ROSE)
        color = ROSE if screen == label else MUTED
        art.box(30, y+12, 15, 15, SIDEBAR if screen != label else BLUSH, 3, color)
        if i % 2 == 0:
            art.line(33, y+18, 42, y+18, color)
        else:
            art.d.ellipse((35, y+16, 40, y+21), outline=color, width=1)
        art.text(61, y+11, label, 10, color, 'semi' if screen == label else 'regular')
    art.text(27, 519, 'TÀI NGUYÊN', 9, '#a09199', 'semi')
    if screen == 'Thư viện media':
        art.box(15, 543, 208, 39, BLUSH, 8, BLUSH)
        art.d.rectangle((15, 551, 18, 574), fill=ROSE)
    color = ROSE if screen == 'Thư viện media' else MUTED
    art.box(30, 555, 15, 15, SIDEBAR if screen != 'Thư viện media' else BLUSH, 3, color)
    art.line(33, 565, 37, 561, color)
    art.line(37, 561, 41, 566, color)
    art.text(61, 554, 'Thư viện media', 10, color, 'semi' if screen == 'Thư viện media' else 'regular')
    art.text(27, 613, 'QUẢN LÝ', 9, '#a09199', 'semi')
    art.box(30, 652, 15, 15, SIDEBAR, 3, MUTED)
    art.text(61, 652, 'Cấu trúc website', 10, MUTED)
    art.box(30, 697, 15, 15, SIDEBAR, 3, MUTED)
    art.text(61, 697, 'Xuất bản', 10, MUTED)
    art.text(310, 17, crumb, 9, MUTED)
    art.text(310, 38, title, 19, PLUM, 'semi')
    art.pill(w-167, 24, 'MOCKUP TĨNH', BLUSH, ROSE, 118)
    art.pill(w-227, 24, 'OWNER', '#f7f3f5', MUTED, 53)


def mobile_shell(art, title, crumb):
    w = art.width
    art.d.rectangle((0, 0, w, 58), fill=SIDEBAR)
    art.line(0, 58, w, 58)
    art.image('pinky-mascot.webp', 16, 12, 31, 31)
    art.text(55, 12, 'PINKY LAMB', 10, '#bd6b87', 'semi')
    art.text(55, 28, 'CONTENT STUDIO', 8, MUTED)
    art.d.rectangle((0, 59, w, 118), fill=SURFACE)
    art.line(0, 118, w, 118)
    art.text(16, 65, crumb, 8, MUTED)
    art.text(16, 82, title, 16, PLUM, 'semi')
    art.pill(w-114, 79, 'MOCKUP TĨNH', BLUSH, ROSE, 98)


MEDIA = [
    ('wayfair-team-2026.webp', '2026'), ('wayfair-summit-2026.webp', '2026'),
    ('vifa-opening-2026.webp', '2026'), ('sony-ult-2025.webp', '2025'),
    ('varna-elite-2023.webp', '2023'), ('petrosetco-party-2026.webp', '2026'),
    ('samsung-flip2-2019.webp', '2019'), ('psd-dell-microsoft-2025.webp', '2025'),
]

PROJECTS = [
    ('wayfair-summit-2026.webp', 'Wayfair Global Selling Vietnam Summit', 'Wayfair · 2026'),
    ('sony-ult-2025.webp', 'Karaoke ULT Speakers', 'Sony · 2025'),
    ('diag-awareness-2022.webp', 'Brand Awareness Strategy', 'Diag · 2022'),
    ('vifa-opening-2026.webp', 'VIFA EXPO 2026', 'VIFA EXPO · 2026'),
    ('petrosetco-party-2026.webp', 'New Year Party 2026', 'Petrosetco Distribution · 2026'),
    ('varna-elite-2023.webp', 'Thanh Xuân Hoàng Kim', 'NutiFood · VARNA ELITE · 2023'),
    ('samsung-flip2-2019.webp', 'Samsung Flip 2 · Teacher’s Day', 'Samsung · 2019'),
    ('psd-dell-microsoft-2025.webp', 'Partner Year End Party', 'PSD · Dell · Microsoft · 2025'),
]

CLIENTS = [('client-sony.webp', 'sony'), ('client-wayfair.webp', 'wayfair'),
           ('client-samsung.webp', 'samsung'), ('client-aqua.webp', 'aqua'),
           ('client-manulife.webp', 'manulife')]


def draw_media_card(a, x, y, w, h, entry, selected=False):
    file, year = entry
    a.box(x, y, w, h, SURFACE, 9, ROSE if selected else LINE, 2 if selected else 1)
    a.box(x+1, y+1, w-2, h-69, '#f8f4f5', 8, '#f8f4f5')
    a.image(file, x+8, y+8, w-16, h-83, 'cover', 5)
    a.text(x+11, y+h-62, file, 10 if w>180 else 9, PLUM, 'semi', w-22)
    a.text(x+11, y+h-36, 'Ảnh · '+year, 9, MUTED)
    a.pill(x+w-68, y+h-40, 'READY', GREEN_BG, GREEN, 58)


def draw_media_desktop():
    a = Art(1440, 1030)
    desktop_shell(a, 'Thư viện media', 'Thư viện media', 'Pinky Lamb / Quản trị nội dung')
    a.text(272, 111, 'TÀI NGUYÊN', 10, ROSE, 'bold')
    a.text(272, 134, 'Thư viện media', 25, PLUM, 'bold')
    a.text(272, 171, 'Nhận diện tài nguyên bằng ảnh trước khi mở thông tin chi tiết.', 11, MUTED)
    a.button(1320, 135, 90, 'Tải lại')
    a.box(272, 206, 1138, 67, '#fff8fb', 11)
    a.box(288, 220, 38, 38, BLUSH, 10, BLUSH)
    a.centered(307, 226, '↑', 20, ROSE, 'semi')
    a.text(339, 218, 'Tải media lên', 12, PLUM, 'semi')
    a.text(339, 240, 'Ảnh, PDF hoặc video · giữ trạng thái tải và xử lý hiện có', 10, MUTED)
    a.button(1300, 221, 92, '+ Tải lên')
    a.box(272, 291, 1138, 706, SURFACE, 14)
    a.text(294, 314, 'Ảnh trong thư viện', 16, PLUM, 'semi')
    a.text(294, 340, 'Ảnh lấp đầy khung; mở thẻ để xem trọn ảnh.', 10, MUTED)
    a.pill(1260, 317, '● Ảnh sẵn sàng', GREEN_BG, GREEN, 126)
    for x, name in [(294, 'Loại media'), (482, 'Trạng thái')]:
        a.text(x, 371, name, 10, MUTED, 'semi')
        a.box(x, 391, 172, 39, SURFACE, 7, '#d8c8cf')
    a.text(307, 402, 'Ảnh', 11)
    a.text(495, 402, 'Tất cả', 11)
    a.text(1269, 404, '8 tài nguyên minh họa', 10, MUTED)
    cw = 260
    for i, entry in enumerate(MEDIA):
        x = 294+(i%4)*273
        y = 448+(i//4)*229
        draw_media_card(a, x, y, cw, 214, entry, i == 0)
    a.line(294, 914, 1388, 914)
    a.text(294, 933, 'Chọn thẻ để xem bản lớn, thông tin và quyền Lưu trữ.', 10, MUTED)
    a.pill(1320, 926, '1 / 1', '#f7f3f5', MUTED, 62)
    a.save('media-desktop.png')


def draw_media_mobile():
    a = Art(390, 1260)
    mobile_shell(a, 'Thư viện media', 'Pinky Lamb / Quản trị nội dung')
    a.text(16, 139, 'TÀI NGUYÊN', 9, ROSE, 'bold')
    a.text(16, 157, 'Thư viện media', 21, PLUM, 'bold')
    a.text(16, 190, 'Nhận diện tài nguyên bằng ảnh.', 10, MUTED)
    a.box(15, 221, 360, 66, '#fff8fb', 10)
    a.box(27, 233, 38, 38, BLUSH, 8, BLUSH)
    a.centered(46, 240, '↑', 18, ROSE, 'semi')
    a.text(75, 233, 'Tải media lên', 11, PLUM, 'semi')
    a.text(75, 252, 'Ảnh, PDF hoặc video', 9, MUTED)
    a.button(286, 235, 77, '+ Tải')
    a.box(15, 304, 360, 915, SURFACE, 12)
    a.text(29, 323, 'Ảnh trong thư viện', 14, PLUM, 'semi')
    a.text(29, 348, 'Thumbnail đi trước tên tệp.', 9, MUTED)
    for x, value in [(29, 'Ảnh'), (203, 'Tất cả')]:
        a.box(x, 379, 158, 37, SURFACE, 7, '#d8c8cf')
        a.text(x+11, 388, value, 10)
    a.text(29, 428, '8 tài nguyên minh họa', 9, MUTED)
    for i, entry in enumerate(MEDIA):
        x = 29+(i%2)*174
        y = 456+(i//2)*177
        draw_media_card(a, x, y, 158, 166, entry, i == 0)
    a.text(29, 1173, 'Chọn ảnh để xem bản lớn và thông tin.', 9, MUTED)
    a.save('media-mobile.png')


def locale(a, x, y, compact=False):
    labels = ['EN', 'VI', 'JA']
    w = 55 if compact else 62
    for i, label in enumerate(labels):
        px = x+i*(w+6)
        a.box(px, y, w, 36 if compact else 38, SURFACE, 6)
        a.text(px+7, y+4, label, 9, PLUM, 'semi')
        a.text(px+7, y+20, 'Đã lưu', 8, GREEN)


def draw_project_desktop():
    a = Art(1440, 1110)
    desktop_shell(a, 'Dự án', 'Dự án', 'Pinky Lamb / Nội dung website')
    a.text(272, 111, 'NỘI DUNG WEBSITE', 10, ROSE, 'bold')
    a.text(272, 134, 'Dự án', 25, PLUM, 'bold')
    a.text(272, 171, 'Ảnh bìa, tên dự án và trạng thái bản dịch trong cùng một hàng.', 11, MUTED)
    a.box(272, 209, 212, 39, '#f7f1f4', 8)
    a.box(276, 213, 92, 31, SURFACE, 6)
    a.centered(322, 220, 'Bản dịch', 10, PLUM, 'semi')
    a.text(382, 220, 'Dữ liệu dùng chung', 10, MUTED)
    a.text(272, 267, 'Danh sách dự án', 11, PLUM, 'semi')
    a.text(425, 267, 'Nội dung mục', 11, MUTED)
    a.line(272, 293, 1410, 293)
    a.line(272, 292, 382, 292, ROSE, 2)
    a.box(272, 313, 1138, 750, SURFACE, 14)
    a.text(294, 335, 'Danh sách dự án', 16, PLUM, 'semi')
    a.text(294, 361, 'Chọn EN, VI hoặc JA tại dự án cần biên tập.', 10, MUTED)
    a.pill(1325, 337, '8 dự án', GREEN_BG, GREEN, 63)
    a.text(294, 396, 'Tìm dự án', 10, MUTED, 'semi')
    a.box(294, 416, 270, 39, SURFACE, 7, '#d8c8cf')
    a.text(307, 426, 'Tên dự án hoặc khách hàng', 10, '#a1949a')
    a.text(1185, 430, 'Ảnh bìa dùng chung', 9, MUTED)
    a.text(308, 475, 'DỰ ÁN / KHÁCH HÀNG', 9, '#958891', 'semi')
    a.text(1052, 475, 'HIỂN THỊ', 9, '#958891', 'semi')
    a.text(1173, 475, 'BẢN DỊCH NỘI DUNG', 9, '#958891', 'semi')
    a.line(294, 497, 1388, 497)
    for i, (file, title, customer) in enumerate(PROJECTS):
        y = 505+i*67
        a.box(308, y+5, 96, 54, '#f8f4f5', 5)
        a.image(file, 308, y+5, 96, 54, 'cover', 5)
        a.text(420, y+12, title, 11, PLUM, 'semi', 570)
        a.text(420, y+34, customer, 9, MUTED, max_width=560)
        a.pill(1045, y+20, '✓ Hiển thị', GREEN_BG, GREEN, 87)
        locale(a, 1173, y+14)
        a.line(294, y+66, 1388, y+66)
    a.text(294, 1050, '“Đã lưu” chưa có nghĩa đã được duyệt hoặc xuất bản.', 9, MUTED)
    a.save('projects-desktop.png')


def draw_project_mobile():
    a = Art(390, 1510)
    mobile_shell(a, 'Dự án', 'Pinky Lamb / Nội dung website')
    a.text(16, 139, 'NỘI DUNG WEBSITE', 9, ROSE, 'bold')
    a.text(16, 157, 'Dự án', 21, PLUM, 'bold')
    a.text(16, 190, 'Ảnh bìa đi cùng tên và bản dịch.', 10, MUTED)
    a.box(15, 220, 211, 37, '#f7f1f4', 8)
    a.box(19, 224, 89, 29, SURFACE, 6)
    a.centered(64, 231, 'Bản dịch', 9, PLUM, 'semi')
    a.text(118, 231, 'Dữ liệu dùng chung', 9, MUTED)
    a.text(16, 275, 'Danh sách dự án', 10, PLUM, 'semi')
    a.text(163, 275, 'Nội dung mục', 10, MUTED)
    a.line(15, 299, 375, 299)
    a.line(15, 299, 129, 299, ROSE, 2)
    a.box(15, 317, 360, 1151, SURFACE, 12)
    a.text(29, 337, 'Danh sách dự án', 14, PLUM, 'semi')
    a.text(29, 361, 'Chọn ngôn ngữ tại dự án cần biên tập.', 9, MUTED)
    a.box(29, 390, 332, 37, SURFACE, 7, '#d8c8cf')
    a.text(41, 399, 'Tìm dự án hoặc khách hàng', 9, '#a1949a')
    for i, (file, title, customer) in enumerate(PROJECTS):
        y = 447+i*125
        a.box(29, y+2, 76, 57, '#f8f4f5', 5)
        a.image(file, 29, y+2, 76, 57, 'cover', 5)
        a.text(116, y+3, title, 9, PLUM, 'semi', 236)
        a.text(116, y+24, customer, 8, MUTED, max_width=235)
        a.pill(116, y+42, '✓ Hiển thị', GREEN_BG, GREEN, 75)
        locale(a, 116, y+75, True)
        a.line(29, y+121, 361, y+121)
    a.text(29, 1450, 'Bản dịch đã lưu ≠ nội dung đã xuất bản.', 8, MUTED)
    a.save('projects-mobile.png')


def draw_logo_card(a, x, y, w, file, label, selected=False, mobile=False):
    h = 124 if mobile else 145
    a.box(x, y, w, h, SURFACE, 9, ROSE if selected else LINE, 2 if selected else 1)
    a.box(x+8, y+8, w-16, h-42, SURFACE, 6)
    a.image(file, x+17, y+17, w-34, h-60, 'contain', 2)
    a.centered(x+w/2, y+h-27, label, 9, MUTED, 'semi')


def draw_clients_desktop():
    a = Art(1440, 930)
    desktop_shell(a, 'Khách hàng', 'Khách hàng', 'Pinky Lamb / Nội dung website')
    a.text(272, 111, 'NỘI DUNG WEBSITE', 10, ROSE, 'bold')
    a.text(272, 134, 'Khách hàng', 25, PLUM, 'bold')
    a.text(272, 171, 'Chọn logo để biên tập mô tả theo ngôn ngữ.', 11, MUTED)
    a.box(272, 208, 212, 39, '#f7f1f4', 8)
    a.box(276, 212, 92, 31, SURFACE, 6)
    a.centered(322, 219, 'Bản dịch', 10, PLUM, 'semi')
    a.text(382, 219, 'Dữ liệu dùng chung', 10, MUTED)
    a.text(272, 266, 'Biên tập bản dịch', 11, PLUM, 'semi')
    a.text(435, 266, 'Đối chiếu nội dung gốc ↗', 11, MUTED)
    a.line(272, 293, 1410, 293)
    a.line(272, 292, 397, 292, ROSE, 2)
    for i, (code, name) in enumerate([('EN','Tiếng Anh'), ('VI','Tiếng Việt'), ('JA','Tiếng Nhật')]):
        x=272+i*124
        a.box(x, 314, 115, 53, SURFACE, 8, '#d1a2b4' if i==0 else LINE)
        a.text(x+11, 325, code, 10, ROSE, 'semi')
        a.text(x+33, 325, name, 10, PLUM, 'semi')
        a.text(x+11, 344, 'Đã lưu', 8, GREEN)
    a.text(1210, 333, '✓ Đã lưu', 10, GREEN, 'semi')
    a.button(1304, 321, 106, 'Lưu bản Anh', True)
    a.box(272, 391, 651, 489, SURFACE, 13)
    a.text(294, 414, 'Chọn logo để biên tập mô tả', 16, PLUM, 'semi')
    a.text(294, 441, 'Ảnh, pháp nhân và thứ tự chỉ đọc.', 10, MUTED)
    a.pill(841, 414, '5 logo', '#f3eef0', MUTED, 60)
    for i, (file, label) in enumerate(CLIENTS):
        x=294+(i%3)*202
        y=480+(i//3)*156
        draw_logo_card(a,x,y,188,file,label,i==0)
    a.box(294, 798, 607, 58, '#f9f4f6', 8)
    a.text(309, 809, 'Dữ liệu dùng chung · Chỉ đọc', 10, PLUM, 'semi')
    a.text(309, 828, 'Artwork, pháp nhân, liên kết, thứ tự và hiển thị giữ theo nguồn.', 9, MUTED)
    a.box(941, 391, 469, 489, SURFACE, 13)
    a.text(963, 414, 'Nội dung tiếng Anh', 16, PLUM, 'semi')
    a.pill(1315, 414, 'Đã lưu', GREEN_BG, GREEN, 72)
    a.text(963, 441, 'Logo đang chọn: sony', 10, MUTED)
    a.text(963, 485, 'Mô tả logo được chọn', 10, MUTED, 'semi')
    a.box(963, 507, 425, 42, SURFACE, 8, '#d6c7cf')
    a.text(976, 518, 'Sony logo', 11)
    a.box(963, 583, 425, 228, '#fffafc', 10)
    a.text(981, 600, 'BẢN ĐÃ LƯU · TIẾNG ANH', 9, ROSE, 'semi')
    a.text(981, 625, 'Brands that made an impact with us.', 11, PLUM, 'semi')
    a.box(981, 660, 388, 93, SURFACE, 8)
    a.image('client-sony.webp', 993, 675, 90, 60, 'contain', 5)
    a.text(1098, 686, 'sony', 10, PLUM, 'semi')
    a.text(1098, 707, 'Sony logo', 9, MUTED)
    a.text(981, 768, 'Đối chiếu nội dung đã lưu · không phải preview website.', 9, MUTED)
    a.save('clients-desktop.png')


def draw_clients_mobile():
    a = Art(390, 1370)
    mobile_shell(a, 'Khách hàng', 'Pinky Lamb / Nội dung website')
    a.text(16, 139, 'NỘI DUNG WEBSITE', 9, ROSE, 'bold')
    a.text(16, 157, 'Khách hàng', 21, PLUM, 'bold')
    a.text(16, 190, 'Chọn logo để biên tập mô tả.', 10, MUTED)
    a.box(15, 220, 211, 37, '#f7f1f4', 8)
    a.box(19, 224, 89, 29, SURFACE, 6)
    a.centered(64, 231, 'Bản dịch', 9, PLUM, 'semi')
    a.text(118, 231, 'Dữ liệu dùng chung', 9, MUTED)
    a.text(16, 275, 'Biên tập bản dịch', 10, PLUM, 'semi')
    a.line(15, 299, 375, 299)
    a.line(15, 299, 145, 299, ROSE, 2)
    for i, (code, name) in enumerate([('EN','Tiếng Anh'), ('VI','Tiếng Việt'), ('JA','Tiếng Nhật')]):
        x=15+i*122
        a.box(x, 316, 116, 49, SURFACE, 8, '#d1a2b4' if i==0 else LINE)
        a.text(x+8, 326, code, 8, ROSE, 'semi')
        a.text(x+27, 326, name, 8, PLUM, 'semi')
        a.text(x+8, 343, 'Đã lưu', 8, GREEN)
    a.text(18, 384, '✓ Đã lưu', 9, GREEN, 'semi')
    a.button(260, 373, 113, 'Lưu bản Anh', True)
    a.box(15, 432, 360, 490, SURFACE, 12)
    a.text(29, 452, 'Chọn logo để biên tập mô tả', 13, PLUM, 'semi')
    a.text(29, 476, 'Ảnh và thứ tự chỉ đọc.', 9, MUTED)
    for i, (file, label) in enumerate(CLIENTS):
        x=29+(i%2)*173
        y=507+(i//2)*126
        draw_logo_card(a,x,y,159,file,label,i==0,True)
    a.box(29, 886, 332, 23, '#f9f4f6', 6)
    a.text(39, 891, 'Dữ liệu dùng chung · Chỉ đọc', 8, MUTED, 'semi')
    a.box(15, 940, 360, 382, SURFACE, 12)
    a.text(29, 961, 'Nội dung tiếng Anh', 14, PLUM, 'semi')
    a.pill(293, 957, 'Đã lưu', GREEN_BG, GREEN, 68)
    a.text(29, 986, 'Logo đang chọn: sony', 9, MUTED)
    a.text(29, 1016, 'Mô tả logo được chọn', 9, MUTED, 'semi')
    a.box(29, 1037, 332, 40, SURFACE, 7, '#d6c7cf')
    a.text(40, 1048, 'Sony logo', 10)
    a.box(29, 1098, 332, 201, '#fffafc', 9)
    a.text(41, 1114, 'BẢN ĐÃ LƯU · TIẾNG ANH', 8, ROSE, 'semi')
    a.text(41, 1136, 'Brands that made an impact with us.', 9, PLUM, 'semi')
    a.box(41, 1165, 308, 91, SURFACE, 7)
    a.image('client-sony.webp', 52, 1178, 78, 62, 'contain', 4)
    a.text(143, 1185, 'sony', 9, PLUM, 'semi')
    a.text(143, 1206, 'Sony logo', 9, MUTED)
    a.text(41, 1270, 'Đối chiếu bản đã lưu · không phải website.', 8, MUTED)
    a.save('clients-mobile.png')


def draw_overview():
    canvas = Image.new('RGB', (1330, 2410), PAPER)
    draw = ImageDraw.Draw(canvas)
    rows = [('Thư viện media', 'media'), ('Dự án', 'projects'), ('Khách hàng', 'clients')]
    for index, (label, name) in enumerate(rows):
        top = 20 + index * 795
        draw.text((28, top), label, font=font(19, 'bold'), fill=PLUM)
        draw.text((28, top+30), 'DESKTOP · 1440 px', font=font(9, 'semi'), fill=ROSE)
        draw.text((1025, top+30), 'MOBILE · 390 px', font=font(9, 'semi'), fill=ROSE)
        desktop = Image.open(ROOT / f'{name}-desktop.png').convert('RGB')
        mobile = Image.open(ROOT / f'{name}-mobile.png').convert('RGB')
        desktop.thumbnail((960, 718), Image.Resampling.LANCZOS)
        mobile.thumbnail((260, 718), Image.Resampling.LANCZOS)
        canvas.paste(desktop, (28, top+54))
        canvas.paste(mobile, (1025, top+54))
    canvas.save(ROOT / 'overview.png', 'PNG', optimize=True)


if __name__ == '__main__':
    draw_media_desktop()
    draw_media_mobile()
    draw_project_desktop()
    draw_project_mobile()
    draw_clients_desktop()
    draw_clients_mobile()
    draw_overview()
    print('Rendered six static PNG mockups and overview in', ROOT)
