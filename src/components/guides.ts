import type { Tab } from "../App";

// The step-by-step guides behind the ? button: a one-minute tour, then a guide for each part of
// the app that walks through everything on it. Titles and text are English keys for t().
//
// A step points at a feature with `targets` (the first one on screen wins):
//   "name"          an element with data-tour="name"
//   "css:<sel>"     the first element matching a CSS selector
//   "header:<text>" a section header with that (translated) text
//   "tile:<text>"   a tile with that title;  "row:<text>" a row with that title
// A step with no target shows its card in the middle; `optional` skips it when nothing matches.

export interface Step {
  tab: Tab;
  targets?: string[];
  optional?: boolean;
  /** Only for people who can track a cycle (women). */
  women?: boolean;
  title: string;
  body: string;
}

export interface Guide {
  id: "quick" | "today" | "food" | "train" | "plan" | "profile" | "cycle";
  title: string;
  sub: string;
  steps: Step[];
}

export const QUICK_STEPS: Step[] = [
  {
    tab: "today",
    title: "Welcome to W 👋",
    body: "This short guide shows you how to count calories, track workouts and follow your plan. It takes about a minute.",
  },
  {
    tab: "today",
    targets: ["summary"],
    title: "Your day at a glance",
    body: "The orange ring shows the calories you have left: eating fills it, workouts give calories back. The teal ring counts your steps, and protein, carbs and fat sit below.",
  },
  {
    tab: "today",
    targets: ["water-cup"],
    title: "Drink water",
    body: "Tap the cup each time you drink. The water drains as the cup is counted, then the cup fills back up. Hold it to take a cup back.",
  },
  {
    tab: "today",
    targets: ["barcode"],
    title: "Scan a barcode",
    body: "Point the camera at the barcode on packaged food to get its calories and nutrition. You can also type the number.",
  },
  {
    tab: "today",
    targets: ["body-check"],
    title: "Body check & BMI",
    body: "Enter your height and weight to see your BMI and get a recommendation on how to train and what to eat. One tap applies it to your plan.",
  },
  {
    tab: "food",
    targets: ["food-search"],
    title: "Search any food",
    body: "Type a food like 'nasi lemak' or 'Milo'. Pick the portion and you'll see the calories, a health grade and whether it suits your goal.",
  },
  {
    tab: "food",
    targets: ["food-tools"],
    title: "Build your own meals",
    body: "Build a meal from any foods and amounts and save it to log in one tap later. Add your own foods from a nutrition label with 'New food'.",
  },
  {
    tab: "train",
    targets: ["clock-in", "clock-out"],
    title: "Clock in at the gym",
    body: "Tap Clock in when you start. A live timer counts your time and calories. Log sets and weights, then clock out to save the workout.",
  },
  {
    tab: "train",
    targets: ["log-activity"],
    optional: true,
    title: "Log other activities",
    body: "Played futsal or went for a run? Log it here with its duration and the calories are added to your day. There are 6,000+ exercises and sports, and you can create your own.",
  },
  {
    tab: "plan",
    targets: ["split"],
    title: "Your training plan",
    body: "Choose a split and your days per week. Press and hold a day or an exercise to drag it into your own order, and tap an exercise to see how it's done.",
  },
  {
    tab: "plan",
    targets: ["plan-tabs"],
    title: "What to eat",
    body: "The Nutrition tab shows your calorie and protein targets, foods to eat and limit, and a sample day of meals you can log.",
  },
  {
    tab: "profile",
    targets: ["field-weight"],
    title: "Keep your profile up to date",
    body: "Update your weight here as it changes, along with your goal and activity below. Every target and plan in the app adjusts automatically.",
  },
  {
    tab: "today",
    targets: ["help"],
    title: "Need help again?",
    body: "Tap the ? button any time for this tour, or for a full guide to Today, Food, Train, Plan, your profile and your cycle.",
  },
];

const TODAY: Step[] = [
  { tab: "today", targets: ["summary"], title: "Calories and steps", body: "The orange ring is what's left of today's calories: food fills it, workouts and walking give some back. The teal ring counts your steps towards your goal." },
  { tab: "today", targets: ["css:.stat-button"], title: "Your calorie target", body: "Tap Daily target to set your own number of calories, or leave it on automatic: worked out from your body, activity and goal." },
  { tab: "today", targets: ["css:[data-testid=avatar-switch]"], optional: true, title: "Everyone on this phone", body: "Tap your photo to see everyone who uses W on this phone. Swipe it down to switch straight to the next person." },
  { tab: "today", targets: ["css:.streak-chip"], optional: true, title: "Your streak", body: "Days in a row you've logged food. Tap it to see your weight, water and streaks." },
  { tab: "today", targets: ["water-cup"], title: "Water", body: "Tap the cup when you drink; hold it to take one back. Tap the cup size to change it to your own glass or bottle." },
  { tab: "today", targets: ["css:.progress-link"], title: "Progress and weekly report", body: "Progress has your weight chart, water history and streaks. The weekly report sums up your eating and training for the week." },
  { tab: "today", targets: ["css:[data-testid=fast-card]"], optional: true, title: "Fasting", body: "During Ramadan or 16:8 fasting this counts down to iftar, sahur or your eating window." },
  { tab: "today", targets: ["css:[data-testid=cycle-card]", "css:[data-testid=cycle-locked]"], optional: true, women: true, title: "Your cycle", body: "Cycle day and phase, with what it means for training and food. There's a full Cycle guide behind the ? button." },
  { tab: "today", targets: ["css:[data-testid=checkin]"], title: "Morning check-in", body: "Set bedtime and wake-up on the sleep clock and rate your mood and energy. W uses it in your weekly report." },
  { tab: "today", targets: ["log-tiles"], title: "Four ways to log food", body: "Search the food list, scan a barcode, say what you ate (\"two roti canai and teh tarik\"), or just add calories." },
  { tab: "today", targets: ["css:[data-testid=meal-ideas]"], optional: true, title: "Meal ideas", body: "Ideas for your next meal that fit the calories you have left and learn what you like. Log one in a tap, or swap it." },
  { tab: "today", targets: ["css:[data-testid=supplements-today]"], optional: true, title: "Supplements and medicine", body: "Tick off each dose as you take it. Add them, with reminders, in Profile." },
  { tab: "today", targets: ["body-check"], title: "Body check", body: "Your BMI and a healthy weight range, with a recommendation for training and food that you can apply in one tap." },
  { tab: "today", targets: ["header:Today's limits"], title: "Today's limits", body: "Sugar, salt, saturated fat and fibre against what's healthy for a day." },
  { tab: "today", targets: ["css:.meal-head"], title: "Your meals", body: "Everything you log, by meal. Tap a food to change the amount or meal; swipe it left to delete (with Undo). Copy yesterday repeats a meal in one tap." },
  { tab: "today", title: "Swipe between tabs", body: "Swipe left or right anywhere on a screen to move to the next tab, as well as tapping the tab bar." },
];

const FOOD: Step[] = [
  { tab: "food", targets: ["food-search"], title: "Search 21,000+ foods", body: "Malaysian dishes, drinks and packaged foods, plus millions more online. Tap one to pick the amount and see its calories, health grade and how it fits your goal." },
  { tab: "food", targets: ["food-tools"], title: "Barcode, meals and your own foods", body: "Scan a barcode, build a meal from several foods to log in one tap, or add a food from its nutrition label." },
  { tab: "food", targets: ["food-lists"], title: "Your lists", body: "Recent foods, favourites (tap ☆ on any food), your saved meals and foods, and browsing by category." },
  { tab: "food", title: "Change what's in a dish", body: "Open a dish like nasi lemak to add or remove parts (less rice, extra egg); the calories update. Halal and allergy warnings follow your profile." },
];

const TRAIN: Step[] = [
  { tab: "train", targets: ["clock-in", "clock-out"], title: "Clock in", body: "Start a workout with a live timer and calories. Log each set's weight and reps; a rest timer starts after each set, and new personal records are celebrated." },
  { tab: "train", targets: ["css:[data-testid=cycle-training]"], optional: true, women: true, title: "Training with your cycle", body: "A tip for where you are in your cycle, and a lighter (80%) start on heavy days around your period." },
  { tab: "train", targets: ["todays-plan"], title: "Today's plan", body: "Your planned session for today. Clock in to start it with the weights progressive overload suggests from last time." },
  { tab: "train", targets: ["log-activity"], title: "Log an activity", body: "Futsal, swimming, badminton and 6,000+ more: pick one, enter how long, and the calories are added to your day." },
  { tab: "train", targets: ["tile:Exercise library"], title: "Exercise library", body: "Every exercise with pictures of the start and end position, form cues and the muscles it works. You can create your own." },
  { tab: "train", targets: ["tile:Track a run"], title: "Track a run or walk", body: "A street map with your route, distance, pace and calories. It keeps tracking with the screen locked, and auto-pause stops the clock when you stand still." },
  { tab: "train", targets: ["tile:Gym tools"], title: "Gym tools", body: "Which plates to load, your 1-rep max, and warm-up sets for any weight." },
  { tab: "train", targets: ["header:My routines"], title: "Your routines", body: "Save your own workouts, with supersets, and start them in one tap." },
  { tab: "train", targets: ["header:This week"], title: "Calendar and progress", body: "The days you trained, and charts of each lift's strength over time." },
  { tab: "train", targets: ["header:Personal records"], optional: true, title: "Personal records", body: "Your best lift for each exercise, as an estimated 1-rep max." },
  { tab: "train", targets: ["header:History"], optional: true, title: "History", body: "Every workout and activity. Tap one to see it or share it as a picture." },
];

const PLAN: Step[] = [
  { tab: "plan", targets: ["plan-tabs"], title: "Training, nutrition and meals", body: "Training is your weekly workout plan, Nutrition your daily targets and what to eat, and Meal planner lets you plan the week's meals with a grocery list." },
  { tab: "plan", targets: ["split"], title: "Choose your split", body: "Full body, upper/lower, push/pull/legs and more, with how many days a week you train." },
  { tab: "plan", targets: ["css:[data-testid=plan-day]"], title: "Your week", body: "Tap a day to see its exercises; tap an exercise to see how it's done. Press and hold a day or an exercise to drag it into your own order." },
  { tab: "plan", targets: ["header:How to progress"], optional: true, title: "How to progress", body: "When to add weight or reps, so you keep getting stronger." },
];

const PROFILE: Step[] = [
  { tab: "profile", targets: ["header:People"], title: "Family on one phone", body: "Add everyone who uses W on this phone. Each person has their own food, workouts, weight and cycle; switch here or by swiping your photo down on Today." },
  { tab: "profile", targets: ["field-weight"], title: "About you", body: "Keep your weight up to date. Your targets and plan adjust automatically." },
  { tab: "profile", targets: ["header:Goal"], title: "Your goal", body: "Lose fat, maintain or build muscle. It changes your calorie target, protein and training plan." },
  { tab: "profile", targets: ["header:Daily calorie target"], title: "Calorie target", body: "Automatic from your body and goal, or your own number, with a warning if it's too low." },
  { tab: "profile", targets: ["header:Diet"], title: "Diet, allergies and dislikes", body: "Halal, vegetarian and more; allergies and foods you don't eat are left out of meal ideas and plans, and warned about when you log them." },
  { tab: "profile", targets: ["header:Fasting"], optional: true, title: "Fasting", body: "Ramadan mode (sahur, iftar and moreh) or 16:8, with countdowns and reminders." },
  { tab: "profile", targets: ["header:Cycle"], optional: true, women: true, title: "Cycle", body: "Turn on cycle tracking for phase tips, period predictions, symptoms, the pill and a privacy lock." },
  { tab: "profile", targets: ["header:Steps"], optional: true, title: "Steps", body: "Count steps with your phone's motion sensor, set a goal, and add the calories you burn walking." },
  { tab: "profile", targets: ["row:Supplements & medicine"], optional: true, title: "Supplements and medicine", body: "Add what you take and when, with a reminder for each dose." },
  { tab: "profile", targets: ["header:Reminders"], title: "Reminders", body: "Meals, water and gym reminders at the times you choose." },
  { tab: "profile", targets: ["header:Language"], title: "Language and look", body: "English, Bahasa Melayu or 中文, light or dark, and bigger text if you like." },
  { tab: "profile", targets: ["header:Data"], title: "Backup and reports", body: "Back up everyone's data to a file and restore it on a new phone. Share a PDF report (for a doctor or coach) or a spreadsheet." },
];

const CYCLE: Step[] = [
  { tab: "profile", targets: ["header:Cycle"], title: "Turn on cycle tracking", body: "In Profile → Cycle. Set your usual cycle and period length; W learns your own from the periods you mark." },
  { tab: "today", targets: ["css:[data-testid=cycle-card]", "css:[data-testid=cycle-locked]"], optional: true, title: "Your cycle on Today", body: "Cycle day and phase, when your next period is due, and what it means for training and food. Before your period: craving swaps and, if you turn it on, a little extra to eat." },
  { tab: "today", targets: ["css:[data-testid=symptom-log]"], optional: true, title: "Flow and symptoms", body: "Log flow and symptoms in a few taps. After a couple of cycles W shows your patterns and warns you a day or two before they usually start." },
  { tab: "today", targets: ["css:[data-testid=period-food]"], optional: true, title: "Food that helps", body: "Pick heavy flow or a symptom and W suggests a food that helps, and why. Tap Another idea for more, or Log it to add it to today." },
  { tab: "today", targets: ["period-calendar-btn"], optional: true, title: "Period calendar", body: "Tap the days of each period, past ones too. Predicted days show as rings, and the fertile window if you turn it on (an estimate, not birth control)." },
  { tab: "today", targets: ["css:[data-testid=cycle-card] .btn-row"], optional: true, title: "History and health check", body: "How regular your cycles are, and anything worth mentioning to a doctor. Your cycles go in the PDF report too." },
  { tab: "today", targets: ["css:[data-testid=pill-card]"], optional: true, title: "The pill", body: "Day of your pack with a daily tick and reminder, and a quiet placebo or break week." },
  { tab: "today", targets: ["css:[data-testid=qada-card]"], optional: true, title: "Ramadan", body: "Period days in Ramadan aren't fasting days: sahur and iftar reminders rest, and they're counted as fasts to replace." },
  { tab: "profile", targets: ["css:[data-testid=cycle-lock-row]"], optional: true, title: "Keep it private", body: "On a shared phone, a PIN hides your cycle everywhere. Each person's cycle only ever shows in their own profile." },
];

export const GUIDES: Guide[] = [
  { id: "quick", title: "Quick tour", sub: "The main things, in about a minute", steps: QUICK_STEPS },
  { id: "today", title: "Today", sub: "Calories, water, sleep, logging food and your meals", steps: TODAY },
  { id: "food", title: "Food", sub: "Searching, barcodes, meals and your own foods", steps: FOOD },
  { id: "train", title: "Train", sub: "Workouts, activities, runs, routines and records", steps: TRAIN },
  { id: "plan", title: "Plan", sub: "Your training split, nutrition and meal planner", steps: PLAN },
  { id: "profile", title: "Profile and family", sub: "Goals, diet, reminders, language, backup and people", steps: PROFILE },
  { id: "cycle", title: "Cycle", sub: "Periods, symptoms, the pill and privacy", steps: CYCLE },
];
