import type { AreaDict } from "./index";

// Translations for the plan area. Keys are the exact English strings passed to t().
export const PLAN: AreaDict = {
  ms: {
    // Plan screen
    Plan: "Pelan",
    "Built from your profile and goal. Change your profile to update it.": "Dibina daripada profil dan matlamat anda. Tukar profil anda untuk mengemas kininya.",
    Training: "Latihan",
    Nutrition: "Pemakanan",
    "You're already clocked in": "Anda sudah daftar masuk",
    Split: "Pembahagian",
    "Using {name}.": "Menggunakan {name}.",
    "Days per week": "Hari seminggu",
    Today: "Hari ini",
    "{sets} sets × {reps} reps · rest {rest} · RIR {rir}": "{sets} set × {reps} ulangan · rehat {rest} · RIR {rir}",
    "Clock in & start": "Daftar masuk & mula",
    "How to progress": "Cara untuk maju",
    "Logged {name} · {kcal} kcal": "{name} direkodkan · {kcal} kcal",
    "Your daily targets": "Sasaran harian anda",
    "kcal / day": "kcal / hari",
    "Resting burn {bmr} kcal × activity {activity} = {tdee} kcal maintenance, adjusted for {goal}.":
      "Pembakaran rehat {bmr} kcal × aktiviti {activity} = {tdee} kcal penyelenggaraan, diselaraskan untuk {goal}.",
    "a 15% deficit (gentler during Ramadan)": "defisit 15% (lebih ringan semasa Ramadan)",
    "a 20% deficit to lose ~0.5 kg/week": "defisit 20% untuk turun ~0.5 kg/minggu",
    maintenance: "penyelenggaraan",
    "a 10% surplus for lean gains": "lebihan 10% untuk menambah otot",
    Protein: "Protein",
    Carbs: "Karbohidrat",
    Fat: "Lemak",
    "{pct}% of calories": "{pct}% kalori",
    "Fibre ≥ {fiber} g · Sugar ≤ {sugar} g · Sodium ≤ 2,000 mg · Water ~{water} L":
      "Serat ≥ {fiber} g · Gula ≤ {sugar} g · Natrium ≤ 2,000 mg · Air ~{water} L",
    "What to eat": "Apa yang perlu dimakan",
    "Sample day · {kcal} kcal · P {protein} g": "Contoh sehari · {kcal} kcal · P {protein} g",
    Log: "Rekod",
    "Log {name}": "Rekod {name}",
    "Timing & tips": "Masa & tip",
    "Ask the coach": "Tanya jurulatih",
    "Swap a meal, plan tomorrow, or ask about a hawker dish": "Tukar hidangan, rancang esok, atau tanya tentang makanan gerai",
    "General guidance, not medical advice. If you have a medical condition, are pregnant, or under 18, check with a doctor or dietitian.":
      "Panduan umum, bukan nasihat perubatan. Jika anda mempunyai masalah kesihatan, hamil, atau bawah 18 tahun, rujuk doktor atau pakar diet.",

    // Food groups (diet.ts)
    "Lean protein": "Protein tanpa lemak",
    "Builds and protects muscle and keeps you full. Have a palm-sized portion at every meal.":
      "Membina dan melindungi otot serta membuat anda kenyang. Ambil sebahagian sebesar tapak tangan setiap kali makan.",
    "Energy carbs": "Karbohidrat tenaga",
    "Smart carbs": "Karbohidrat pintar",
    "Fuel hard sessions and make the surplus easy to hit. Eat most of them around training.":
      "Membekalkan tenaga untuk sesi berat dan memudahkan lebihan kalori dicapai. Makan kebanyakannya sekitar waktu latihan.",
    "Fibre-rich carbs give steady energy. Put them around your workouts and keep portions to a fist.":
      "Karbohidrat kaya serat memberi tenaga yang stabil. Ambil sekitar waktu senaman dan hadkan sebesar penumbuk.",
    "Vegetables & fruit": "Sayur-sayuran & buah",
    "Vitamins, minerals and volume for few calories. Fill half your plate with vegetables.":
      "Vitamin, mineral dan isi padu dengan kalori yang rendah. Isi separuh pinggan dengan sayur.",
    "Healthy fats": "Lemak sihat",
    "Needed for hormones and absorbing vitamins. A thumb-sized portion per meal is enough.":
      "Diperlukan untuk hormon dan penyerapan vitamin. Sebahagian sebesar ibu jari setiap kali makan sudah cukup.",
    Limit: "Hadkan",
    "Easy to over-eat and low in nutrients. Keep them for occasional treats.":
      "Mudah dimakan berlebihan dan rendah nutrien. Simpan untuk sesekali sahaja.",

    // Sample day meals (diet.ts)
    Breakfast: "Sarapan",
    Lunch: "Makan tengah hari",
    "Pre-workout snack": "Snek sebelum senaman",
    Dinner: "Makan malam",
    "Post-workout / supper": "Selepas senaman / supper",
    Sahur: "Sahur",
    Iftar: "Iftar",
    Moreh: "Moreh",
    "First meal": "Hidangan pertama",
    Snack: "Snek",
    "Last meal": "Hidangan terakhir",
    "5:00 am": "5:00 pg",
    "7:30 am": "7:30 pg",
    "12:00 pm": "12:00 tgh",
    "12:30 pm": "12:30 tgh",
    "4:00 pm": "4:00 ptg",
    "7:25 pm": "7:25 mlm",
    "7:30 pm": "7:30 mlm",
    "9:30 pm": "9:30 mlm",
    "10:00 pm": "10:00 mlm",

    // Meal timing (diet.ts)
    "Eat slow carbs and protein before dawn: oats, wholemeal bread, eggs, yogurt. Skip salty and very sweet food so you stay less thirsty.":
      "Makan karbohidrat perlahan dan protein sebelum subuh: oat, roti mil penuh, telur, yogurt. Elakkan makanan masin dan terlalu manis supaya kurang dahaga.",
    "Break your fast with water and 2–3 dates, then a balanced plate: rice, lean protein and vegetables. Go easy on fried food and sweet drinks.":
      "Berbuka dengan air dan 2–3 biji kurma, kemudian sepinggan seimbang: nasi, protein tanpa lemak dan sayur. Kurangkan makanan bergoreng dan minuman manis.",
    "Lift about an hour before iftar or after tarawih. Keep sessions shorter and drop the volume, not the weight.":
      "Angkat beban kira-kira sejam sebelum berbuka atau selepas tarawih. Pendekkan sesi dan kurangkan isi padu, bukan beratnya.",
    Hydration: "Hidrasi",
    "Drink 2–3 litres between iftar and sahur — a glass every hour or so — rather than all at once.":
      "Minum 2–3 liter antara berbuka dan sahur — segelas setiap jam atau lebih — bukan sekali gus.",
    "Eating window": "Tempoh makan",
    "Eat between 12 pm and 8 pm. Water, black coffee and plain tea are fine while fasting.":
      "Makan antara 12 tengah hari dan 8 malam. Air, kopi O kosong dan teh kosong dibenarkan semasa berpuasa.",
    "Spread your protein over 2–3 meals in the window — at least 30 g each — to protect muscle.":
      "Agihkan protein kepada 2–3 hidangan dalam tempoh makan — sekurang-kurangnya 30 g setiap satu — untuk melindungi otot.",
    "Train in the window if you can, or have your first meal soon after a morning session.":
      "Berlatih dalam tempoh makan jika boleh, atau ambil hidangan pertama sejurus selepas sesi pagi.",
    "Drink about 35 ml per kg of body weight a day, including during the fast.":
      "Minum kira-kira 35 ml bagi setiap kg berat badan sehari, termasuk semasa berpuasa.",
    "Before training (1–2 h)": "Sebelum latihan (1–2 j)",
    "Carbs + some protein, low fat: rice with chicken, oats with yogurt, or a banana with a protein shake.":
      "Karbohidrat + sedikit protein, rendah lemak: nasi dengan ayam, oat dengan yogurt, atau pisang dengan minuman protein.",
    "After training (within 2 h)": "Selepas latihan (dalam 2 j)",
    "20–40 g protein plus carbs to refill glycogen: chicken rice, tuna sandwich, or a shake with fruit.":
      "20–40 g protein serta karbohidrat untuk mengisi semula glikogen: nasi ayam, sandwic tuna, atau minuman protein dengan buah.",
    "Drink about 35 ml per kg of body weight a day, plus 500–750 ml for each hour of training in Malaysia's heat.":
      "Minum kira-kira 35 ml bagi setiap kg berat badan sehari, serta 500–750 ml untuk setiap jam latihan dalam cuaca panas Malaysia.",
    "Cutting tips": "Tip menurunkan lemak",
    "Order 'kurang manis' or 'kosong' drinks, choose soup over fried noodles, and double the vegetables at the economy rice stall.":
      "Pesan minuman 'kurang manis' atau 'kosong', pilih sup berbanding mi goreng, dan gandakan sayur di gerai nasi campur.",
    "Bulking tips": "Tip menambah berat",
    "Add an extra scoop of rice, drink milk with meals, and keep easy snacks (nuts, bread with peanut butter) on hand.":
      "Tambah satu senduk nasi, minum susu ketika makan, dan sediakan snek mudah (kekacang, roti dengan mentega kacang).",
    "Maintenance tips": "Tip mengekalkan berat",
    "Use the 80/20 rule: whole foods most of the time, favourite hawker meals in moderation.":
      "Gunakan peraturan 80/20: makanan asli pada kebanyakan masa, makanan gerai kegemaran secara sederhana.",

    // BMI bands (recommend.ts)
    Underweight: "Kurang berat badan",
    Healthy: "Normal",
    Overweight: "Berlebihan berat badan",
    Obese: "Obes",

    // Body check (recommend.ts)
    "Gaining about {kg} kg, mostly muscle, would bring you into the healthy range.":
      "Menambah kira-kira {kg} kg, kebanyakannya otot, akan membawa anda ke julat sihat.",
    "You're in the healthy range, so you can focus on building muscle with a small surplus.":
      "Anda berada dalam julat sihat, jadi anda boleh fokus membina otot dengan sedikit lebihan kalori.",
    "You're in the healthy range. Keep your weight steady and build strength to tone up.":
      "Anda berada dalam julat sihat. Kekalkan berat badan dan bina kekuatan untuk badan lebih tegap.",
    "Losing about {kg} kg would bring you into the healthy range. At 0.5 kg a week that's around {weeks} weeks.":
      "Menurunkan kira-kira {kg} kg akan membawa anda ke julat sihat. Pada kadar 0.5 kg seminggu, itu sekitar {weeks} minggu.",
    "Full-body strength 3× a week + daily low-impact cardio": "Kekuatan seluruh badan 3× seminggu + kardio impak rendah setiap hari",
    "Start with low-impact cardio that's easy on the knees: brisk walking, cycling or swimming, building to 150–300 minutes a week.":
      "Mulakan dengan kardio impak rendah yang mesra lutut: jalan pantas, berbasikal atau berenang, sehingga 150–300 minit seminggu.",
    "Lift 3× a week with full-body sessions (machines and dumbbells are fine) to keep muscle while you lose fat.":
      "Angkat beban 3× seminggu dengan sesi seluruh badan (mesin dan dumbel pun boleh) untuk mengekalkan otot semasa membakar lemak.",
    "Aim for 7,000–10,000 steps a day. Everyday movement burns more than most workouts.":
      "Sasarkan 7,000–10,000 langkah sehari. Pergerakan harian membakar lebih banyak daripada kebanyakan senaman.",
    "Increase intensity slowly; if you have joint pain or a medical condition, check with a doctor first.":
      "Tingkatkan intensiti secara perlahan; jika anda mengalami sakit sendi atau masalah kesihatan, rujuk doktor dahulu.",
    "Upper / Lower 4× a week + 150 min cardio": "Atas / Bawah 4× seminggu + 150 min kardio",
    "Lift 4× a week on an upper/lower split, keeping the weights heavy so your body holds on to muscle.":
      "Angkat beban 4× seminggu dengan pembahagian atas/bawah, kekalkan beban berat supaya badan mengekalkan otot.",
    "Add 150 minutes of moderate cardio a week: a 20–30 min incline walk or bike after lifting works well.":
      "Tambah 150 minit kardio sederhana seminggu: jalan mendaki atau basikal 20–30 min selepas angkat beban sangat sesuai.",
    "One or two HIIT sessions a week (sprints, rowing intervals) help if you enjoy them; they aren't required.":
      "Satu atau dua sesi HIIT seminggu (pecutan, selang mendayung) membantu jika anda gemar; ia tidak wajib.",
    "Keep 8,000–10,000 steps a day.": "Kekalkan 8,000–10,000 langkah sehari.",
    "Heavy full-body lifting 3× a week, light cardio only": "Angkat beban berat seluruh badan 3× seminggu, kardio ringan sahaja",
    "Focus on big compound lifts (squat, bench press, row, deadlift, overhead press) in the 6–10 rep range.":
      "Fokus pada angkatan kompaun utama (squat, bench press, row, deadlift, overhead press) dalam julat 6–10 ulangan.",
    "Add a little weight or a rep every week; that progression is what builds muscle.":
      "Tambah sedikit beban atau satu ulangan setiap minggu; kemajuan itulah yang membina otot.",
    "Keep cardio light (walks, sport for fun) so you don't burn the calories you need to grow.":
      "Pastikan kardio ringan (berjalan, sukan suka-suka) supaya anda tidak membakar kalori yang diperlukan untuk membesar.",
    "Sleep 7–9 hours; most muscle is built while you recover.": "Tidur 7–9 jam; kebanyakan otot dibina semasa anda pulih.",
    "Body-part split 5× a week (Chest · Back · Legs · Shoulders · Arms)": "Pembahagian bahagian badan 5× seminggu (Dada · Belakang · Kaki · Bahu · Lengan)",
    "Train each muscle with 10–20 hard sets a week, stopping 1–2 reps short of failure.":
      "Latih setiap otot dengan 10–20 set berat seminggu, berhenti 1–2 ulangan sebelum gagal.",
    "Use progressive overload: add weight once you hit the top of the rep range on every set.":
      "Gunakan beban progresif: tambah beban apabila anda mencapai had atas julat ulangan pada setiap set.",
    "Keep cardio to 2 short sessions a week for heart health.": "Hadkan kardio kepada 2 sesi pendek seminggu untuk kesihatan jantung.",
    "Upper / Lower 4× a week + 2 cardio sessions": "Atas / Bawah 4× seminggu + 2 sesi kardio",
    "Four lifting sessions a week build strength and a toned, athletic look.":
      "Empat sesi angkat beban seminggu membina kekuatan dan rupa badan yang tegap dan atletik.",
    "Add two 20–30 min cardio sessions for heart health and recovery.":
      "Tambah dua sesi kardio 20–30 min untuk kesihatan jantung dan pemulihan.",
    "Track your lifts; getting stronger at the same body weight means you're recomposing.":
      "Rekod angkatan anda; menjadi lebih kuat pada berat badan yang sama bermakna komposisi badan anda sedang berubah.",
    "{kcal} kcal a day · {protein} g protein": "{kcal} kcal sehari · {protein} g protein",
    "Fill half your plate with vegetables and a quarter with lean protein, and keep rice or noodles to a fist-sized portion.":
      "Isi separuh pinggan dengan sayur dan suku dengan protein tanpa lemak, dan hadkan nasi atau mi sebesar penumbuk.",
    "Swap sweet drinks for kosong / kurang manis; a teh tarik is about 185 kcal.":
      "Tukar minuman manis kepada kosong / kurang manis; segelas teh tarik kira-kira 185 kcal.",
    "Choose soup or grilled dishes over fried and santan-heavy ones at the hawker stall.":
      "Pilih hidangan bersup atau dibakar berbanding yang bergoreng dan bersantan di gerai.",
    "Eat 4–5 times a day; add an extra scoop of rice and a glass of milk to meals.":
      "Makan 4–5 kali sehari; tambah satu senduk nasi dan segelas susu pada hidangan.",
    "Have 20–40 g protein at every meal, plus a shake after training if you're short.":
      "Ambil 20–40 g protein setiap kali makan, serta minuman protein selepas latihan jika tidak cukup.",
    "Calorie-dense healthy snacks help: nuts, peanut butter toast, bananas, dates.":
      "Snek sihat yang tinggi kalori membantu: kekacang, roti bakar mentega kacang, pisang, kurma.",
    "Build meals around protein and vegetables; adjust carbs to how active the day is.":
      "Bina hidangan berasaskan protein dan sayur; laraskan karbohidrat mengikut tahap aktiviti hari itu.",
    "Follow the 80/20 rule: whole foods most of the time, your favourite hawker meals in moderation.":
      "Ikut peraturan 80/20: makanan asli pada kebanyakan masa, makanan gerai kegemaran anda secara sederhana.",
    "Spread protein across the day, 3–4 meals with 25–40 g each.": "Agihkan protein sepanjang hari, 3–4 hidangan dengan 25–40 g setiap satu.",
    "BMI doesn't separate muscle from fat. If you lift seriously, a high BMI may be muscle, so waist size and how you look and feel are better guides.":
      "BMI tidak membezakan otot dan lemak. Jika anda serius mengangkat beban, BMI tinggi mungkin disebabkan otot, jadi ukuran pinggang serta rupa dan perasaan anda adalah panduan yang lebih baik.",

    // Body check sheet
    "Lose fat": "Bakar lemak",
    "Maintain & tone": "Kekal & tegapkan",
    "Build muscle": "Bina otot",
    "Plan updated from your body check": "Pelan dikemas kini daripada semakan badan anda",
    "Body check": "Semakan badan",
    "Enter your height and weight to see your BMI (body mass index) and what to train and eat.":
      "Masukkan tinggi dan berat anda untuk melihat BMI (indeks jisim badan) serta latihan dan makanan yang sesuai.",
    Height: "Tinggi",
    Weight: "Berat",
    "Enter a height between 120 and 230 cm and a weight between 30 and 300 kg.":
      "Masukkan tinggi antara 120 dan 230 cm dan berat antara 30 dan 300 kg.",
    "BMI = weight ÷ height² = {weight} ÷ {height}²": "BMI = berat ÷ tinggi² = {weight} ÷ {height}²",
    "Healthy weight for {height} cm:": "Berat sihat untuk {height} cm:",
    "lose {kg} kg to get there (~{weeks} weeks)": "turunkan {kg} kg untuk mencapainya (~{weeks} minggu)",
    "gain {kg} kg to get there (~{weeks} weeks)": "tambah {kg} kg untuk mencapainya (~{weeks} minggu)",
    "Recommended for you": "Disyorkan untuk anda",
    Goal: "Matlamat",
    "Carbs {carbs} g · Fat {fat} g · Fibre ≥ {fiber} g": "Karbohidrat {carbs} g · Lemak {fat} g · Serat ≥ {fiber} g",
    "Use this plan": "Guna pelan ini",
    "Updates your height, weight, goal and training split. You can change them any time in Profile and Plan.":
      "Mengemas kini tinggi, berat, matlamat dan pembahagian latihan anda. Anda boleh menukarnya bila-bila masa di Profil dan Pelan.",
    "Uses the Asia-Pacific BMI bands (healthy 18.5–22.9). Calories also use your age ({age}) and sex from Profile.":
      "Menggunakan julat BMI Asia-Pasifik (sihat 18.5–22.9). Kalori juga menggunakan umur ({age}) dan jantina anda daripada Profil.",

    // Training plan content shown on this screen (from fitness.ts constants)
    Recommended: "Disyorkan",
    "Picked from your days per week and experience.": "Dipilih berdasarkan hari seminggu dan pengalaman anda.",
    "Body-part split": "Pembahagian bahagian badan",
    "Chest · Back · Legs · Shoulders · Arms — one muscle group per day.": "Dada · Belakang · Kaki · Bahu · Lengan — satu kumpulan otot sehari.",
    "Push / Pull / Legs": "Tolak / Tarik / Kaki",
    "Pushing muscles, pulling muscles, then legs.": "Otot menolak, otot menarik, kemudian kaki.",
    "Upper / Lower": "Atas / Bawah",
    "Alternate upper body and lower body days.": "Selang-seli hari badan atas dan badan bawah.",
    "Full body": "Seluruh badan",
    "Every session trains the whole body. Best for 2–3 days.": "Setiap sesi melatih seluruh badan. Terbaik untuk 2–3 hari.",
    Mon: "Isn",
    Tue: "Sel",
    Wed: "Rab",
    Thu: "Kha",
    Fri: "Jum",
    Sat: "Sab",
    Sun: "Ahd",
    "Chest Day": "Hari Dada",
    "Chest · Triceps": "Dada · Trisep",
    "Back Day": "Hari Belakang",
    "Back · Rear delts": "Belakang · Delt belakang",
    "Leg Day": "Hari Kaki",
    "Quads · Hamstrings · Glutes · Calves": "Kuadrisep · Hamstring · Glutes · Betis",
    "Shoulder Day": "Hari Bahu",
    "Delts · Traps · Core": "Delt · Trapezius · Teras",
    "Shoulders & Arms": "Bahu & Lengan",
    "Delts · Biceps · Triceps": "Delt · Bisep · Trisep",
    "Arm Day": "Hari Lengan",
    "Biceps · Triceps · Forearms": "Bisep · Trisep · Lengan bawah",
    Push: "Tolak",
    "Chest · Shoulders · Triceps": "Dada · Bahu · Trisep",
    Pull: "Tarik",
    "Back · Biceps · Rear delts": "Belakang · Bisep · Delt belakang",
    Legs: "Kaki",
    "Quads · Hamstrings · Glutes": "Kuadrisep · Hamstring · Glutes",
    "Upper A": "Atas A",
    "Strength focus": "Fokus kekuatan",
    "Lower A": "Bawah A",
    "Squat focus": "Fokus squat",
    "Upper B": "Atas B",
    "Hypertrophy focus": "Fokus hipertrofi",
    "Lower B": "Bawah B",
    "Hinge focus": "Fokus hinge",
    "Full Body A": "Seluruh Badan A",
    "Squat · Press · Row": "Squat · Tekan · Row",
    "Full Body B": "Seluruh Badan B",
    "Hinge · Pull · Press": "Hinge · Tarik · Tekan",
    "Full Body C": "Seluruh Badan C",
    "Legs · Push · Pull": "Kaki · Tolak · Tarik",
    "Finish with 15–20 min incline walk or bike (zone 2)": "Akhiri dengan 15–20 min jalan mendaki atau basikal (zon 2)",
    "Optional: 10–15 min easy cardio": "Pilihan: 10–15 min kardio ringan",
    "Warm up 5–10 min, then do 1–2 lighter ramp-up sets before your first heavy exercise.":
      "Panaskan badan 5–10 min, kemudian buat 1–2 set ringan sebelum senaman berat pertama.",
    "Progressive overload: when you hit the top of the rep range on every set, add 2.5 kg (upper) or 5 kg (lower) next time.":
      "Beban progresif: apabila anda mencapai had atas julat ulangan pada setiap set, tambah 2.5 kg (atas) atau 5 kg (bawah) pada sesi seterusnya.",
    'RIR = reps in reserve. "1–2" means stop each set with 1–2 good reps still in the tank.':
      'RIR = ulangan simpanan. "1–2" bermaksud hentikan setiap set dengan 1–2 ulangan baik masih berbaki.',
    "Keep lifting heavy while cutting — it's what tells your body to keep its muscle. Aim for 8–10k steps a day.":
      "Teruskan angkat beban berat semasa menurunkan lemak — itulah yang memberitahu badan untuk mengekalkan otot. Sasarkan 8–10 ribu langkah sehari.",
    "Eat in a small surplus and sleep 7–9 hours. Expect about 0.25–0.5% bodyweight gain per week.":
      "Makan dengan sedikit lebihan kalori dan tidur 7–9 jam. Jangkakan kenaikan kira-kira 0.25–0.5% berat badan seminggu.",
    "Train consistently and keep protein high to slowly recompose your body.":
      "Berlatih secara konsisten dan kekalkan protein tinggi untuk mengubah komposisi badan secara perlahan.",
    "Every 6–8 weeks take a lighter deload week (half the sets) to recover.":
      "Setiap 6–8 minggu, ambil seminggu deload yang lebih ringan (separuh set) untuk pulih.",
  },
  zh: {
    // Plan screen
    Plan: "计划",
    "Built from your profile and goal. Change your profile to update it.": "根据你的个人资料和目标制定。修改个人资料即可更新。",
    Training: "训练",
    Nutrition: "营养",
    "You're already clocked in": "你已经签到了",
    Split: "训练分化",
    "Using {name}.": "使用{name}。",
    "Days per week": "每周天数",
    Today: "今天",
    "{sets} sets × {reps} reps · rest {rest} · RIR {rir}": "{sets} 组 × {reps} 次 · 休息 {rest} · RIR {rir}",
    "Clock in & start": "签到并开始",
    "How to progress": "如何进步",
    "Logged {name} · {kcal} kcal": "已记录{name} · {kcal} kcal",
    "Your daily targets": "你的每日目标",
    "kcal / day": "kcal / 天",
    "Resting burn {bmr} kcal × activity {activity} = {tdee} kcal maintenance, adjusted for {goal}.":
      "静息消耗 {bmr} kcal × 活动系数 {activity} = {tdee} kcal 维持热量，并按{goal}调整。",
    "a 15% deficit (gentler during Ramadan)": "15% 热量缺口（斋月期间较温和）",
    "a 20% deficit to lose ~0.5 kg/week": "20% 热量缺口，每周减约 0.5 kg",
    maintenance: "维持",
    "a 10% surplus for lean gains": "10% 热量盈余，增加精瘦肌肉",
    Protein: "蛋白质",
    Carbs: "碳水化合物",
    Fat: "脂肪",
    "{pct}% of calories": "占热量 {pct}%",
    "Fibre ≥ {fiber} g · Sugar ≤ {sugar} g · Sodium ≤ 2,000 mg · Water ~{water} L":
      "纤维 ≥ {fiber} g · 糖 ≤ {sugar} g · 钠 ≤ 2,000 mg · 水 ~{water} L",
    "What to eat": "吃什么",
    "Sample day · {kcal} kcal · P {protein} g": "示例一天 · {kcal} kcal · 蛋白质 {protein} g",
    Log: "记录",
    "Log {name}": "记录{name}",
    "Timing & tips": "时间与建议",
    "Ask the coach": "询问教练",
    "Swap a meal, plan tomorrow, or ask about a hawker dish": "换一餐、规划明天，或询问小贩美食",
    "General guidance, not medical advice. If you have a medical condition, are pregnant, or under 18, check with a doctor or dietitian.":
      "仅为一般建议，并非医疗建议。如有疾病、怀孕或未满 18 岁，请咨询医生或营养师。",

    // Food groups (diet.ts)
    "Lean protein": "瘦肉蛋白",
    "Builds and protects muscle and keeps you full. Have a palm-sized portion at every meal.":
      "增肌护肌，增加饱腹感。每餐吃一掌心大小的份量。",
    "Energy carbs": "能量碳水",
    "Smart carbs": "优质碳水",
    "Fuel hard sessions and make the surplus easy to hit. Eat most of them around training.":
      "为高强度训练供能，更容易达到热量盈余。大部分安排在训练前后吃。",
    "Fibre-rich carbs give steady energy. Put them around your workouts and keep portions to a fist.":
      "高纤维碳水提供稳定能量。安排在训练前后，份量控制在一拳大小。",
    "Vegetables & fruit": "蔬菜和水果",
    "Vitamins, minerals and volume for few calories. Fill half your plate with vegetables.":
      "热量低，富含维生素、矿物质，饱腹感强。蔬菜占餐盘的一半。",
    "Healthy fats": "健康脂肪",
    "Needed for hormones and absorbing vitamins. A thumb-sized portion per meal is enough.":
      "对激素和维生素吸收必不可少。每餐一拇指大小的份量就够了。",
    Limit: "少吃",
    "Easy to over-eat and low in nutrients. Keep them for occasional treats.": "容易吃多且营养少。偶尔解馋即可。",

    // Sample day meals (diet.ts)
    Breakfast: "早餐",
    Lunch: "午餐",
    "Pre-workout snack": "训练前加餐",
    Dinner: "晚餐",
    "Post-workout / supper": "训练后 / 宵夜",
    Sahur: "封斋饭",
    Iftar: "开斋",
    Moreh: "夜宵（Moreh）",
    "First meal": "第一餐",
    Snack: "加餐",
    "Last meal": "最后一餐",
    "5:00 am": "上午 5:00",
    "7:30 am": "上午 7:30",
    "12:00 pm": "中午 12:00",
    "12:30 pm": "中午 12:30",
    "4:00 pm": "下午 4:00",
    "7:25 pm": "晚上 7:25",
    "7:30 pm": "晚上 7:30",
    "9:30 pm": "晚上 9:30",
    "10:00 pm": "晚上 10:00",

    // Meal timing (diet.ts)
    "Eat slow carbs and protein before dawn: oats, wholemeal bread, eggs, yogurt. Skip salty and very sweet food so you stay less thirsty.":
      "黎明前吃慢消化碳水和蛋白质：燕麦、全麦面包、鸡蛋、酸奶。避免太咸太甜的食物，以减少口渴。",
    "Break your fast with water and 2–3 dates, then a balanced plate: rice, lean protein and vegetables. Go easy on fried food and sweet drinks.":
      "先用水和 2–3 颗椰枣开斋，再吃均衡的一餐：米饭、瘦肉蛋白和蔬菜。少吃油炸食物和甜饮。",
    "Lift about an hour before iftar or after tarawih. Keep sessions shorter and drop the volume, not the weight.":
      "在开斋前约一小时或晚间礼拜（tarawih）后训练。缩短训练时间，减少训练量而不是重量。",
    Hydration: "补水",
    "Drink 2–3 litres between iftar and sahur — a glass every hour or so — rather than all at once.":
      "在开斋到封斋饭之间喝 2–3 升水——大约每小时一杯——不要一次喝完。",
    "Eating window": "进食窗口",
    "Eat between 12 pm and 8 pm. Water, black coffee and plain tea are fine while fasting.":
      "在中午 12 点到晚上 8 点之间进食。禁食期间可以喝水、黑咖啡和无糖茶。",
    "Spread your protein over 2–3 meals in the window — at least 30 g each — to protect muscle.":
      "在进食窗口内把蛋白质分配到 2–3 餐——每餐至少 30 g——以保护肌肉。",
    "Train in the window if you can, or have your first meal soon after a morning session.":
      "尽量在进食窗口内训练，或在早上训练后尽快吃第一餐。",
    "Drink about 35 ml per kg of body weight a day, including during the fast.": "每天按每公斤体重约 35 ml 饮水，禁食期间也一样。",
    "Before training (1–2 h)": "训练前（1–2 小时）",
    "Carbs + some protein, low fat: rice with chicken, oats with yogurt, or a banana with a protein shake.":
      "碳水 + 少量蛋白质，低脂：鸡肉饭、燕麦配酸奶，或香蕉配蛋白奶昔。",
    "After training (within 2 h)": "训练后（2 小时内）",
    "20–40 g protein plus carbs to refill glycogen: chicken rice, tuna sandwich, or a shake with fruit.":
      "20–40 g 蛋白质加碳水补充糖原：鸡饭、金枪鱼三明治，或蛋白奶昔配水果。",
    "Drink about 35 ml per kg of body weight a day, plus 500–750 ml for each hour of training in Malaysia's heat.":
      "每天按每公斤体重约 35 ml 饮水，在马来西亚的炎热天气中每训练一小时再加 500–750 ml。",
    "Cutting tips": "减脂建议",
    "Order 'kurang manis' or 'kosong' drinks, choose soup over fried noodles, and double the vegetables at the economy rice stall.":
      "点饮料时选少甜（kurang manis）或无糖（kosong），选汤面而不是炒面，在经济饭摊多加一份蔬菜。",
    "Bulking tips": "增肌建议",
    "Add an extra scoop of rice, drink milk with meals, and keep easy snacks (nuts, bread with peanut butter) on hand.":
      "多加一勺饭，用餐时喝牛奶，随身备好方便的零食（坚果、花生酱面包）。",
    "Maintenance tips": "维持建议",
    "Use the 80/20 rule: whole foods most of the time, favourite hawker meals in moderation.":
      "遵循 80/20 原则：大部分时间吃天然食物，适量享用喜爱的小贩美食。",

    // BMI bands (recommend.ts)
    Underweight: "体重过轻",
    Healthy: "正常",
    Overweight: "超重",
    Obese: "肥胖",

    // Body check (recommend.ts)
    "Gaining about {kg} kg, mostly muscle, would bring you into the healthy range.": "增加约 {kg} kg（主要是肌肉）即可进入健康范围。",
    "You're in the healthy range, so you can focus on building muscle with a small surplus.":
      "你处于健康范围，可以通过少量热量盈余专注增肌。",
    "You're in the healthy range. Keep your weight steady and build strength to tone up.":
      "你处于健康范围。保持体重稳定，增强力量来塑形。",
    "Losing about {kg} kg would bring you into the healthy range. At 0.5 kg a week that's around {weeks} weeks.":
      "减掉约 {kg} kg 即可进入健康范围。按每周 0.5 kg 计算，大约需要 {weeks} 周。",
    "Full-body strength 3× a week + daily low-impact cardio": "每周 3 次全身力量训练 + 每天低冲击有氧",
    "Start with low-impact cardio that's easy on the knees: brisk walking, cycling or swimming, building to 150–300 minutes a week.":
      "从对膝盖友好的低冲击有氧开始：快走、骑车或游泳，逐步增加到每周 150–300 分钟。",
    "Lift 3× a week with full-body sessions (machines and dumbbells are fine) to keep muscle while you lose fat.":
      "每周进行 3 次全身力量训练（器械和哑铃都可以），在减脂的同时保住肌肉。",
    "Aim for 7,000–10,000 steps a day. Everyday movement burns more than most workouts.":
      "每天目标 7,000–10,000 步。日常活动消耗的热量比大多数训练还多。",
    "Increase intensity slowly; if you have joint pain or a medical condition, check with a doctor first.":
      "循序渐进地提高强度；如有关节疼痛或疾病，请先咨询医生。",
    "Upper / Lower 4× a week + 150 min cardio": "上/下肢分化每周 4 次 + 150 分钟有氧",
    "Lift 4× a week on an upper/lower split, keeping the weights heavy so your body holds on to muscle.":
      "每周 4 次上/下肢分化训练，保持大重量，让身体留住肌肉。",
    "Add 150 minutes of moderate cardio a week: a 20–30 min incline walk or bike after lifting works well.":
      "每周增加 150 分钟中等强度有氧：力量训练后坡度走或骑车 20–30 分钟效果很好。",
    "One or two HIIT sessions a week (sprints, rowing intervals) help if you enjoy them; they aren't required.":
      "如果喜欢，每周一两次 HIIT（冲刺、划船间歇）会有帮助，但不是必须的。",
    "Keep 8,000–10,000 steps a day.": "每天保持 8,000–10,000 步。",
    "Heavy full-body lifting 3× a week, light cardio only": "每周 3 次大重量全身训练，只做轻度有氧",
    "Focus on big compound lifts (squat, bench press, row, deadlift, overhead press) in the 6–10 rep range.":
      "专注于大型复合动作（深蹲、卧推、划船、硬拉、推举），每组 6–10 次。",
    "Add a little weight or a rep every week; that progression is what builds muscle.": "每周增加一点重量或多做一次，这种渐进才能增肌。",
    "Keep cardio light (walks, sport for fun) so you don't burn the calories you need to grow.":
      "有氧保持轻松（散步、休闲运动），以免消耗增肌所需的热量。",
    "Sleep 7–9 hours; most muscle is built while you recover.": "睡 7–9 小时；肌肉大多在恢复时生长。",
    "Body-part split 5× a week (Chest · Back · Legs · Shoulders · Arms)": "部位分化每周 5 次（胸 · 背 · 腿 · 肩 · 手臂）",
    "Train each muscle with 10–20 hard sets a week, stopping 1–2 reps short of failure.":
      "每块肌肉每周练 10–20 个高强度组，每组在力竭前 1–2 次停止。",
    "Use progressive overload: add weight once you hit the top of the rep range on every set.":
      "采用渐进超负荷：每组都达到次数范围上限后再加重量。",
    "Keep cardio to 2 short sessions a week for heart health.": "有氧每周 2 次短时训练，保持心脏健康。",
    "Upper / Lower 4× a week + 2 cardio sessions": "上/下肢分化每周 4 次 + 2 次有氧",
    "Four lifting sessions a week build strength and a toned, athletic look.": "每周 4 次力量训练，增强力量，打造紧实健美的身材。",
    "Add two 20–30 min cardio sessions for heart health and recovery.": "增加两次 20–30 分钟的有氧，有益心脏健康和恢复。",
    "Track your lifts; getting stronger at the same body weight means you're recomposing.":
      "记录你的训练重量；体重不变而力量变强，说明身体成分在改善。",
    "{kcal} kcal a day · {protein} g protein": "每天 {kcal} kcal · 蛋白质 {protein} g",
    "Fill half your plate with vegetables and a quarter with lean protein, and keep rice or noodles to a fist-sized portion.":
      "餐盘一半放蔬菜，四分之一放瘦肉蛋白，米饭或面条控制在一拳大小。",
    "Swap sweet drinks for kosong / kurang manis; a teh tarik is about 185 kcal.":
      "把甜饮换成无糖（kosong）或少甜（kurang manis）；一杯拉茶约 185 kcal。",
    "Choose soup or grilled dishes over fried and santan-heavy ones at the hawker stall.": "在小贩摊选择汤类或烧烤菜，少选油炸和多椰浆的。",
    "Eat 4–5 times a day; add an extra scoop of rice and a glass of milk to meals.": "每天吃 4–5 餐；每餐多加一勺饭和一杯牛奶。",
    "Have 20–40 g protein at every meal, plus a shake after training if you're short.":
      "每餐摄入 20–40 g 蛋白质，不够的话训练后加一杯蛋白奶昔。",
    "Calorie-dense healthy snacks help: nuts, peanut butter toast, bananas, dates.": "高热量的健康零食有帮助：坚果、花生酱吐司、香蕉、椰枣。",
    "Build meals around protein and vegetables; adjust carbs to how active the day is.": "以蛋白质和蔬菜为主搭配餐食；根据当天活动量调整碳水。",
    "Follow the 80/20 rule: whole foods most of the time, your favourite hawker meals in moderation.":
      "遵循 80/20 原则：大部分时间吃天然食物，适量享用你喜爱的小贩美食。",
    "Spread protein across the day, 3–4 meals with 25–40 g each.": "把蛋白质分配到全天 3–4 餐，每餐 25–40 g。",
    "BMI doesn't separate muscle from fat. If you lift seriously, a high BMI may be muscle, so waist size and how you look and feel are better guides.":
      "BMI 无法区分肌肉和脂肪。如果你认真练力量，较高的 BMI 可能来自肌肉，因此腰围以及外观和自我感觉是更好的参考。",

    // Body check sheet
    "Lose fat": "减脂",
    "Maintain & tone": "维持并塑形",
    "Build muscle": "增肌",
    "Plan updated from your body check": "已根据身体检查更新计划",
    "Body check": "身体检查",
    "Enter your height and weight to see your BMI (body mass index) and what to train and eat.":
      "输入身高和体重，查看你的 BMI（身体质量指数）以及该如何训练和饮食。",
    Height: "身高",
    Weight: "体重",
    "Enter a height between 120 and 230 cm and a weight between 30 and 300 kg.": "请输入 120 至 230 cm 之间的身高和 30 至 300 kg 之间的体重。",
    "BMI = weight ÷ height² = {weight} ÷ {height}²": "BMI = 体重 ÷ 身高² = {weight} ÷ {height}²",
    "Healthy weight for {height} cm:": "{height} cm 的健康体重：",
    "lose {kg} kg to get there (~{weeks} weeks)": "需减 {kg} kg（约 {weeks} 周）",
    "gain {kg} kg to get there (~{weeks} weeks)": "需增 {kg} kg（约 {weeks} 周）",
    "Recommended for you": "为你推荐",
    Goal: "目标",
    "Carbs {carbs} g · Fat {fat} g · Fibre ≥ {fiber} g": "碳水 {carbs} g · 脂肪 {fat} g · 纤维 ≥ {fiber} g",
    "Use this plan": "使用此计划",
    "Updates your height, weight, goal and training split. You can change them any time in Profile and Plan.":
      "将更新你的身高、体重、目标和训练分化。你可以随时在“个人资料”和“计划”中修改。",
    "Uses the Asia-Pacific BMI bands (healthy 18.5–22.9). Calories also use your age ({age}) and sex from Profile.":
      "采用亚太地区 BMI 标准（健康 18.5–22.9）。热量计算还会用到个人资料中的年龄（{age}）和性别。",

    // Training plan content shown on this screen (from fitness.ts constants)
    Recommended: "推荐",
    "Picked from your days per week and experience.": "根据你的每周训练天数和经验选择。",
    "Body-part split": "部位分化",
    "Chest · Back · Legs · Shoulders · Arms — one muscle group per day.": "胸 · 背 · 腿 · 肩 · 手臂——每天练一个肌群。",
    "Push / Pull / Legs": "推 / 拉 / 腿",
    "Pushing muscles, pulling muscles, then legs.": "先练推的肌群，再练拉的肌群，然后练腿。",
    "Upper / Lower": "上肢 / 下肢",
    "Alternate upper body and lower body days.": "上肢日和下肢日交替进行。",
    "Full body": "全身",
    "Every session trains the whole body. Best for 2–3 days.": "每次训练全身。最适合每周 2–3 天。",
    Mon: "周一",
    Tue: "周二",
    Wed: "周三",
    Thu: "周四",
    Fri: "周五",
    Sat: "周六",
    Sun: "周日",
    "Chest Day": "胸部日",
    "Chest · Triceps": "胸 · 肱三头肌",
    "Back Day": "背部日",
    "Back · Rear delts": "背 · 三角肌后束",
    "Leg Day": "腿部日",
    "Quads · Hamstrings · Glutes · Calves": "股四头肌 · 腘绳肌 · 臀肌 · 小腿",
    "Shoulder Day": "肩部日",
    "Delts · Traps · Core": "三角肌 · 斜方肌 · 核心",
    "Shoulders & Arms": "肩部和手臂",
    "Delts · Biceps · Triceps": "三角肌 · 肱二头肌 · 肱三头肌",
    "Arm Day": "手臂日",
    "Biceps · Triceps · Forearms": "肱二头肌 · 肱三头肌 · 前臂",
    Push: "推",
    "Chest · Shoulders · Triceps": "胸 · 肩 · 肱三头肌",
    Pull: "拉",
    "Back · Biceps · Rear delts": "背 · 肱二头肌 · 三角肌后束",
    Legs: "腿",
    "Quads · Hamstrings · Glutes": "股四头肌 · 腘绳肌 · 臀肌",
    "Upper A": "上肢 A",
    "Strength focus": "侧重力量",
    "Lower A": "下肢 A",
    "Squat focus": "侧重深蹲",
    "Upper B": "上肢 B",
    "Hypertrophy focus": "侧重增肌",
    "Lower B": "下肢 B",
    "Hinge focus": "侧重髋铰链",
    "Full Body A": "全身 A",
    "Squat · Press · Row": "深蹲 · 推举 · 划船",
    "Full Body B": "全身 B",
    "Hinge · Pull · Press": "髋铰链 · 拉 · 推举",
    "Full Body C": "全身 C",
    "Legs · Push · Pull": "腿 · 推 · 拉",
    "Finish with 15–20 min incline walk or bike (zone 2)": "最后做 15–20 分钟坡度走或骑车（2 区心率）",
    "Optional: 10–15 min easy cardio": "可选：10–15 分钟轻松有氧",
    "Warm up 5–10 min, then do 1–2 lighter ramp-up sets before your first heavy exercise.":
      "热身 5–10 分钟，然后在第一个大重量动作前做 1–2 组较轻的递增组。",
    "Progressive overload: when you hit the top of the rep range on every set, add 2.5 kg (upper) or 5 kg (lower) next time.":
      "渐进超负荷：每组都达到次数范围上限时，下次增加 2.5 kg（上肢）或 5 kg（下肢）。",
    'RIR = reps in reserve. "1–2" means stop each set with 1–2 good reps still in the tank.':
      "RIR = 保留次数。“1–2”表示每组结束时还能再做 1–2 个标准动作。",
    "Keep lifting heavy while cutting — it's what tells your body to keep its muscle. Aim for 8–10k steps a day.":
      "减脂期间继续大重量训练——这会让身体保留肌肉。每天目标 8,000–10,000 步。",
    "Eat in a small surplus and sleep 7–9 hours. Expect about 0.25–0.5% bodyweight gain per week.":
      "保持少量热量盈余，睡 7–9 小时。预计每周体重增加约 0.25–0.5%。",
    "Train consistently and keep protein high to slowly recompose your body.": "坚持训练并保持高蛋白，慢慢改善身体成分。",
    "Every 6–8 weeks take a lighter deload week (half the sets) to recover.": "每 6–8 周安排一周较轻的减量周（组数减半）来恢复。",
  },
};
