import type { Exercise } from "../lib/types";

/**
 * Thousands of exercise variations, built from rules rather than typed one by one: the same
 * movement with different equipment (barbell, dumbbell, cable…), bench angle, grip, body position,
 * one arm or leg at a time, and rep styles (paused, slow tempo, 1½ reps). Each family lists only
 * combinations people really train. Names, and their Malay and Chinese versions, are composed
 * from the parts, so every variation reads naturally in all three languages.
 *
 * Ids are "v<family>-<n>" in generation order: add families or options only at the end of a list.
 */

/** A word or phrase in English, Malay and Chinese. */
type W = readonly [en: string, ms: string, zh: string];

// ── Building blocks ───────────────────────────────────────

const EQ = {
  barbell: { w: ["barbell", "barbel", "杠铃"] as W, label: "Barbell" },
  dumbbell: { w: ["dumbbell", "dumbel", "哑铃"] as W, label: "Dumbbell" },
  kettlebell: { w: ["kettlebell", "kettlebell", "壶铃"] as W, label: "Kettlebell" },
  cable: { w: ["cable", "kabel", "绳索"] as W, label: "Cable" },
  machine: { w: ["machine", "mesin", "器械"] as W, label: "Machine" },
  smith: { w: ["Smith machine", "mesin Smith", "史密斯机"] as W, label: "Smith machine" },
  band: { w: ["band", "jalur rintangan", "弹力带"] as W, label: "Resistance band" },
  ez: { w: ["EZ-bar", "bar EZ", "曲杆"] as W, label: "EZ bar" },
  landmine: { w: ["landmine", "landmine", "地雷管"] as W, label: "Barbell" },
  trapbar: { w: ["trap bar", "trap bar", "六角杠"] as W, label: "Trap bar" },
  bodyweight: { w: ["bodyweight", "berat badan", "自重"] as W, label: "Bodyweight" },
  ball: { w: ["stability ball", "bola kestabilan", "瑞士球"] as W, label: "Equipment" },
} as const;
type Eq = keyof typeof EQ;

const NONE: W = ["", "", ""];

/** Rep styles: the plain lift, then paused, slow-tempo and 1½-rep versions. */
const MODS: { w: W; tip: W }[] = [
  { w: NONE, tip: NONE },
  { w: ["paused", "berhenti seketika", "停顿"], tip: ["Pause 2 seconds at the hardest point.", "Berhenti 2 saat pada titik paling sukar.", "在最吃力的位置停顿 2 秒。"] },
  { w: ["slow tempo", "tempo perlahan", "慢速"], tip: ["Take 3 seconds to lower, 1 second to lift.", "Ambil 3 saat untuk turun, 1 saat untuk naik.", "用 3 秒下放，1 秒发力。"] },
  { w: ["1½ reps", "1½ ulangan", "一次半"], tip: ["Go all the way down, halfway up, down again, then all the way up: that's one rep.", "Turun penuh, naik separuh, turun semula, kemudian naik penuh: itu satu ulangan.", "完整下放，起到一半再下放，然后完整起：这算一次。"] },
];

const ANGLE = {
  flat: NONE,
  incline: ["incline", "condong", "上斜"] as W,
  lowIncline: ["low-incline", "condong rendah", "低角度上斜"] as W,
  decline: ["decline", "menurun", "下斜"] as W,
};
const GRIP = {
  std: NONE,
  wide: ["wide-grip", "genggaman lebar", "宽握"] as W,
  close: ["close-grip", "genggaman rapat", "窄握"] as W,
  neutral: ["neutral-grip", "genggaman neutral", "对握"] as W,
  reverse: ["reverse-grip", "genggaman terbalik", "反握"] as W,
  rope: ["rope", "tali", "麻绳把手"] as W,
  vbar: ["V-bar", "bar V", "V 形把"] as W,
  palmsUp: ["palms-up", "tapak tangan ke atas", "掌心向上"] as W,
  palmsDown: ["palms-down", "tapak tangan ke bawah", "掌心向下"] as W,
};
const POS = {
  none: NONE,
  standing: ["standing", "berdiri", "站姿"] as W,
  seated: ["seated", "duduk", "坐姿"] as W,
  kneeling: ["kneeling", "melutut", "跪姿"] as W,
  halfKneeling: ["half-kneeling", "separuh melutut", "半跪姿"] as W,
  tallKneeling: ["tall-kneeling", "melutut tegak", "直跪姿"] as W,
  chestSupported: ["chest-supported", "sokongan dada", "胸部支撑"] as W,
  bentOver: ["bent-over", "membongkok", "俯身"] as W,
  lying: ["lying", "berbaring", "卧姿"] as W,
  leaning: ["leaning", "condong badan", "侧倾"] as W,
  quadruped: ["on all fours", "merangkak", "四点支撑"] as W,
  highToLow: ["high-to-low", "tinggi ke rendah", "高位到低位"] as W,
  lowToHigh: ["low-to-high", "rendah ke tinggi", "低位到高位"] as W,
  mid: ["mid-height", "paras tengah", "中位"] as W,
  hanging: ["hanging", "bergantung", "悬垂"] as W,
  floor: ["floor", "lantai", "地面"] as W,
  bench: ["bench", "bangku", "凳上"] as W,
  frontFootElevated: ["front-foot-elevated", "kaki depan dinaikkan", "前脚垫高"] as W,
  lateral: ["lateral", "sisi", "侧向"] as W,
  crossover: ["crossover", "silang", "交叉"] as W,
  behindBack: ["behind-the-back", "di belakang badan", "背后"] as W,
};
const STANCE = {
  std: NONE,
  narrow: ["narrow-stance", "kaki rapat", "窄站距"] as W,
  wide: ["wide-stance", "kaki lebar", "宽站距"] as W,
  heels: ["heel-elevated", "tumit diangkat", "垫脚跟"] as W,
  staggered: ["staggered-stance", "kaki berselang", "错步站姿"] as W,
};
const ARM = {
  two: NONE,
  single: ["single-arm", "sebelah tangan", "单臂"] as W,
  alternating: ["alternating", "berselang-seli", "交替"] as W,
  singleLeg: ["single-leg", "sebelah kaki", "单腿"] as W,
};

// ── Families ──────────────────────────────────────────────

interface Combo {
  angle?: W;
  grip?: W;
  pos?: W;
  stance?: W;
  arm?: W;
}

interface Family {
  base: W;
  category: Exercise["category"];
  muscles: string;
  met: number;
  tip: W;
  /** Equipment, and for each the variations that make sense with it. */
  eq: Partial<Record<Eq, Combo[]>>;
  /** Rep styles to offer (all four by default). */
  mods?: number[];
  /** Put the equipment word after the base ("push-up, band") instead of before it. */
  eqAfter?: boolean;
}

/** Every combination of the listed options. */
function grid(o: { angle?: W[]; grip?: W[]; pos?: W[]; stance?: W[]; arm?: W[] }): Combo[] {
  const out: Combo[] = [{}];
  const step = (key: keyof Combo, values?: W[]) => {
    if (!values) return;
    const next: Combo[] = [];
    for (const c of out) for (const v of values) next.push({ ...c, [key]: v });
    out.splice(0, out.length, ...next);
  };
  step("pos", o.pos);
  step("angle", o.angle);
  step("stance", o.stance);
  step("grip", o.grip);
  step("arm", o.arm);
  return out;
}

const A = ANGLE, G = GRIP, P = POS, S = STANCE, R = ARM;

const FAMILIES: Family[] = [
  // Chest
  {
    base: ["bench press", "tekan bangku", "卧推"], category: "Chest", muscles: "Chest, Triceps, Front delts", met: 6,
    tip: ["Shoulder blades back and down, feet planted, lower under control.", "Bilah bahu ke belakang dan ke bawah, kaki tetap, turun dengan terkawal.", "肩胛骨后收下沉，双脚踩稳，控制下放。"],
    eq: {
      barbell: grid({ angle: [A.flat, A.incline, A.lowIncline, A.decline], grip: [G.std, G.wide, G.close, G.reverse] }),
      smith: grid({ angle: [A.flat, A.incline, A.lowIncline, A.decline], grip: [G.std, G.wide, G.close, G.reverse] }),
      dumbbell: grid({ angle: [A.flat, A.incline, A.lowIncline, A.decline], grip: [G.std, G.neutral], arm: [R.two, R.single, R.alternating] }),
    },
  },
  {
    base: ["chest press", "tekan dada", "推胸"], category: "Chest", muscles: "Chest, Triceps, Front delts", met: 5,
    tip: ["Press in a smooth arc and stop just short of locking the elbows.", "Tekan dalam lengkung lancar dan berhenti sebelum siku terkunci.", "沿平滑弧线推出，肘部不要完全锁死。"],
    eq: {
      machine: grid({ angle: [A.flat, A.incline, A.decline], arm: [R.two, R.single] }),
      cable: grid({ pos: [P.standing, P.seated], angle: [A.flat, A.incline, A.decline], arm: [R.two, R.single] }),
      band: grid({ pos: [P.standing, P.seated], angle: [A.flat, A.incline, A.decline], arm: [R.two, R.single] }),
    },
  },
  {
    base: ["floor press", "tekan lantai", "地板卧推"], category: "Chest", muscles: "Chest, Triceps", met: 5,
    tip: ["Let the upper arms touch the floor softly, then press.", "Biarkan lengan atas menyentuh lantai perlahan, kemudian tekan.", "上臂轻触地面后再推起。"],
    eq: { barbell: grid({ grip: [G.std, G.close] }), dumbbell: grid({ grip: [G.std, G.neutral], arm: [R.two, R.single, R.alternating] }), kettlebell: grid({ arm: [R.two, R.single, R.alternating] }) },
  },
  {
    base: ["fly", "layang", "飞鸟"], category: "Chest", muscles: "Chest, Front delts", met: 4,
    tip: ["Keep a slight bend in the elbows and feel the stretch across the chest.", "Kekalkan sedikit bengkok pada siku dan rasai regangan pada dada.", "肘部微屈，感受胸部的拉伸。"],
    eq: {
      dumbbell: grid({ angle: [A.flat, A.incline, A.decline], arm: [R.two, R.single] }),
      cable: grid({ pos: [P.highToLow, P.lowToHigh, P.mid], stance: [S.std, S.staggered], arm: [R.two, R.single] }),
      band: grid({ pos: [P.highToLow, P.lowToHigh, P.mid], arm: [R.two, R.single] }),
      machine: grid({ arm: [R.two, R.single] }),
    },
  },
  {
    base: ["push-up", "tekan tubi", "俯卧撑"], category: "Chest", muscles: "Chest, Triceps, Core", met: 5, eqAfter: true,
    tip: ["Body in one straight line, chest to just above the floor.", "Badan dalam satu garis lurus, dada hampir ke lantai.", "身体保持一条直线，胸部接近地面。"],
    eq: {
      bodyweight: grid({ angle: [A.flat, A.incline, A.decline, ["deficit", "defisit", "加深"]], grip: [G.std, G.wide, G.close, ["diamond", "berlian", "钻石"], ["staggered", "berselang", "交错"]] }),
      band: grid({ angle: [A.flat, A.incline, A.decline], grip: [G.std, G.wide, G.close] }),
    },
  },
  {
    base: ["dip", "dip", "双杠臂屈伸"], category: "Chest", muscles: "Chest, Triceps, Front delts", met: 6, eqAfter: true,
    tip: ["Lean forward for chest, stay upright for triceps; go to about 90° at the elbow.", "Condong ke depan untuk dada, tegak untuk trisep; turun hingga kira-kira 90° pada siku.", "前倾练胸，直立练三头；肘部下到约 90°。"],
    eq: { bodyweight: grid({ pos: [["chest", "dada", "练胸"], ["triceps", "trisep", "练三头"], P.bench] }), band: grid({ pos: [["assisted", "dibantu", "辅助"]] }), machine: grid({ pos: [P.seated] }) },
  },
  // Back
  {
    base: ["row", "dayung", "划船"], category: "Back", muscles: "Lats, Mid back, Biceps", met: 5,
    tip: ["Pull the elbow toward your hip and squeeze the shoulder blade back.", "Tarik siku ke arah pinggul dan picit bilah bahu ke belakang.", "把肘部拉向髋部，夹紧肩胛骨。"],
    eq: {
      barbell: grid({ pos: [P.bentOver], grip: [G.std, G.reverse, G.wide] }),
      dumbbell: grid({ pos: [P.bentOver, P.chestSupported, P.kneeling], grip: [G.std, G.neutral], arm: [R.two, R.single] }),
      kettlebell: grid({ pos: [P.bentOver], grip: [G.std, G.neutral], arm: [R.two, R.single] }),
      cable: grid({ pos: [P.seated, P.standing, P.kneeling], grip: [G.std, G.wide, G.neutral, G.reverse], arm: [R.two, R.single] }),
      machine: grid({ pos: [P.seated, P.chestSupported], grip: [G.std, G.wide, G.neutral], arm: [R.two, R.single] }),
      smith: grid({ pos: [P.bentOver], grip: [G.std, G.reverse, G.wide] }),
      band: grid({ pos: [P.seated, P.standing], grip: [G.std, G.neutral], arm: [R.two, R.single] }),
      landmine: grid({ pos: [P.bentOver], arm: [R.two, R.single] }),
    },
  },
  {
    base: ["lat pulldown", "tarik turun lat", "高位下拉"], category: "Back", muscles: "Lats, Biceps, Mid back", met: 5,
    tip: ["Lead with the elbows, pull to the upper chest, don't lean back far.", "Mulakan dengan siku, tarik ke dada atas, jangan condong terlalu ke belakang.", "以肘带动，拉到上胸，身体不要过度后仰。"],
    eq: {
      cable: grid({ pos: [P.seated, P.kneeling], grip: [G.std, G.wide, G.close, G.neutral, G.reverse], arm: [R.two, R.single] }),
      machine: grid({ grip: [G.std, G.wide, G.close, G.neutral, G.reverse], arm: [R.two, R.single] }),
      band: grid({ pos: [P.seated, P.kneeling], grip: [G.std, G.wide, G.close, G.neutral, G.reverse], arm: [R.two, R.single] }),
    },
  },
  {
    base: ["pull-up", "tarik naik", "引体向上"], category: "Back", muscles: "Lats, Biceps, Mid back", met: 8, eqAfter: true, mods: [0, 1, 2],
    tip: ["Start from a dead hang, pull until the chin clears the bar, lower fully.", "Mula dari gantungan penuh, tarik sehingga dagu melepasi palang, turun sepenuhnya.", "从完全悬垂开始，拉到下巴过杠，再完全放下。"],
    eq: {
      bodyweight: grid({ grip: [G.std, G.wide, G.close, G.neutral, G.reverse, ["mixed-grip", "genggaman campur", "正反握"]], pos: [NONE, ["weighted", "berbeban", "负重"], ["negative", "negatif", "离心"]] }),
      band: grid({ pos: [["assisted", "dibantu", "辅助"]], grip: [G.std, G.wide, G.neutral, G.reverse] }),
      machine: grid({ pos: [["assisted", "dibantu", "辅助"]], grip: [G.std, G.wide, G.neutral, G.reverse] }),
    },
  },
  {
    base: ["straight-arm pulldown", "tarik turun lengan lurus", "直臂下拉"], category: "Back", muscles: "Lats, Core", met: 4,
    tip: ["Arms long, hinge slightly and sweep the hands to your thighs.", "Lengan lurus, bongkok sedikit dan sapu tangan ke paha.", "手臂伸直，身体微前倾，把手划到大腿处。"],
    eq: { cable: grid({ pos: [P.standing, P.kneeling], grip: [G.std, G.rope, G.neutral], arm: [R.two, R.single] }), band: grid({ pos: [P.standing, P.kneeling], arm: [R.two, R.single] }) },
  },
  {
    base: ["pullover", "pullover", "仰卧上拉"], category: "Back", muscles: "Lats, Chest, Triceps", met: 4,
    tip: ["Lower behind your head only as far as your shoulders allow.", "Turunkan ke belakang kepala hanya setakat bahu membenarkan.", "在肩部允许的范围内放到头后。"],
    eq: { dumbbell: grid({ pos: [P.lying, P.floor], angle: [A.flat, A.decline] }), ez: grid({ pos: [P.lying] }), cable: grid({ pos: [P.lying, P.standing], grip: [G.std, G.rope] }) },
  },
  {
    base: ["shrug", "angkat bahu", "耸肩"], category: "Back", muscles: "Traps, Forearms", met: 3,
    tip: ["Lift the shoulders straight up toward the ears and hold for a second.", "Angkat bahu terus ke arah telinga dan tahan sesaat.", "肩膀垂直向耳朵方向耸起，停顿一秒。"],
    eq: {
      barbell: grid({ pos: [P.standing, P.behindBack] }), dumbbell: grid({ pos: [P.standing, P.seated, ["incline", "condong", "上斜"]] }),
      kettlebell: grid({ pos: [P.standing] }), cable: grid({ pos: [P.standing], arm: [R.two, R.single] }), machine: grid({ pos: [P.standing, P.seated] }),
      smith: grid({ pos: [P.standing, P.behindBack] }), trapbar: grid({ pos: [P.standing] }), band: grid({ pos: [P.standing] }),
    },
  },
  // Shoulders
  {
    base: ["overhead press", "tekan atas kepala", "过头推举"], category: "Shoulders", muscles: "Shoulders, Triceps, Core", met: 5,
    tip: ["Squeeze glutes and abs, press straight up and finish with the arms by your ears.", "Ketatkan punggung dan abdomen, tekan lurus ke atas dan akhiri dengan lengan di sisi telinga.", "收紧臀部和腹部，竖直上推，结束时手臂在耳旁。"],
    eq: {
      barbell: grid({ pos: [P.standing, P.seated, P.halfKneeling, P.tallKneeling], grip: [G.std, G.close] }),
      dumbbell: grid({ pos: [P.standing, P.seated, P.halfKneeling, P.tallKneeling], grip: [G.std, G.neutral], arm: [R.two, R.single, R.alternating] }),
      kettlebell: grid({ pos: [P.standing, P.seated, P.halfKneeling, P.tallKneeling], arm: [R.two, R.single, R.alternating] }),
      smith: grid({ pos: [P.standing, P.seated] }),
      machine: grid({ grip: [G.std, G.neutral], arm: [R.two, R.single] }),
      band: grid({ pos: [P.standing, P.seated, P.halfKneeling], arm: [R.two, R.single, R.alternating] }),
      landmine: grid({ pos: [P.standing, P.halfKneeling, P.tallKneeling], arm: [R.two, R.single] }),
    },
  },
  {
    base: ["lateral raise", "angkat sisi", "侧平举"], category: "Shoulders", muscles: "Side delts, Traps", met: 3,
    tip: ["Lead with the elbows and stop at shoulder height.", "Mulakan dengan siku dan berhenti pada paras bahu.", "以肘带动，抬到与肩同高。"],
    eq: {
      dumbbell: grid({ pos: [P.standing, P.seated, P.chestSupported, P.leaning], arm: [R.two, R.single] }),
      cable: grid({ pos: [P.standing, P.seated, P.leaning, P.behindBack], arm: [R.two, R.single] }),
      band: grid({ pos: [P.standing, P.seated], arm: [R.two, R.single] }),
      machine: grid({ arm: [R.two, R.single] }),
      kettlebell: grid({ pos: [P.standing], arm: [R.two, R.single] }),
    },
  },
  {
    base: ["front raise", "angkat depan", "前平举"], category: "Shoulders", muscles: "Front delts, Upper chest", met: 3,
    tip: ["Raise to eye level without swinging.", "Angkat ke paras mata tanpa menghayun.", "举到与眼同高，不要借力摆动。"],
    eq: {
      dumbbell: grid({ pos: [P.standing, P.seated, ["incline", "condong", "上斜"]], grip: [G.std, G.neutral], arm: [R.two, R.alternating, R.single] }),
      cable: grid({ pos: [P.standing], grip: [G.std, G.rope], arm: [R.two, R.single] }),
      barbell: grid({ grip: [G.std, G.wide] }), ez: grid({ grip: [G.std] }), band: grid({ arm: [R.two, R.single] }), kettlebell: grid({ arm: [R.two, R.single] }),
    },
  },
  {
    base: ["rear delt fly", "layang deltoid belakang", "反向飞鸟"], category: "Shoulders", muscles: "Rear delts, Upper back", met: 3,
    tip: ["Hinge forward, arms slightly bent, sweep out to the sides.", "Bongkok ke depan, lengan sedikit bengkok, sapu ke sisi.", "身体前倾，手臂微屈，向两侧打开。"],
    eq: {
      dumbbell: grid({ pos: [P.bentOver, P.seated, P.chestSupported], arm: [R.two, R.single] }),
      cable: grid({ pos: [P.standing, P.bentOver], arm: [R.two, R.single] }),
      band: grid({ pos: [P.standing, P.bentOver] }), machine: grid({ arm: [R.two, R.single] }),
    },
  },
  {
    base: ["upright row", "dayung tegak", "直立划船"], category: "Shoulders", muscles: "Side delts, Traps", met: 4,
    tip: ["Pull to lower-chest height with the elbows leading; stop if the shoulders pinch.", "Tarik ke paras dada bawah dengan siku mendahului; berhenti jika bahu terasa tersepit.", "以肘带动拉到下胸高度；肩部不适就停。"],
    eq: { barbell: grid({ grip: [G.std, G.wide] }), ez: grid({ grip: [G.std, G.wide] }), dumbbell: grid({ arm: [R.two, R.single] }), cable: grid({ grip: [G.std, G.rope] }), kettlebell: grid({}), band: grid({}), smith: grid({ grip: [G.std, G.wide] }) },
  },
  {
    base: ["face pull", "tarik muka", "面拉"], category: "Shoulders", muscles: "Rear delts, Upper back, Rotator cuff", met: 3,
    tip: ["Pull to the eyes and turn the hands back so the knuckles face behind you.", "Tarik ke paras mata dan pusingkan tangan supaya buku jari menghadap ke belakang.", "拉到眼睛高度，双手外旋让指节朝后。"],
    eq: { cable: grid({ pos: [P.standing, P.seated, P.halfKneeling, P.tallKneeling], arm: [R.two, R.single] }), band: grid({ pos: [P.standing, P.seated, P.halfKneeling] }) },
  },
  // Arms
  {
    base: ["curl", "bengkok bisep", "弯举"], category: "Arms", muscles: "Biceps, Forearms", met: 3,
    tip: ["Elbows by your sides, curl up without swinging, lower slowly.", "Siku di sisi badan, bengkokkan tanpa menghayun, turun perlahan.", "肘部贴身，不借力弯举，慢慢放下。"],
    eq: {
      barbell: grid({ pos: [P.standing, P.seated], grip: [G.std, G.wide, G.close] }), ez: grid({ pos: [P.standing, P.seated], grip: [G.std, G.wide, G.close] }),
      dumbbell: grid({ pos: [P.standing, P.seated], arm: [R.two, R.alternating, R.single] }), cable: grid({ pos: [P.standing, P.seated, P.lying], grip: [G.std, G.rope], arm: [R.two, R.single] }),
      kettlebell: grid({ pos: [P.standing, P.seated], arm: [R.two, R.alternating, R.single] }), band: grid({ pos: [P.standing, P.seated], arm: [R.two, R.alternating, R.single] }),
      machine: grid({ arm: [R.two, R.single] }),
    },
  },
  {
    base: ["hammer curl", "bengkok tukul", "锤式弯举"], category: "Arms", muscles: "Brachialis, Biceps, Forearms", met: 3,
    tip: ["Thumbs up the whole time; keep the elbows still.", "Ibu jari ke atas sepanjang masa; siku tidak bergerak.", "全程拇指朝上，肘部保持不动。"],
    eq: {
      dumbbell: grid({ pos: [P.standing, P.seated, ["incline", "condong", "上斜"], P.crossover], arm: [R.two, R.alternating, R.single] }),
      cable: grid({ pos: [P.standing], grip: [G.rope], arm: [R.two, R.single] }), band: grid({ arm: [R.two, R.alternating] }), kettlebell: grid({ arm: [R.two, R.alternating, R.single] }),
    },
  },
  {
    base: ["reverse curl", "bengkok terbalik", "反握弯举"], category: "Arms", muscles: "Brachioradialis, Forearms, Biceps", met: 3,
    tip: ["Palms down, wrists straight, curl with control.", "Tapak tangan ke bawah, pergelangan lurus, bengkok dengan terkawal.", "掌心向下，手腕伸直，控制弯举。"],
    eq: { barbell: grid({ pos: [P.standing, P.seated] }), ez: grid({ pos: [P.standing, P.seated] }), dumbbell: grid({ arm: [R.two, R.alternating, R.single] }), cable: grid({ arm: [R.two, R.single] }), band: grid({}) },
  },
  {
    base: ["preacher curl", "bengkok preacher", "牧师凳弯举"], category: "Arms", muscles: "Biceps (short head), Brachialis", met: 3,
    tip: ["Arms flat on the pad; lower until the elbows are almost straight.", "Lengan rata pada pad; turun sehingga siku hampir lurus.", "上臂贴紧垫子，下放到肘部接近伸直。"],
    eq: { barbell: grid({ grip: [G.std, G.close, G.reverse] }), ez: grid({ grip: [G.std, G.close, G.reverse] }), dumbbell: grid({ grip: [G.std, G.neutral], arm: [R.two, R.single] }), cable: grid({ grip: [G.std, G.rope], arm: [R.two, R.single] }), machine: grid({ arm: [R.two, R.single] }) },
  },
  {
    base: ["incline curl", "bengkok condong", "上斜弯举"], category: "Arms", muscles: "Biceps (long head)", met: 3,
    tip: ["Let the arms hang behind you on an incline bench for a long stretch.", "Biarkan lengan tergantung di belakang pada bangku condong untuk regangan panjang.", "在上斜凳上让手臂自然垂于身后，充分拉伸。"],
    eq: { dumbbell: grid({ grip: [G.std, G.neutral], arm: [R.two, R.alternating, R.single] }), cable: grid({ arm: [R.two, R.single] }) },
  },
  {
    base: ["spider curl", "bengkok spider", "蜘蛛弯举"], category: "Arms", muscles: "Biceps (short head)", met: 3,
    tip: ["Chest on an incline bench, arms hanging straight down, curl and squeeze.", "Dada pada bangku condong, lengan tergantung lurus, bengkok dan picit.", "胸贴上斜凳，手臂垂直向下，弯举并收紧。"],
    eq: { barbell: grid({}), ez: grid({ grip: [G.std, G.close] }), dumbbell: grid({ arm: [R.two, R.alternating, R.single] }), cable: grid({}) },
  },
  {
    base: ["concentration curl", "bengkok tumpuan", "集中弯举"], category: "Arms", muscles: "Biceps", met: 3,
    tip: ["Brace the elbow against the inner thigh and curl slowly.", "Sandarkan siku pada paha dalam dan bengkok perlahan.", "肘部抵住大腿内侧，慢慢弯举。"],
    eq: { dumbbell: grid({ pos: [P.seated, P.standing] }), cable: grid({ pos: [P.seated, P.kneeling] }), kettlebell: grid({ pos: [P.seated] }), band: grid({ pos: [P.seated] }) },
  },
  {
    base: ["drag curl", "bengkok seret", "拖拽弯举"], category: "Arms", muscles: "Biceps (long head)", met: 3,
    tip: ["Drag the weight up your body, elbows moving back.", "Seret beban naik di sepanjang badan, siku bergerak ke belakang.", "让重量贴着身体上拉，肘部向后移。"],
    eq: { barbell: grid({ grip: [G.std, G.close] }), ez: grid({}), dumbbell: grid({ arm: [R.two, R.alternating] }), cable: grid({}), smith: grid({}) },
  },
  {
    base: ["overhead triceps extension", "lanjutan trisep atas kepala", "过头臂屈伸"], category: "Arms", muscles: "Triceps (long head)", met: 3,
    tip: ["Elbows point forward and stay close; lower behind the head for a full stretch.", "Siku menghala ke depan dan rapat; turunkan ke belakang kepala untuk regangan penuh.", "肘部朝前并收紧，下放到头后充分拉伸。"],
    eq: {
      dumbbell: grid({ pos: [P.standing, P.seated], arm: [R.two, R.single] }), cable: grid({ pos: [P.standing, P.kneeling, P.seated], grip: [G.rope, G.std], arm: [R.two, R.single] }),
      ez: grid({ pos: [P.standing, P.seated] }), barbell: grid({ pos: [P.seated] }), kettlebell: grid({ pos: [P.standing, P.seated] }), band: grid({ pos: [P.standing, P.kneeling], arm: [R.two, R.single] }),
    },
  },
  {
    base: ["lying triceps extension", "lanjutan trisep berbaring", "仰卧臂屈伸"], category: "Arms", muscles: "Triceps", met: 3,
    tip: ["Upper arms still; lower to the forehead or just behind the head.", "Lengan atas tidak bergerak; turunkan ke dahi atau tepat di belakang kepala.", "上臂不动，下放到额头或头后。"],
    eq: {
      ez: grid({ angle: [A.flat, A.incline, A.decline], grip: [G.std, G.close] }), barbell: grid({ angle: [A.flat, A.incline, A.decline], grip: [G.std, G.close] }),
      dumbbell: grid({ angle: [A.flat, A.incline, A.decline], grip: [G.neutral, G.palmsDown], arm: [R.two, R.single] }), cable: grid({ angle: [A.flat, A.incline], grip: [G.std, G.rope] }),
      kettlebell: grid({ angle: [A.flat] }),
    },
  },
  {
    base: ["triceps pushdown", "tolak turun trisep", "三头下压"], category: "Arms", muscles: "Triceps", met: 3,
    tip: ["Elbows pinned to your sides; push down until the arms are straight.", "Siku rapat di sisi; tolak ke bawah sehingga lengan lurus.", "肘部贴紧身体两侧，下压至手臂伸直。"],
    eq: {
      cable: grid({ pos: [P.standing, P.kneeling], grip: [G.std, G.rope, G.vbar, G.reverse], arm: [R.two, R.single] }),
      band: grid({ grip: [G.std, G.reverse], arm: [R.two, R.single] }), machine: grid({}),
    },
  },
  {
    base: ["triceps kickback", "tendang belakang trisep", "俯身臂屈伸"], category: "Arms", muscles: "Triceps", met: 3,
    tip: ["Upper arm parallel to the floor; straighten the elbow and squeeze.", "Lengan atas selari dengan lantai; luruskan siku dan picit.", "上臂与地面平行，伸直肘部并夹紧。"],
    eq: { dumbbell: grid({ pos: [P.bentOver, P.kneeling, P.chestSupported], arm: [R.two, R.single] }), cable: grid({ pos: [P.bentOver, P.standing], arm: [R.single] }), band: grid({ pos: [P.bentOver], arm: [R.two, R.single] }), kettlebell: grid({ pos: [P.bentOver] }) },
  },
  {
    base: ["close-grip press", "tekan genggaman rapat", "窄握推举"], category: "Arms", muscles: "Triceps, Chest", met: 5,
    tip: ["Hands about shoulder-width, elbows tucked, press to lockout.", "Tangan selebar bahu, siku rapat, tekan hingga lurus.", "双手约与肩同宽，肘部内收，推到伸直。"],
    eq: { barbell: grid({ angle: [A.flat, A.incline, A.decline] }), smith: grid({ angle: [A.flat, A.incline] }), dumbbell: grid({ angle: [A.flat, A.incline], grip: [G.neutral] }), ez: grid({ angle: [A.flat] }) },
  },
  {
    base: ["wrist curl", "bengkok pergelangan", "腕弯举"], category: "Arms", muscles: "Forearms", met: 2,
    tip: ["Forearms resting, move only at the wrist through the full range.", "Lengan bawah berehat, gerakkan pergelangan sahaja sepenuhnya.", "前臂放稳，只用手腕完成全程动作。"],
    eq: {
      barbell: grid({ pos: [P.seated, P.behindBack], grip: [G.palmsUp, G.palmsDown] }), dumbbell: grid({ pos: [P.seated], grip: [G.palmsUp, G.palmsDown], arm: [R.two, R.single] }),
      cable: grid({ pos: [P.seated], grip: [G.palmsUp, G.palmsDown] }), band: grid({ grip: [G.palmsUp, G.palmsDown] }), ez: grid({ pos: [P.seated], grip: [G.palmsUp, G.palmsDown] }),
    },
  },
  // Legs
  {
    base: ["back squat", "cangkung belakang", "后蹲"], category: "Legs", muscles: "Quads, Glutes, Hamstrings, Core", met: 6,
    tip: ["Brace, sit between the heels, knees track over the toes.", "Kuatkan teras, duduk di antara tumit, lutut sejajar dengan jari kaki.", "核心收紧，坐到两脚跟之间，膝盖与脚尖同向。"],
    eq: { barbell: grid({ stance: [S.std, S.narrow, S.wide, S.heels] }), smith: grid({ stance: [S.std, S.narrow, S.wide, S.heels] }), band: grid({ stance: [S.std, S.wide] }) },
  },
  {
    base: ["front squat", "cangkung depan", "前蹲"], category: "Legs", muscles: "Quads, Glutes, Core", met: 6,
    tip: ["Elbows high, chest up, sit straight down.", "Siku tinggi, dada ke atas, duduk lurus ke bawah.", "肘部抬高，挺胸，垂直下蹲。"],
    eq: { barbell: grid({ stance: [S.std, S.narrow, S.heels] }), smith: grid({ stance: [S.std, S.narrow, S.heels] }), dumbbell: grid({ stance: [S.std, S.heels] }), kettlebell: grid({ stance: [S.std, S.heels] }) },
  },
  {
    base: ["goblet squat", "cangkung goblet", "高脚杯深蹲"], category: "Legs", muscles: "Quads, Glutes, Core", met: 5,
    tip: ["Hold the weight at your chest and sit down between your knees.", "Pegang beban di dada dan duduk di antara lutut.", "把重量抱在胸前，坐到两膝之间。"],
    eq: { dumbbell: grid({ stance: [S.std, S.narrow, S.wide, S.heels] }), kettlebell: grid({ stance: [S.std, S.narrow, S.wide, S.heels] }) },
  },
  {
    base: ["box squat", "cangkung kotak", "箱式深蹲"], category: "Legs", muscles: "Glutes, Hamstrings, Quads", met: 5,
    tip: ["Sit back to the box, pause without relaxing, then drive up.", "Duduk ke belakang ke kotak, berhenti tanpa mengendur, kemudian tolak naik.", "向后坐到箱子上，停顿但不放松，然后发力站起。"],
    eq: { barbell: grid({ stance: [S.std, S.wide] }), dumbbell: grid({ stance: [S.std, S.wide] }), kettlebell: grid({ stance: [S.std, S.wide] }), bodyweight: grid({ stance: [S.std, S.wide] }), smith: grid({ stance: [S.std, S.wide] }) },
  },
  {
    base: ["sumo squat", "cangkung sumo", "相扑深蹲"], category: "Legs", muscles: "Glutes, Adductors, Quads", met: 5,
    tip: ["Wide stance, toes out, knees push out over the toes.", "Kaki lebar, jari kaki ke luar, lutut menolak ke luar sejajar jari kaki.", "宽站距，脚尖外开，膝盖向外与脚尖同向。"],
    eq: { dumbbell: grid({}), kettlebell: grid({}), barbell: grid({}), bodyweight: grid({}), band: grid({}) },
  },
  {
    base: ["squat", "cangkung", "深蹲"], category: "Legs", muscles: "Quads, Glutes", met: 5, eqAfter: true,
    tip: ["Feet shoulder-width, sit back and down, stand tall.", "Kaki selebar bahu, duduk ke belakang dan ke bawah, berdiri tegak.", "双脚与肩同宽，向后下坐，再站直。"],
    eq: { bodyweight: grid({ stance: [S.std, S.narrow, S.wide, S.heels], pos: [NONE, ["jump", "lompat", "跳跃"], ["pulse", "denyut", "脉冲"]] }) },
  },
  {
    base: ["split squat", "cangkung belah", "分腿蹲"], category: "Legs", muscles: "Quads, Glutes", met: 5,
    tip: ["Long stance, back knee lowers straight down, front heel stays down.", "Langkah panjang, lutut belakang turun lurus, tumit depan kekal di lantai.", "步距拉长，后膝垂直下沉，前脚跟不离地。"],
    eq: {
      barbell: grid({ pos: [P.none, P.frontFootElevated] }), dumbbell: grid({ pos: [P.none, P.frontFootElevated] }), kettlebell: grid({ pos: [P.none, P.frontFootElevated] }),
      smith: grid({ pos: [P.none, P.frontFootElevated] }), bodyweight: grid({ pos: [P.none, P.frontFootElevated] }), band: grid({ pos: [P.none] }), landmine: grid({ pos: [P.none] }),
    },
  },
  {
    base: ["Bulgarian split squat", "cangkung belah Bulgaria", "保加利亚分腿蹲"], category: "Legs", muscles: "Quads, Glutes, Adductors", met: 6,
    tip: ["Rear foot on a bench; lean slightly forward for glutes, stay upright for quads.", "Kaki belakang di atas bangku; condong sedikit untuk glut, tegak untuk kuadrisep.", "后脚放凳上；稍前倾练臀，直立练股四头。"],
    eq: { barbell: grid({}), dumbbell: grid({ pos: [P.none, ["goblet", "goblet", "高脚杯"]] }), kettlebell: grid({ pos: [P.none, ["goblet", "goblet", "高脚杯"]] }), smith: grid({}), bodyweight: grid({}), band: grid({}), landmine: grid({}) },
  },
  {
    base: ["lunge", "terjah", "弓步"], category: "Legs", muscles: "Quads, Glutes, Hamstrings", met: 5,
    tip: ["Step, drop the back knee toward the floor, push through the front foot.", "Melangkah, turunkan lutut belakang ke lantai, tolak melalui kaki depan.", "迈步，后膝下沉接近地面，用前脚发力。"],
    eq: Object.fromEntries((["bodyweight", "dumbbell", "barbell", "kettlebell", "smith", "band", "landmine"] as Eq[]).map((e) => [
      e,
      grid({ pos: e === "smith" || e === "landmine" ? [["forward", "ke depan", "前"], ["reverse", "ke belakang", "后"]] : [["forward", "ke depan", "前"], ["reverse", "ke belakang", "后"], ["walking", "berjalan", "行走"], P.lateral, ["curtsy", "curtsy", "交叉"]] }),
    ])),
  },
  {
    base: ["step-up", "naik langkah", "登阶"], category: "Legs", muscles: "Quads, Glutes", met: 5,
    tip: ["Whole foot on the box; drive up through that leg without pushing off the back foot.", "Seluruh tapak kaki di atas kotak; tolak naik dengan kaki itu tanpa menolak kaki belakang.", "整只脚踩在箱上，用这条腿发力，后脚不要蹬地。"],
    eq: { bodyweight: grid({ pos: [P.none, P.lateral, P.crossover] }), dumbbell: grid({ pos: [P.none, P.lateral, P.crossover] }), barbell: grid({ pos: [P.none, P.lateral] }), kettlebell: grid({ pos: [P.none, P.lateral, P.crossover] }) },
  },
  {
    base: ["leg press", "tekan kaki", "腿举"], category: "Legs", muscles: "Quads, Glutes, Hamstrings", met: 5,
    tip: ["Lower until the hips are about to lift off the seat, then press without locking the knees.", "Turun sehingga pinggul hampir terangkat dari tempat duduk, kemudian tekan tanpa mengunci lutut.", "下放到髋部即将离开座椅，再推起，膝盖不要锁死。"],
    eq: { machine: grid({ stance: [S.std, S.narrow, S.wide, ["high-foot", "kaki tinggi", "高脚位"], ["low-foot", "kaki rendah", "低脚位"]], arm: [R.two, R.singleLeg] }) },
  },
  {
    base: ["hack squat", "cangkung hack", "哈克深蹲"], category: "Legs", muscles: "Quads, Glutes", met: 5,
    tip: ["Back flat on the pad; go deep with the knees forward.", "Belakang rata pada pad; turun dalam dengan lutut ke depan.", "背部贴紧靠垫，膝盖前移深蹲。"],
    eq: { machine: grid({ stance: [S.std, S.narrow, S.wide], pos: [NONE, ["reverse", "terbalik", "反向"]] }), barbell: grid({}) },
  },
  {
    base: ["leg extension", "lanjutan kaki", "腿屈伸"], category: "Legs", muscles: "Quads", met: 3,
    tip: ["Straighten the knees fully and squeeze the quads at the top.", "Luruskan lutut sepenuhnya dan picit kuadrisep di atas.", "膝盖完全伸直，顶端夹紧股四头肌。"],
    eq: { machine: grid({ arm: [R.two, R.singleLeg], pos: [NONE, ["toes-in", "jari ke dalam", "脚尖内扣"], ["toes-out", "jari ke luar", "脚尖外开"]] }), band: grid({ arm: [R.two, R.singleLeg] }), cable: grid({ arm: [R.singleLeg] }) },
  },
  {
    base: ["Romanian deadlift", "angkat mati Romania", "罗马尼亚硬拉"], category: "Legs", muscles: "Hamstrings, Glutes, Lower back", met: 6,
    tip: ["Push the hips back with soft knees until you feel the hamstrings, then stand tall.", "Tolak pinggul ke belakang dengan lutut lembut hingga terasa hamstring, kemudian berdiri.", "膝盖微屈，髋部后推至腘绳肌有拉伸感，再站直。"],
    eq: {
      barbell: grid({ stance: [S.std, S.staggered], arm: [R.two, R.singleLeg] }), dumbbell: grid({ stance: [S.std, S.staggered], arm: [R.two, R.singleLeg] }),
      kettlebell: grid({ stance: [S.std, S.staggered], arm: [R.two, R.singleLeg] }), smith: grid({ stance: [S.std, S.staggered] }), trapbar: grid({}),
      band: grid({ arm: [R.two, R.singleLeg] }), cable: grid({ arm: [R.two, R.singleLeg] }), landmine: grid({ arm: [R.two, R.singleLeg] }),
    },
  },
  {
    base: ["deadlift", "angkat mati", "硬拉"], category: "Legs", muscles: "Hamstrings, Glutes, Lower back, Traps", met: 6, mods: [0, 1, 2],
    tip: ["Bar over mid-foot, flat back, push the floor away.", "Bar di atas tengah tapak kaki, belakang rata, tolak lantai menjauh.", "杠铃在脚掌中部上方，背部平直，用脚蹬地。"],
    eq: Object.fromEntries((["barbell", "trapbar", "dumbbell", "kettlebell", "smith"] as Eq[]).map((e) => [
      e,
      grid({ stance: e === "barbell" ? [S.std, ["sumo", "sumo", "相扑"], ["deficit", "defisit", "赤字"], ["block", "blok", "垫高"]] : [S.std, ["sumo", "sumo", "相扑"]] }),
    ])),
  },
  {
    base: ["stiff-leg deadlift", "angkat mati kaki lurus", "直腿硬拉"], category: "Legs", muscles: "Hamstrings, Lower back, Glutes", met: 5,
    tip: ["Knees almost straight; lower only as far as the back stays flat.", "Lutut hampir lurus; turun hanya setakat belakang kekal rata.", "膝盖几乎伸直，在背部保持平直的范围内下放。"],
    eq: { barbell: grid({}), dumbbell: grid({ arm: [R.two, R.singleLeg] }), kettlebell: grid({}), smith: grid({}) },
  },
  {
    base: ["good morning", "good morning", "早安式"], category: "Legs", muscles: "Hamstrings, Lower back, Glutes", met: 4,
    tip: ["Bar on the upper back, hinge forward with a flat back, knees soft.", "Bar di belakang atas, bongkok ke depan dengan belakang rata, lutut lembut.", "杠铃在上背，背部平直前屈，膝盖微屈。"],
    eq: { barbell: grid({ pos: [P.standing, P.seated], stance: [S.std, S.wide] }), smith: grid({ stance: [S.std, S.wide] }), band: grid({ stance: [S.std, S.wide] }), dumbbell: grid({}) },
  },
  {
    base: ["leg curl", "bengkok kaki", "腿弯举"], category: "Legs", muscles: "Hamstrings, Calves", met: 3,
    tip: ["Curl the heels toward your glutes and lower slowly.", "Bengkokkan tumit ke arah punggung dan turun perlahan.", "把脚跟弯向臀部，慢慢放下。"],
    eq: {
      machine: grid({ pos: [P.lying, P.seated, P.standing], arm: [R.two, R.singleLeg] }), band: grid({ pos: [P.lying, P.standing], arm: [R.two, R.singleLeg] }),
      cable: grid({ pos: [P.standing, P.lying], arm: [R.singleLeg] }), dumbbell: grid({ pos: [P.lying] }), ball: grid({ arm: [R.two, R.singleLeg] }),
      bodyweight: grid({ pos: [["slider", "pelungsur", "滑盘"], ["towel", "tuala", "毛巾"]], arm: [R.two, R.singleLeg] }),
    },
  },
  {
    base: ["hip thrust", "tujahan pinggul", "臀推"], category: "Legs", muscles: "Glutes, Hamstrings", met: 5,
    tip: ["Upper back on a bench, chin tucked, drive the hips up and squeeze the glutes.", "Belakang atas di bangku, dagu ditarik, tolak pinggul ke atas dan picit glut.", "上背靠凳，收下巴，髋部上推并夹紧臀部。"],
    eq: Object.fromEntries((["barbell", "dumbbell", "smith", "machine", "band", "bodyweight", "kettlebell"] as Eq[]).map((e) => [e, grid({ stance: [S.std, ["B-stance", "kedudukan B", "B 字站姿"], S.wide], arm: [R.two, R.singleLeg] }).filter((c) => !(c.arm === R.singleLeg && c.stance !== S.std))])),
  },
  {
    base: ["glute bridge", "titian glut", "臀桥"], category: "Legs", muscles: "Glutes, Hamstrings", met: 4,
    tip: ["Lying on your back, push through the heels and squeeze the glutes at the top.", "Berbaring, tolak melalui tumit dan picit glut di atas.", "仰卧，用脚跟发力，顶端夹紧臀部。"],
    eq: Object.fromEntries((["bodyweight", "barbell", "dumbbell", "band", "kettlebell", "ball"] as Eq[]).map((e) => [e, grid({ stance: [S.std, S.wide, ["feet-elevated", "kaki dinaikkan", "脚垫高"]], arm: [R.two, R.singleLeg] })])),
  },
  {
    base: ["glute kickback", "tendang glut", "臀部后踢"], category: "Legs", muscles: "Glutes", met: 3,
    tip: ["Kick the leg back from the hip without arching the lower back.", "Tendang kaki ke belakang dari pinggul tanpa melengkungkan belakang bawah.", "从髋部向后踢腿，下背不要反弓。"],
    eq: { cable: grid({ pos: [P.standing, P.quadruped] }), machine: grid({ pos: [P.standing, P.quadruped] }), band: grid({ pos: [P.standing, P.quadruped] }), bodyweight: grid({ pos: [P.quadruped] }) },
  },
  {
    base: ["hip abduction", "abduksi pinggul", "髋外展"], category: "Legs", muscles: "Glutes, Abductors", met: 3,
    tip: ["Push the knees or leg out against the resistance, slowly.", "Tolak lutut atau kaki ke luar melawan rintangan, perlahan.", "膝盖或腿向外对抗阻力，动作要慢。"],
    eq: { machine: grid({ pos: [P.seated], stance: [S.std, ["leaning forward", "condong ke depan", "前倾"]] }), cable: grid({ pos: [P.standing] }), band: grid({ pos: [P.seated, P.standing, P.lying] }), bodyweight: grid({ pos: [P.lying] }) },
  },
  {
    base: ["hip adduction", "aduksi pinggul", "髋内收"], category: "Legs", muscles: "Adductors", met: 3,
    tip: ["Squeeze the legs together under control.", "Rapatkan kaki dengan terkawal.", "控制地把双腿向内夹。"],
    eq: { machine: grid({ pos: [P.seated] }), cable: grid({ pos: [P.standing] }), band: grid({ pos: [P.seated, P.standing] }), bodyweight: grid({ pos: [P.lying, ["Copenhagen", "Copenhagen", "哥本哈根"]] }) },
  },
  {
    base: ["calf raise", "angkat betis", "提踵"], category: "Legs", muscles: "Calves", met: 3,
    tip: ["Full stretch at the bottom, pause, then rise as high as you can.", "Regangan penuh di bawah, berhenti, kemudian naik setinggi mungkin.", "底部充分拉伸并停顿，再尽量踮高。"],
    eq: {
      bodyweight: grid({ pos: [P.standing, ["on a step", "di atas anak tangga", "台阶上"]], arm: [R.two, R.singleLeg] }), dumbbell: grid({ pos: [P.standing, P.seated], arm: [R.two, R.singleLeg] }),
      barbell: grid({ pos: [P.standing, P.seated] }), machine: grid({ pos: [P.standing, P.seated, ["donkey", "keldai", "驴式"], ["leg-press", "tekan kaki", "腿举机"]], arm: [R.two, R.singleLeg] }),
      smith: grid({ pos: [P.standing, P.seated], arm: [R.two, R.singleLeg] }), band: grid({ pos: [P.seated, P.standing] }), kettlebell: grid({ pos: [P.standing], arm: [R.two, R.singleLeg] }),
    },
  },
  // Core
  {
    base: ["plank", "papan", "平板支撑"], category: "Core", muscles: "Abs, Core, Shoulders", met: 3, eqAfter: true, mods: [0],
    tip: ["Squeeze glutes and abs so the body is one straight line.", "Ketatkan punggung dan abdomen supaya badan satu garis lurus.", "收紧臀部和腹部，身体成一条直线。"],
    eq: {
      bodyweight: grid({ pos: [NONE, ["side", "sisi", "侧"], ["long-lever", "tuas panjang", "长杠杆"], ["RKC", "RKC", "RKC"]], grip: [NONE, ["shoulder-tap", "tepuk bahu", "摸肩"], ["arm-reach", "hulur tangan", "伸臂"], ["leg-lift", "angkat kaki", "抬腿"], ["hip-dip", "turun pinggul", "转髋"]] }),
      ball: grid({ pos: [NONE, ["stir-the-pot", "kacau periuk", "画圈"]] }),
    },
  },
  {
    base: ["crunch", "crunch", "卷腹"], category: "Core", muscles: "Abs, Obliques", met: 3,
    tip: ["Curl the ribs toward the hips; don't pull on the neck.", "Gulung tulang rusuk ke arah pinggul; jangan tarik leher.", "肋骨卷向骨盆，不要拉扯脖子。"],
    eq: {
      bodyweight: grid({ pos: [P.floor, ["decline", "menurun", "下斜"], ["reverse", "terbalik", "反向"], ["bicycle", "basikal", "单车"], ["oblique", "oblik", "侧向"]] }),
      cable: grid({ pos: [P.kneeling, P.standing, ["oblique", "oblik", "侧向"]] }), machine: grid({}), band: grid({ pos: [P.kneeling, P.standing] }),
      dumbbell: grid({ pos: [P.floor, ["decline", "menurun", "下斜"]] }), ball: grid({ pos: [NONE, ["oblique", "oblik", "侧向"]] }),
    },
  },
  {
    base: ["leg raise", "angkat kaki", "举腿"], category: "Core", muscles: "Abs, Hip flexors", met: 3, eqAfter: true,
    tip: ["Tilt the pelvis up at the top and lower without swinging.", "Condongkan pelvis ke atas di puncak dan turun tanpa menghayun.", "顶端骨盆上卷，下放时不要摆动。"],
    eq: {
      bodyweight: grid({ pos: [P.hanging, P.lying, P.bench, ["decline", "menurun", "下斜"]], grip: [["bent-knee", "lutut bengkok", "屈膝"], ["straight-leg", "kaki lurus", "直腿"], ["oblique", "oblik", "侧向"]] }),
      machine: grid({ pos: [["captain's chair", "kerusi kapten", "罗马椅"]], grip: [["bent-knee", "lutut bengkok", "屈膝"], ["straight-leg", "kaki lurus", "直腿"]] }),
    },
  },
  {
    base: ["woodchop", "cincang kayu", "伐木式"], category: "Core", muscles: "Obliques, Core, Shoulders", met: 4, mods: [0, 2],
    tip: ["Rotate through the upper back with arms long; the hips stay square.", "Putar melalui belakang atas dengan lengan lurus; pinggul tetap lurus.", "手臂伸直，用上背旋转，髋部保持正对。"],
    eq: Object.fromEntries((["cable", "band", "dumbbell", "kettlebell"] as Eq[]).map((e) => [e, grid({ pos: [P.highToLow, P.lowToHigh, ["horizontal", "mendatar", "水平"]], stance: [S.std, ["half-kneeling", "separuh melutut", "半跪"], ["tall-kneeling", "melutut tegak", "直跪"]] })])),
  },
  {
    base: ["Pallof press", "tekan Pallof", "帕洛夫推"], category: "Core", muscles: "Core, Obliques", met: 3, mods: [0, 2],
    tip: ["Press the handle straight out and don't let it pull you round.", "Tekan pemegang lurus ke depan dan jangan biar ia memusingkan badan.", "把手把向前推直，不要被拉得转身。"],
    eq: { cable: grid({ pos: [P.standing, P.halfKneeling, P.tallKneeling, ["split-stance", "langkah belah", "分腿站"]], grip: [NONE, ["overhead", "atas kepala", "过头"], ["with hold", "dengan tahan", "保持"]] }), band: grid({ pos: [P.standing, P.halfKneeling, P.tallKneeling], grip: [NONE, ["overhead", "atas kepala", "过头"]] }) },
  },
  {
    base: ["carry", "bawa beban", "负重行走"], category: "Core", muscles: "Core, Forearms, Traps", met: 5, mods: [0],
    tip: ["Walk tall with short steps; don't lean to either side.", "Berjalan tegak dengan langkah pendek; jangan condong ke mana-mana sisi.", "挺直身体小步走，不要侧倾。"],
    eq: Object.fromEntries((["dumbbell", "kettlebell", "trapbar", "barbell"] as Eq[]).map((e) => [
      e,
      grid({ pos: e === "trapbar" ? [["farmer's", "petani", "农夫"]] : e === "barbell" ? [["suitcase", "beg pakaian", "手提箱"], ["front-rack", "rak depan", "前架"]] : [["farmer's", "petani", "农夫"], ["suitcase", "beg pakaian", "手提箱"], ["front-rack", "rak depan", "前架"], ["overhead", "atas kepala", "过头"], ["waiter's", "pelayan", "侍者"]], grip: [NONE, ["marching", "berkawad", "踏步"]] }),
    ])),
  },
];

// ── Composition ───────────────────────────────────────────

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const join = (parts: string[], sep = " ") => parts.filter(Boolean).join(sep).replace(/\s+/g, " ").trim();

interface Built {
  ex: Exercise;
  fam: Family;
  eqKey: Eq;
  c: Combo;
  mi: number;
}

const ONE_SIDE: W = ["Do every rep on one side, then the other.", "Siapkan semua ulangan pada satu sisi, kemudian sisi lain.", "一侧做完全部次数，再换另一侧。"];

/** The name in one language (0 English, 1 Malay, 2 Chinese). */
function nameIn(b: Pick<Built, "fam" | "eqKey" | "c" | "mi">, i: 0 | 1 | 2): string {
  const { fam, eqKey, c } = b;
  const eq = EQ[eqKey];
  const m = MODS[b.mi].w[i];
  const parts = [c.pos?.[i], c.angle?.[i], c.stance?.[i], c.grip?.[i], c.arm?.[i]].filter(Boolean) as string[];
  const bw = eqKey === "bodyweight";
  if (i === 2) return parts.join("") + (bw ? "" : eq.w[2]) + fam.base[2] + (m ? `（${m}）` : "");
  if (i === 1) return cap(join([fam.base[1], bw ? "" : eq.w[1], ...parts])) + (m ? `, ${m}` : "");
  // English: "Incline wide-grip barbell bench press, paused".
  const core = fam.eqAfter ? join([...parts, fam.base[0]]) + (bw ? "" : `, ${eq.w[0]}`) : join([...parts, bw ? "" : eq.w[0], fam.base[0]]);
  return cap(core) + (m ? `, ${m}` : "");
}

function tipIn(b: Pick<Built, "fam" | "c" | "mi">, i: 0 | 1 | 2): string {
  const single = b.c.arm === ARM.single || b.c.arm === ARM.singleLeg;
  return [b.fam.tip[i], MODS[b.mi].tip[i], single ? ONE_SIDE[i] : ""].filter(Boolean).join(i === 2 ? "" : " ");
}

function build(): Built[] {
  const out: Built[] = [];
  FAMILIES.forEach((fam, fi) => {
    let n = 0;
    const muscles = fam.muscles.split(", ");
    for (const [eqKey, combos] of Object.entries(fam.eq) as [Eq, Combo[]][]) {
      for (const c of combos) {
        for (const mi of fam.mods ?? [0, 1, 2, 3]) {
          const b = { fam, eqKey, c, mi };
          out.push({
            ...b,
            ex: { id: `v${fi}-${n++}`, name: nameIn(b, 0), kind: "strength", category: fam.category, met: fam.met, equipment: EQ[eqKey].label, muscles, tip: tipIn(b, 0) },
          });
        }
      }
    }
  });
  return out;
}

let built: Built[] | null = null;
const all = () => (built ??= build());

/** The variations, minus any whose name is already a library exercise. */
export function variantExercises(existing: Set<string>): Exercise[] {
  const seen = new Set([...existing].map((n) => n.toLowerCase()));
  const out: Exercise[] = [];
  for (const b of all()) {
    const key = b.ex.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(b.ex);
  }
  return out;
}

let byName: Map<string, Built> | null = null;
let byTip: Map<string, Built> | null = null;

/** A variation's name in Malay or Chinese. */
export function variantName(lang: string, name: string): string | undefined {
  byName ??= new Map(all().map((b) => [b.ex.name, b]));
  const b = byName.get(name);
  return b && (lang === "ms" || lang === "zh") ? nameIn(b, lang === "ms" ? 1 : 2) : undefined;
}

/** A variation's form tip in Malay or Chinese. */
export function variantTip(lang: string, tip: string): string | undefined {
  byTip ??= new Map(all().map((b) => [b.ex.tip!, b]));
  const b = byTip.get(tip);
  return b && (lang === "ms" || lang === "zh") ? tipIn(b, lang === "ms" ? 1 : 2) : undefined;
}
