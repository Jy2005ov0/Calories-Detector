import type { FoodRow } from "./worldFoods";

/** Ingredients that only exist as parts of dishes. Per 100 g, same columns as the food table. */
export const COMPONENT_ROWS: FoodRow[] = [
  ["Coconut rice (nasi lemak rice)", "Grains", 175, 3, 30, 4.8, 0.6, 0.2, 4, 150, "1 scoop", 75, "nasi lemak rice santan"],
  ["Ikan bilis (fried)", "Seafood", 447, 55, 5, 23, 0, 0, 3.5, 3000, "1 tbsp", 6, "fried anchovies"],
  ["Chicken rice (rice only)", "Grains", 190, 3.5, 30, 6.2, 0.4, 0.2, 1.8, 300, "1 bowl", 200, "nasi ayam rice"],
  ["Burger bun", "Grains", 279, 9, 50, 4.3, 2.3, 6, 1, 480, "1 bun", 55],
  ["Tonkotsu broth", "Japanese", 45, 2.5, 1.5, 3.2, 0, 0.3, 1.2, 420, "1 bowl", 350],
  ["Shawarma chicken", "Middle Eastern", 210, 24, 2, 12, 0.3, 0.6, 3, 480, "1 portion", 150],
  ["Garlic sauce (toum)", "Condiments", 560, 0.5, 4, 60, 0.2, 0.5, 4.5, 400, "1 tbsp", 15],
  ["Bolognese sauce", "Italian", 120, 9, 6, 6.8, 1.4, 3.5, 2.6, 330, "1 ladle", 150],
];

export interface RecipePart {
  /** Exact name of a food in the database. */
  food: string;
  /** Short name shown in the dish editor. */
  label: string;
  unit: string;
  unitGrams: number;
  /** Default number of units in one serving of the dish. */
  qty: number;
  /** Stepper increment, e.g. 0.5 for half an egg. */
  step?: number;
}

const p = (food: string, label: string, unit: string, unitGrams: number, qty: number, step = 1): RecipePart => ({ food, label, unit, unitGrams, qty, step });

/** What's inside common mixed dishes, for one serving. Users can change any amount or add extras. */
export const RECIPES: Record<string, RecipePart[]> = {
  "Nasi lemak (with sambal, egg, anchovies, peanuts)": [
    p("Coconut rice (nasi lemak rice)", "Coconut rice", "scoop", 75, 2),
    p("Sambal", "Sambal", "tbsp", 15, 2),
    p("Egg (boiled)", "Boiled egg", "egg", 50, 0.5, 0.5),
    p("Ikan bilis (fried)", "Ikan bilis", "tbsp", 6, 2),
    p("Peanuts (roasted)", "Peanuts", "tbsp", 9, 2),
    p("Cucumber", "Cucumber", "slice", 8, 3),
  ],
  "Nasi lemak ayam goreng": [
    p("Coconut rice (nasi lemak rice)", "Coconut rice", "scoop", 75, 2),
    p("Ayam goreng berempah", "Fried chicken", "piece", 150, 1),
    p("Sambal", "Sambal", "tbsp", 15, 2),
    p("Egg (fried)", "Fried egg", "egg", 46, 1),
    p("Ikan bilis (fried)", "Ikan bilis", "tbsp", 6, 2),
    p("Peanuts (roasted)", "Peanuts", "tbsp", 9, 2),
    p("Cucumber", "Cucumber", "slice", 8, 3),
  ],
  "Roti canai": [
    p("Roti canai", "Roti canai", "piece", 95, 1),
    p("Dhal curry", "Dhal", "ladle", 60, 1),
    p("Curry gravy", "Curry gravy", "ladle", 60, 0),
  ],
  "Nasi ayam (chicken rice, steamed)": [
    p("Chicken rice (rice only)", "Chicken rice", "bowl", 200, 1),
    p("Chicken (steamed/poached)", "Steamed chicken", "portion", 100, 1),
    p("Chili sauce", "Chilli sauce", "tbsp", 17, 1),
    p("Cucumber", "Cucumber", "slice", 8, 3),
    p("Chicken soup", "Soup", "bowl", 150, 1),
  ],
  "Nasi campur (rice + 2 dishes)": [
    p("White rice (cooked)", "White rice", "scoop", 100, 2),
    p("Chicken curry", "Chicken curry", "piece", 100, 1),
    p("Stir-fried mixed vegetables", "Vegetables", "scoop", 80, 1),
    p("Fried fish", "Fried fish", "piece", 80, 0),
    p("Egg (fried)", "Fried egg", "egg", 46, 0),
    p("Curry gravy", "Curry gravy", "ladle", 30, 1),
  ],
  "Nasi kandar (rice, chicken curry, gravy mix)": [
    p("White rice (cooked)", "White rice", "scoop", 100, 2),
    p("Chicken curry", "Chicken curry", "piece", 120, 1),
    p("Curry gravy", "Kuah campur", "ladle", 60, 1),
    p("Egg (fried)", "Fried egg", "egg", 46, 1),
    p("Stir-fried mixed vegetables", "Vegetables", "scoop", 60, 1),
  ],
  "Char kway teow": [
    p("Kway teow (flat rice noodles, cooked)", "Kway teow", "plate", 200, 1),
    p("Prawns (cooked)", "Prawns", "prawn", 12, 4),
    p("Egg (fried)", "Egg", "egg", 46, 1),
    p("Bean sprouts", "Bean sprouts", "handful", 40, 1),
    p("Fish cake", "Fish cake", "slice", 10, 3),
    p("Vegetable / palm oil", "Cooking oil", "tbsp", 13, 1.5, 0.5),
    p("Soy sauce", "Soy sauce", "tsp", 6, 2),
  ],
  "Mee goreng mamak": [
    p("Yellow noodles (cooked)", "Yellow noodles", "plate", 220, 1),
    p("Egg (fried)", "Egg", "egg", 46, 1),
    p("Fried tofu puffs", "Tofu puffs", "piece", 10, 2),
    p("Bean sprouts", "Bean sprouts", "handful", 30, 1),
    p("Vegetable / palm oil", "Cooking oil", "tbsp", 13, 1, 0.5),
    p("Chili sauce", "Chilli sauce", "tbsp", 17, 1),
  ],
  "Cheeseburger": [
    p("Burger bun", "Bun", "bun", 55, 1),
    p("Beef burger patty", "Beef patty", "patty", 90, 1),
    p("Cheese slice (processed)", "Cheese", "slice", 20, 1),
    p("Ketchup", "Ketchup", "tbsp", 17, 1),
    p("Lettuce", "Lettuce", "leaf", 10, 1),
    p("Tomato", "Tomato", "slice", 20, 1),
    p("Bacon (cooked)", "Bacon", "slice", 8, 0),
    p("Mayonnaise", "Mayonnaise", "tbsp", 14, 0),
  ],
  "Full English breakfast": [
    p("Egg (fried)", "Fried egg", "egg", 46, 2),
    p("Bacon (cooked)", "Bacon", "rasher", 8, 2),
    p("Sausage (chicken)", "Sausage", "sausage", 50, 2),
    p("Baked beans", "Baked beans", "scoop", 100, 1),
    p("Mushrooms", "Mushrooms", "handful", 50, 1),
    p("Tomato", "Grilled tomato", "half", 60, 1),
    p("White bread", "Toast", "slice", 28, 1),
    p("Butter", "Butter", "pat", 5, 1),
  ],
  "Kaya toast": [
    p("White bread", "Toast", "slice", 28, 2),
    p("Kaya (coconut jam)", "Kaya", "tbsp", 20, 1),
    p("Butter", "Butter", "slab", 10, 1),
    p("Half-boiled eggs", "Half-boiled eggs", "egg", 50, 2),
  ],
  "Bibimbap": [
    p("White rice (cooked)", "Rice", "bowl", 200, 1),
    p("Lean ground beef (cooked)", "Beef", "portion", 60, 1),
    p("Egg (fried)", "Fried egg", "egg", 46, 1),
    p("Spinach", "Spinach", "handful", 30, 1),
    p("Bean sprouts", "Bean sprouts", "handful", 30, 1),
    p("Carrot", "Carrot", "handful", 30, 1),
    p("Gochujang", "Gochujang", "tbsp", 18, 1),
    p("Olive oil", "Sesame oil", "tsp", 5, 1),
  ],
  "Burrito bowl (chicken)": [
    p("White rice (cooked)", "Rice", "scoop", 150, 1),
    p("Chicken breast (grilled, skinless)", "Chicken", "portion", 120, 1),
    p("Black beans (cooked)", "Black beans", "scoop", 80, 1),
    p("Salsa (pico de gallo)", "Salsa", "scoop", 50, 1),
    p("Guacamole", "Guacamole", "scoop", 50, 1),
    p("Cheddar cheese", "Cheese", "handful", 20, 1),
    p("Lettuce", "Lettuce", "handful", 30, 1),
  ],
  "Poke bowl (salmon)": [
    p("White rice (cooked)", "Sushi rice", "bowl", 150, 1),
    p("Sashimi (salmon)", "Salmon", "portion", 100, 1),
    p("Avocado", "Avocado", "quarter", 50, 1),
    p("Edamame", "Edamame", "handful", 40, 1),
    p("Cucumber", "Cucumber", "handful", 30, 1),
    p("Seaweed salad", "Seaweed salad", "scoop", 30, 1),
    p("Soy sauce", "Soy sauce", "tsp", 6, 2),
    p("Mayonnaise", "Spicy mayo", "tbsp", 14, 1),
  ],
  "Chicken shawarma plate (with rice)": [
    p("Basmati rice (cooked)", "Rice", "scoop", 180, 1),
    p("Shawarma chicken", "Shawarma chicken", "portion", 150, 1),
    p("Garlic sauce (toum)", "Garlic sauce", "tbsp", 15, 1),
    p("Mixed salad (no dressing)", "Salad", "handful", 60, 1),
    p("Pita bread", "Pita", "pita", 60, 0),
  ],
  "Spaghetti bolognese": [
    p("Pasta (cooked)", "Spaghetti", "plate", 200, 1),
    p("Bolognese sauce", "Bolognese sauce", "ladle", 150, 1),
    p("Parmesan cheese", "Parmesan", "tbsp", 5, 2),
  ],
  "Ramen (tonkotsu)": [
    p("Egg noodles (cooked)", "Noodles", "portion", 150, 1),
    p("Tonkotsu broth", "Broth", "bowl", 350, 1),
    p("Pork belly (roasted)", "Chashu pork", "slice", 25, 2),
    p("Half-boiled eggs", "Ramen egg", "egg", 50, 1),
    p("Bean sprouts", "Bean sprouts", "handful", 30, 1),
  ],
};
