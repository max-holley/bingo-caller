import { isChristmas, isHalloween } from './themes';

// Classic bingo call names (for fun!) — falls back to plain "Number N"
const CALLS: Record<number, string> = {
  1: "Kelly's Eye", 2: "One Little Duck", 3: "Cup of Tea",
  4: "Knock at the Door", 5: "Man Alive", 6: "Tom Mix",
  7: "Lucky Seven", 8: "One Fat Lady", 9: "Doctor's Orders",
  10: "Theresa's Den", 11: "Legs Eleven", 12: "One Dozen",
  13: "Unlucky for Some", 14: "Valentine's Day", 15: "Young and Keen",
  16: "Never Been Kissed", 17: "Dancing Queen", 18: "Coming of Age",
  19: "Goodbye Teens", 20: "One Score", 21: "Key of the Door",
  22: "Two Little Ducks", 23: "The Lord is My Shepherd", 24: "Two Dozen",
  25: "Duck and Dive", 26: "Pick and Mix", 27: "Gateway to Heaven",
  28: "Overweight", 29: "Rise and Shine", 30: "Dirty Gertie",
  31: "Get Up and Run", 32: "Buckle My Shoe", 33: "Dirty Knee",
  34: "Ask for More", 35: "Jump and Jive", 36: "Three Dozen",
  37: "More than Eleven", 38: "Christmas Cake", 39: "Steps",
  40: "Naughty Forty", 41: "Time for Fun", 42: "Winnie the Pooh",
  43: "Down on Your Knees", 44: "Droopy Drawers", 45: "Halfway There",
  46: "Up to Tricks", 47: "Four and Seven", 48: "Four Dozen",
  49: "PC", 50: "Half a Century", 51: "Tweak of the Thumb",
  52: "Danny La Rue", 53: "Stuck in the Tree", 54: "Clean the Floor",
  55: "Snakes Alive", 56: "Shotts Bus", 57: "Heinz Varieties",
  58: "Make Them Wait", 59: "Brighton Line", 60: "Five Dozen",
  61: "Baker's Bun", 62: "Tickety-boo", 63: "Tickle Me",
  64: "Red Raw", 65: "Old Age Pension", 66: "Clickety Click",
  67: "Made in Heaven", 68: "Saving Grace", 69: "Anyway Up",
  70: "Three Score and Ten", 71: "Bang on the Drum", 72: "Six Dozen",
  73: "Queen Bee", 74: "Hit the Floor", 75: "Strive and Strive",
  76: "Trombones", 77: "Sunset Strip", 78: "Heaven's Gate",
  79: "One More Time", 80: "Eight and Blank", 81: "Stop and Run",
  82: "Straight on Through", 83: "Time for Tea", 84: "Seven Dozen",
  85: "Staying Alive", 86: "Between the Sticks", 87: "Torquay in Devon",
  88: "Two Fat Ladies", 89: "Nearly There", 90: "Top of the Shop",
};

const SPOOKY_CALLS: Record<number, string> = {
  1: "One Lonely Ghost", 4: "Knock Knock — Who's There?", 7: "Seven Spooky Spiders",
  10: "Midnight Strikes Ten", 13: "Unlucky for Some 👻", 21: "Witch's Brew",
  31: "Halloween Night 🎃", 33: "Creepy Knees", 44: "Skeleton Doors",
  55: "Snakes in the Cauldron", 66: "Clickety Bones", 77: "Graveyard Strip",
  88: "Two Fat Pumpkins", 90: "Top of the Crypt",
};

const XMAS_CALLS: Record<number, string> = {
  1: "Rudolph's Red Nose", 2: "Two Turtle Doves", 3: "Three Wise Men",
  5: "Five Gold Rings", 8: "Eight Tiny Reindeer", 9: "Santa's Sleigh Team",
  12: "Twelve Days of Christmas", 21: "Shortest Day", 24: "Christmas Eve",
  25: "Christmas Day 🎄", 26: "Boxing Day", 38: "Christmas Cake 🎂",
  40: "Naughty or Nice", 52: "Deck the Halls", 77: "Sleigh Bells Ring",
  88: "Two Fat Snowmen ⛄", 90: "Top of the Tree ⭐",
};

export function numberToWords(n: number): string {
  if (isHalloween() && SPOOKY_CALLS[n]) return SPOOKY_CALLS[n];
  if (isChristmas() && XMAS_CALLS[n]) return XMAS_CALLS[n];
  return CALLS[n] || `Number ${n}`;
}
