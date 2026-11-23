"""Generates the sample upload files in public/samples/ (seeded, reproducible).

  cci-stem-connect-2025-sample.csv       a clean synthetic edition to try the upload with
  cci-stem-connect-2025-with-errors.csv  the same file with deliberate mistakes, to show row checks
  connectiq-template.csv                 the expected columns, with one attendee and one no-show

Run: python3 scripts/make-samples.py
"""
import csv, random
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / 'public' / 'samples'
OUT.mkdir(parents=True, exist_ok=True)
rng = random.Random(2025)

COLS = ['Attendee ID','Full Name','Gender','Category','STEM Field / Role','Years of Experience','Registration Date',
        'Checked In','Check-in Time','Attended Keynote','Attended Networking','Attended Panel','Breakout Track',
        'Questions Asked','Connections Made','Opportunities Explored','Follow-ups Within a Week',
        'Applied for an Opportunity','Connected with a Speaker','Joined CCI STEM Community','Posted on LinkedIn']
female = ['Adaeze','Amaka','Blessing','Bukola','Chioma','Damilola','Esther','Fatima','Folake','Grace','Halima','Ifeoma','Kemi',
          'Nkechi','Ngozi','Precious','Ruth','Temitope','Yetunde','Zainab','Chiamaka','Eniola','Ijeoma','Joy','Lara','Nneka','Simi','Tolani']
male = ['Ayomide','Babajide','Chidi','Chinedu','Daniel','David','Emeka','Femi','Ibrahim','Ifeanyi','Kelechi','Kunle','Musa','Nnamdi',
        'Obinna','Olumide','Segun','Seyi','Tobi','Uche','Victor','Yusuf','Bayo','Dayo','Ebuka','Gbenga','Ikenna','Tunde','Wale']
last = ['Adeyemi','Okafor','Balogun','Eze','Nwosu','Bello','Ajayi','Okeke','Salami','Uzor','Garba','Akinola','Ogunleye','Chukwu',
        'Danjuma','Fashola','Lawal','Obi','Yakubu','Abubakar','Okonkwo','Afolabi','Ibekwe','Oyelaran','Adebayo','Nwachukwu']
roles = ['Mathematics','Software Engineering','AI Engineering','Infrastructure Engineering','Mechanical Engineering',
         'Civil Engineering','Founder','Content Creation','Digital Consulting']
tracks = ['Science','Tech','Engineering','Maths']
names = set()

def name(g):
    while True:
        n = f"{rng.choice(female if g == 'Female' else male)} {rng.choice(last)}"
        if n not in names: names.add(n); return n
def yn(p): return 'Yes' if rng.random() < p else 'No'
def clamp(x, lo, hi): return max(lo, min(hi, x))

REGISTERED, ATTENDED = 280, 120
attend = set(rng.sample(range(1, REGISTERED + 1), ATTENDED))
rows = []
for i in range(1, REGISTERED + 1):
    g = rng.choice(['Male', 'Female'])
    cat = rng.choices(['Student', 'Graduate', 'Professional'], [50, 30, 20])[0]
    role = rng.choices(roles, [12, 18, 15, 8, 10, 10, 5, 12, 10])[0]
    if role == 'Founder' and cat == 'Student': cat = 'Graduate'
    yoe = 0 if cat == 'Student' else rng.choice([0, 1, 1, 2]) if cat == 'Graduate' else rng.randint(1, 10)
    r = dict.fromkeys(COLS, '')
    r.update({'Attendee ID': f'C25-{i:03d}', 'Full Name': name(g), 'Gender': g, 'Category': cat, 'STEM Field / Role': role,
              'Years of Experience': yoe, 'Registration Date': f'2025-11-{rng.randint(1, 20):02d}',
              'Checked In': 'Yes' if i in attend else 'No'})
    if i in attend:
        e = rng.random()
        # 2025 pattern: more people on time, and networking better attended than 2026.
        band = rng.choices(['early', 'mid', 'late'], [70, 22, 8])[0]
        t = rng.randint(840, 870) if band == 'early' else rng.randint(871, 914) if band == 'mid' else rng.randint(915, 942)
        networking = rng.random() < 0.92
        r.update({'Check-in Time': f'{t // 60:02d}:{t % 60:02d}',
                  'Attended Keynote': 'Yes' if t <= 875 or rng.random() < 0.4 else 'No',
                  'Attended Networking': 'Yes' if networking else 'No',
                  'Attended Panel': yn(0.9),
                  'Breakout Track': rng.choice(tracks) if rng.random() < 0.85 else 'Did not attend',
                  'Questions Asked': rng.choice([1, 1, 2]) if rng.random() < 0.12 + 0.1 * e else 0,
                  'Connections Made': clamp(round((3 + e * 10) if networking else e * 4), 0, 14),
                  'Opportunities Explored': clamp(round(e * 6 + rng.gauss(0, 1)), 0, 7),
                  'Follow-ups Within a Week': clamp(round(e * 7 + rng.gauss(0, 1.2)), 0, 10),
                  'Applied for an Opportunity': yn(0.12 + 0.45 * e), 'Connected with a Speaker': yn(0.1 + 0.45 * e),
                  'Joined CCI STEM Community': yn(0.25 + 0.4 * e), 'Posted on LinkedIn': yn(0.15 + 0.4 * e)})
    rows.append(r)

def write(path, data):
    with open(path, 'w', newline='') as f:
        w = csv.DictWriter(f, fieldnames=COLS); w.writeheader(); w.writerows(data)

write(OUT / 'cci-stem-connect-2025-sample.csv', rows)

# Same file with seven realistic mistakes on checked-in attendees.
broken = [dict(r) for r in rows]
att = [r for r in broken if r['Checked In'] == 'Yes']
mistakes = [
    ('Checked In', 'Maybe'),
    ('Check-in Time', ''),
    ('Breakout Track', 'Biology'),
    ('Category', 'Postgraduate'),
    ('Connections Made', 'lots'),
    ('Check-in Time', '25:10'),
]
for r, (col, val) in zip(att[3::15], mistakes): r[col] = val
broken[40]['Attendee ID'] = broken[10]['Attendee ID']   # a duplicate ID
write(OUT / 'cci-stem-connect-2025-with-errors.csv', broken)

write(OUT / 'connectiq-template.csv', [
    {**dict.fromkeys(COLS, ''), 'Attendee ID': 'CCI-001', 'Full Name': 'Ada Example', 'Gender': 'Female', 'Category': 'Graduate',
     'STEM Field / Role': 'Software Engineering', 'Years of Experience': 1, 'Registration Date': '2026-11-15', 'Checked In': 'Yes',
     'Check-in Time': '14:20', 'Attended Keynote': 'Yes', 'Attended Networking': 'Yes', 'Attended Panel': 'Yes',
     'Breakout Track': 'Tech', 'Questions Asked': 1, 'Connections Made': 8, 'Opportunities Explored': 3,
     'Follow-ups Within a Week': 4, 'Applied for an Opportunity': 'Yes', 'Connected with a Speaker': 'No',
     'Joined CCI STEM Community': 'Yes', 'Posted on LinkedIn': 'No'},
    {**dict.fromkeys(COLS, ''), 'Attendee ID': 'CCI-002', 'Full Name': 'Bayo Example', 'Gender': 'Male', 'Category': 'Student',
     'STEM Field / Role': 'Mathematics', 'Years of Experience': 0, 'Registration Date': '2026-11-16', 'Checked In': 'No'},
])
print('wrote', sorted(p.name for p in OUT.iterdir()), f'| {ATTENDED} of {REGISTERED} attended')
