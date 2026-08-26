// Nearest-match naming against the CSS Color Module Level 4 extended
// keyword set (no network lookup required).

import { hexToRgb } from "./colorUtils";

const NAMED_COLORS: [string, string][] = [
  ["Black", "#000000"], ["Dim Gray", "#696969"], ["Gray", "#808080"], ["Dark Gray", "#a9a9a9"],
  ["Silver", "#c0c0c0"], ["Light Gray", "#d3d3d3"], ["Gainsboro", "#dcdcdc"], ["White Smoke", "#f5f5f5"],
  ["White", "#ffffff"], ["Rosy Brown", "#bc8f8f"], ["Indian Red", "#cd5c5c"], ["Brown", "#a52a2a"],
  ["Fire Brick", "#b22222"], ["Dark Red", "#8b0000"], ["Maroon", "#800000"], ["Red", "#ff0000"],
  ["Salmon", "#fa8072"], ["Dark Salmon", "#e9967a"], ["Light Salmon", "#ffa07a"], ["Tomato", "#ff6347"],
  ["Orange Red", "#ff4500"], ["Coral", "#ff7f50"], ["Dark Orange", "#ff8c00"], ["Orange", "#ffa500"],
  ["Gold", "#ffd700"], ["Dark Golden Rod", "#b8860b"], ["Golden Rod", "#daa520"], ["Pale Golden Rod", "#eee8aa"],
  ["Khaki", "#f0e68c"], ["Dark Khaki", "#bdb76b"], ["Olive", "#808000"], ["Yellow", "#ffff00"],
  ["Yellow Green", "#9acd32"], ["Dark Olive Green", "#556b2f"], ["Olive Drab", "#6b8e23"], ["Lawn Green", "#7cfc00"],
  ["Chartreuse", "#7fff00"], ["Green Yellow", "#adff2f"], ["Dark Green", "#006400"], ["Green", "#008000"],
  ["Forest Green", "#228b22"], ["Lime", "#00ff00"], ["Lime Green", "#32cd32"], ["Light Green", "#90ee90"],
  ["Pale Green", "#98fb98"], ["Dark Sea Green", "#8fbc8f"], ["Medium Spring Green", "#00fa9a"], ["Spring Green", "#00ff7f"],
  ["Sea Green", "#2e8b57"], ["Medium Aqua Marine", "#66cdaa"], ["Medium Sea Green", "#3cb371"], ["Light Sea Green", "#20b2aa"],
  ["Dark Slate Gray", "#2f4f4f"], ["Teal", "#008080"], ["Dark Cyan", "#008b8b"], ["Aqua", "#00ffff"],
  ["Cyan", "#00ffff"], ["Light Cyan", "#e0ffff"], ["Dark Turquoise", "#00ced1"], ["Turquoise", "#40e0d0"],
  ["Medium Turquoise", "#48d1cc"], ["Pale Turquoise", "#afeeee"], ["Aqua Marine", "#7fffd4"], ["Powder Blue", "#b0e0e6"],
  ["Cadet Blue", "#5f9ea0"], ["Steel Blue", "#4682b4"], ["Corn Flower Blue", "#6495ed"], ["Deep Sky Blue", "#00bfff"],
  ["Dodger Blue", "#1e90ff"], ["Light Blue", "#add8e6"], ["Sky Blue", "#87ceeb"], ["Light Sky Blue", "#87cefa"],
  ["Midnight Blue", "#191970"], ["Navy", "#000080"], ["Dark Blue", "#00008b"], ["Medium Blue", "#0000cd"],
  ["Blue", "#0000ff"], ["Royal Blue", "#4169e1"], ["Blue Violet", "#8a2be2"], ["Indigo", "#4b0082"],
  ["Dark Slate Blue", "#483d8b"], ["Slate Blue", "#6a5acd"], ["Medium Slate Blue", "#7b68ee"], ["Medium Purple", "#9370db"],
  ["Dark Magenta", "#8b008b"], ["Dark Violet", "#9400d3"], ["Dark Orchid", "#9932cc"], ["Medium Orchid", "#ba55d3"],
  ["Purple", "#800080"], ["Thistle", "#d8bfd8"], ["Plum", "#dda0dd"], ["Violet", "#ee82ee"],
  ["Magenta", "#ff00ff"], ["Orchid", "#da70d6"], ["Medium Violet Red", "#c71585"], ["Pale Violet Red", "#db7093"],
  ["Deep Pink", "#ff1493"], ["Hot Pink", "#ff69b4"], ["Light Pink", "#ffb6c1"], ["Pink", "#ffc0cb"],
  ["Antique White", "#faebd7"], ["Beige", "#f5f5dc"], ["Bisque", "#ffe4c4"], ["Blanched Almond", "#ffebcd"],
  ["Wheat", "#f5deb3"], ["Corn Silk", "#fff8dc"], ["Lemon Chiffon", "#fffacd"], ["Light Golden Rod Yellow", "#fafad2"],
  ["Light Yellow", "#ffffe0"], ["Saddle Brown", "#8b4513"], ["Sienna", "#a0522d"], ["Chocolate", "#d2691e"],
  ["Peru", "#cd853f"], ["Sandy Brown", "#f4a460"], ["Burly Wood", "#deb887"], ["Tan", "#d2b48c"],
  ["Moccasin", "#ffe4b5"], ["Navajo White", "#ffdead"], ["Peach Puff", "#ffdab9"], ["Misty Rose", "#ffe4e1"],
  ["Lavender Blush", "#fff0f5"], ["Linen", "#faf0e6"], ["Old Lace", "#fdf5e6"], ["Papaya Whip", "#ffefd5"],
  ["Sea Shell", "#fff5ee"], ["Mint Cream", "#f5fffa"], ["Slate Gray", "#708090"], ["Light Slate Gray", "#778899"],
  ["Light Steel Blue", "#b0c4de"], ["Lavender", "#e6e6fa"], ["Floral White", "#fffaf0"], ["Alice Blue", "#f0f8ff"],
  ["Ghost White", "#f8f8ff"], ["Honeydew", "#f0fff0"], ["Ivory", "#fffff0"], ["Azure", "#f0ffff"],
  ["Snow", "#fffafa"], ["Fuchsia", "#ff00ff"], ["Crimson", "#dc143c"], ["Dark Sea Green", "#8fbc8f"],
];

/** Redmean color-distance approximation — better perceptual match than plain Euclidean RGB. */
function redmeanDistance(a: [number, number, number], b: [number, number, number]): number {
  const [r1, g1, b1] = a;
  const [r2, g2, b2] = b;
  const rMean = (r1 + r2) / 2;
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt((2 + rMean / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rMean) / 256) * db * db);
}

/** Nearest named color to the given hex, e.g. "Medium Purple". */
export function nearestColorName(hex: string): string {
  const target = hexToRgb(hex);
  let best = NAMED_COLORS[0]!;
  let bestDist = Infinity;
  for (const entry of NAMED_COLORS) {
    const dist = redmeanDistance(target, hexToRgb(entry[1]));
    if (dist < bestDist) {
      bestDist = dist;
      best = entry;
    }
  }
  return best[0];
}
