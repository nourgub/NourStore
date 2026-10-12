"""Algeria's 58 wilayas: codes, Arabic/French names, common spellings, default delivery fees.

The fees here are demo defaults used to seed the `wilayas` table: 600 DA for Algiers,
1200 DA for the far-south wilayas, 900 DA elsewhere. Each store should set its real
carrier prices in the database. Matching is exact after normalisation (no fuzzy
guessing), so a misspelt or unknown wilaya is rejected instead of silently mapped
to the wrong one.
"""
import re
import unicodedata

DEFAULT_FEE, ALGIERS_FEE, FAR_SOUTH_FEE = 900, 600, 1200
FAR_SOUTH = {1, 8, 11, 33, 37, 49, 50, 52, 53, 54, 56, 58}

# (code, French name, Arabic name, extra aliases in Darija/English/other spellings)
WILAYAS = [
    (1, "Adrar", "أدرار", []),
    (2, "Chlef", "الشلف", ["chlef", "echlef", "orleansville"]),
    (3, "Laghouat", "الأغواط", ["lghouat"]),
    (4, "Oum El Bouaghi", "أم البواقي", ["oum el bouagui"]),
    (5, "Batna", "باتنة", []),
    (6, "Béjaïa", "بجاية", ["bgayet", "bejaia", "bougie", "vgayet"]),
    (7, "Biskra", "بسكرة", []),
    (8, "Béchar", "بشار", []),
    (9, "Blida", "البليدة", ["lblida"]),
    (10, "Bouira", "البويرة", []),
    (11, "Tamanrasset", "تمنراست", ["tam", "tamanghasset"]),
    (12, "Tébessa", "تبسة", ["tbessa"]),
    (13, "Tlemcen", "تلمسان", ["tlemsen"]),
    (14, "Tiaret", "تيارت", ["tihert"]),
    (15, "Tizi Ouzou", "تيزي وزو", ["tizi"]),
    (16, "Alger", "الجزائر", ["algiers", "dzayer", "dzair", "el djazair", "la capitale", "العاصمة",
                               "الجزائر العاصمة", "دزاير", "الدزاير"]),
    (17, "Djelfa", "الجلفة", ["jelfa"]),
    (18, "Jijel", "جيجل", []),
    (19, "Sétif", "سطيف", ["stif"]),
    (20, "Saïda", "سعيدة", []),
    (21, "Skikda", "سكيكدة", []),
    (22, "Sidi Bel Abbès", "سيدي بلعباس", ["sba", "bel abbes", "sidi bel abbes"]),
    (23, "Annaba", "عنابة", ["bone"]),
    (24, "Guelma", "قالمة", []),
    (25, "Constantine", "قسنطينة", ["qsentina", "ksentina", "csantina"]),
    (26, "Médéa", "المدية", ["lemdia"]),
    (27, "Mostaganem", "مستغانم", ["mosta"]),
    (28, "M'Sila", "المسيلة", ["msila"]),
    (29, "Mascara", "معسكر", ["mouaskar"]),
    (30, "Ouargla", "ورقلة", ["wargla"]),
    (31, "Oran", "وهران", ["wahran"]),
    (32, "El Bayadh", "البيض", []),
    (33, "Illizi", "إليزي", []),
    (34, "Bordj Bou Arréridj", "برج بوعريريج", ["bba", "bordj bou arreridj"]),
    (35, "Boumerdès", "بومرداس", []),
    (36, "El Tarf", "الطارف", []),
    (37, "Tindouf", "تندوف", []),
    (38, "Tissemsilt", "تيسمسيلت", []),
    (39, "El Oued", "الوادي", ["oued souf", "souf"]),
    (40, "Khenchela", "خنشلة", []),
    (41, "Souk Ahras", "سوق أهراس", []),
    (42, "Tipaza", "تيبازة", ["tipasa"]),
    (43, "Mila", "ميلة", []),
    (44, "Aïn Defla", "عين الدفلى", []),
    (45, "Naâma", "النعامة", []),
    (46, "Aïn Témouchent", "عين تموشنت", []),
    (47, "Ghardaïa", "غرداية", []),
    (48, "Relizane", "غليزان", ["ghilizane"]),
    (49, "Timimoun", "تيميمون", []),
    (50, "Bordj Badji Mokhtar", "برج باجي مختار", []),
    (51, "Ouled Djellal", "أولاد جلال", []),
    (52, "Béni Abbès", "بني عباس", []),
    (53, "In Salah", "عين صالح", ["ain salah"]),
    (54, "In Guezzam", "عين قزام", ["ain guezzam"]),
    (55, "Touggourt", "تقرت", []),
    (56, "Djanet", "جانت", []),
    (57, "El M'Ghair", "المغير", ["el meghaier"]),
    (58, "El Meniaa", "المنيعة", ["el golea"]),
]

_ARABIC_DIACRITICS = re.compile(r"[ً-ْـ]")


def normalize(text):
    """Lower-case, strip accents/diacritics, unify Arabic letter variants and spacing."""
    text = unicodedata.normalize("NFKD", str(text)).casefold()
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = _ARABIC_DIACRITICS.sub("", text)
    text = text.translate(str.maketrans({"أ": "ا", "إ": "ا", "آ": "ا", "ة": "ه", "ى": "ي"}))
    text = re.sub(r"[-'’`_.,]", " ", text)
    text = re.sub(r"^(wilaya|wilayat|ولايه)\s+(de\s+|d\s+|of\s+)?", "", text.strip())
    return re.sub(r"\s+", " ", text).strip()


def default_fee(code):
    if code == 16:
        return ALGIERS_FEE
    return FAR_SOUTH_FEE if code in FAR_SOUTH else DEFAULT_FEE


def names_for(code, name_fr, name_ar, aliases):
    """Every normalised spelling that should resolve to this wilaya."""
    names = {normalize(name_fr), normalize(name_ar), str(code), f"{code:02d}"}
    ar = normalize(name_ar)
    if ar.startswith("ال"):
        names.add(ar[2:])
    names.update(normalize(alias) for alias in aliases)
    return {name for name in names if name}
