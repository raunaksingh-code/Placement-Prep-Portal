import csv
import json
import re
import sys
from pathlib import Path

# Add backend to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent / "backend"))
from app.seed.extract_jd import categorise_question, slugify

RAW_FILE = Path("data/seed_source/pgdm1_raw.csv")
OUT_FILE = Path("data/seed_source/jd_extract/question_bank_pgdm1.json")

COMPANY_ALIASES = {
    "kpmg": "KPMG India",
    "kpmg india": "KPMG India",
    "quick clean": "Quick Clean Laundry Systems",
    "quickclean laundry systems": "Quick Clean Laundry Systems",
    "everready": "Eveready",
    "cox & king": "Cox & Kings",
    "cox & kings": "Cox & Kings",
    "finlactics": "Finlatics",
    "automovil": "Automovill",
    "cupa": "Cambridge University Press & Assessment (CUPA)",
    "first citizens": "First Citizens Bank",
    "indian hotels company (taj hotels)": "IHCL (Taj Hotels)",
    "verity": "Verity Knowledge Solutions",
    "raychem": "Raychem RPG",
    "india factoring & finance": "India Factoring & Finance Solutions",
    "vedanta": "Vedanta",
}

ROUND_COLUMNS = [
    ("Aptitude Test", "Aptitude Test"),
    ("Wiriting Assessment", "Writing Assessment"),
    ("GD topic", "Group Discussion"),
    ("L1 Interview Questions", "L1 Interview"),
    ("L2 Interview Questions", "L2 Interview"),
    ("L3 Interview Questions", "L3 Interview"),
    ("L4 Interview Questions", "L4 Interview"),
    ("HR round", "HR Round"),
    ("Leadership round", "Leadership Round"),
]

QUESTION_START_WORDS = (
    'tmay', 'tell', 'walk', 'why', 'what', 'how', 'which', 'where', 'who', 'when',
    'explain', 'describe', 'give', 'swot', 'pestel', 'porter', 'ebitda', 'ebit',
    'guesstimate', 'case', 'puzzle', 'situation', 'questions', 'hobbies', 'family',
    'internship', 'project', 'work ex', 'strengths', 'weakness', 'ratios', 'cfs',
    'dcf', 'npv', 'irr', 'sql', 'python', 'excel', 'power bi', 'tableau'
)

def should_split_by_comma(line):
    parts = [p.strip() for p in line.split(',') if p.strip()]
    if len(parts) < 2:
        return False
    if len(parts) <= 3 and any(len(p) > 80 for p in parts):
        return False
    keyword_or_short = 0
    for p in parts:
        low = p.lower()
        if len(p) <= 35 or any(low.startswith(w) for w in QUESTION_START_WORDS):
            keyword_or_short += 1
    return keyword_or_short >= (len(parts) * 0.7)

def split_cell_into_questions(cell_text):
    if not cell_text:
        return []
    text = cell_text.strip()
    if not text:
        return []

    text = text.replace('’', "'").replace('‘', "'").replace('“', '"').replace('”', '"').replace('–', '-').replace('—', '-')
    text = text.replace('\r\n', '\n').replace('\r', '\n')

    raw_lines = [l.strip() for l in text.split('\n') if l.strip()]

    items = []
    for line in raw_lines:
        parts = re.split(r'(?:^|\s+)(?:\d+[\.\)]|[-•*])\s*', line)
        parts = [p.strip() for p in parts if p.strip()]
        if len(parts) > 1:
            for p in parts:
                items.append(p)
        else:
            q_parts = re.split(r'(?<=\?)\s+(?=[A-Z0-9])', line)
            if len(q_parts) > 1:
                for qp in q_parts:
                    items.append(qp.strip())
            else:
                if should_split_by_comma(line):
                    for cp in line.split(','):
                        cp_s = cp.strip()
                        if cp_s:
                            items.append(cp_s)
                else:
                    items.append(line)

    cleaned = []
    for item in items:
        item = re.sub(r'^[0-9]+[\.\)]\s*', '', item).strip()
        item = re.sub(r'^[-•*]\s*', '', item).strip()
        item = item.strip(' ,;:')
        if len(item) >= 3 and item.lower() not in ('none', 'na', 'n/a', 'false', 'true', '-'):
            if item and item[0].islower():
                item = item[0].upper() + item[1:]
            cleaned.append(item)

    return cleaned

def clean_role(raw_role):
    if not raw_role:
        return "General"
    lines = [l.strip() for l in raw_role.replace('\r', '\n').split('\n') if l.strip()]
    role = " / ".join(lines)
    return role.strip(' ,;') or "General"

def canonical_company_name(name):
    name = (name or "").replace('\xa0', ' ').strip()
    return COMPANY_ALIASES.get(name.lower(), name)

def main():
    with open(RAW_FILE, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        headers = next(reader)
        rows = list(reader)

    header_to_idx = {h.strip(): idx for idx, h in enumerate(headers)}

    curr_company = ""
    curr_role = ""

    # Group questions by (company, role) -> {round_name: [questions]}
    company_role_data = {}
    gd_topics = []

    for i, row in enumerate(rows):
        if i >= 445:  # GD Topics section at end of table
            # Row 446 was 'GD Topics', rows 447.. are topics
            cell_val = row[1].strip() if len(row) > 1 else ""
            if not cell_val and len(row) > 0:
                cell_val = row[0].strip()
            if cell_val and cell_val.lower() != 'gd topics':
                gd_topics.append(cell_val)
            continue

        comp_raw = row[header_to_idx.get('Company', 1)].strip() if 'Company' in header_to_idx and len(row) > header_to_idx['Company'] else ""
        role_raw = row[header_to_idx.get('Role', 2)].strip() if 'Role' in header_to_idx and len(row) > header_to_idx['Role'] else ""

        if comp_raw:
            curr_company = comp_raw
        if role_raw:
            curr_role = role_raw

        comp = canonical_company_name(curr_company)
        role = clean_role(curr_role)

        if not comp:
            continue

        key = (comp, role)
        if key not in company_role_data:
            company_role_data[key] = {rnd_name: [] for _, rnd_name in ROUND_COLUMNS}

        for col_name, rnd_name in ROUND_COLUMNS:
            idx = header_to_idx.get(col_name)
            if idx is not None and idx < len(row):
                cell_text = row[idx].strip()
                if cell_text and cell_text.lower() not in ('false', 'true', 'none', '-'):
                    qs = split_cell_into_questions(cell_text)
                    company_role_data[key][rnd_name].extend(qs)

    # Count occurrences across all questions to mark frequently asked questions as starred
    from collections import Counter
    q_counter = Counter()
    for (comp, role), rounds in company_role_data.items():
        for rnd_name, q_list in rounds.items():
            for q in q_list:
                norm_q = re.sub(r'[^a-z0-9]', '', q.lower())
                if len(norm_q) >= 4:
                    q_counter[norm_q] += 1

    # Build final structured output
    entries = []
    total_questions = 0

    for (comp, role), rounds in company_role_data.items():
        entry_rounds = []
        for _, rnd_name in ROUND_COLUMNS:
            q_list = rounds[rnd_name]
            if not q_list:
                continue

            # Deduplicate questions while preserving order within a round
            seen = set()
            clean_questions = []
            for q_text in q_list:
                norm_q = re.sub(r'[^a-z0-9]', '', q_text.lower())
                if norm_q in seen:
                    continue
                seen.add(norm_q)

                cat = "Group Discussion" if rnd_name == "Group Discussion" else ("Aptitude & Logic" if rnd_name == "Aptitude Test" else categorise_question(q_text))
                starred = q_counter[norm_q] >= 3 or any(w in q_text.lower() for w in ('tmay', 'tell me about yourself', 'walk me through your resume', 'strengths and weaknesses', 'why this role', 'why mba'))

                clean_questions.append({
                    "text": q_text,
                    "starred": starred,
                    "is_note": False,
                    "category": cat
                })
                total_questions += 1

            if clean_questions:
                entry_rounds.append({
                    "round": rnd_name,
                    "questions": clean_questions
                })

        if entry_rounds:
            entries.append({
                "company": comp,
                "company_slug": slugify(comp),
                "role": role,
                "category": categorise_question(role),
                "module": "PGDM 1",
                "rounds": entry_rounds
            })

    # Add general GD topics if present
    if gd_topics:
        gd_questions = []
        for t in gd_topics:
            t = t.strip(' "“”,')
            if len(t) > 5:
                gd_questions.append({
                    "text": t,
                    "starred": False,
                    "is_note": False,
                    "category": "Group Discussion"
                })
                total_questions += 1
        if gd_questions:
            entries.append({
                "company": "Campus GD Topics",
                "company_slug": "campus-gd-topics",
                "role": "Placement GD Topics",
                "category": "Group Discussion",
                "module": "PGDM 1",
                "rounds": [
                    {
                        "round": "Group Discussion",
                        "questions": gd_questions
                    }
                ]
            })

    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUT_FILE.write_text(json.dumps(entries, indent=2, ensure_ascii=False), encoding='utf-8')
    print(f"Successfully generated PGDM 1 Question Bank!")
    print(f"Total entries: {len(entries)}")
    print(f"Total questions: {total_questions}")
    print(f"Wrote to: {OUT_FILE}")

if __name__ == '__main__':
    main()
