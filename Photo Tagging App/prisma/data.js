// The pictures and the characters hiding in them. `npm run seed` copies this
// into the database. Spots are measured in pixels on the full-size image:
// [left, top, width, height].

const characters = [
  {
    slug: "mabel",
    name: "Mabel",
    description: "Yellow raincoat, red boots and a red umbrella",
  },
  {
    slug: "captain-gull",
    name: "Captain Gull",
    description: "Pirate hat, navy coat and a parrot on his shoulder",
  },
  {
    slug: "professor-fern",
    name: "Professor Fern",
    description: "White coat, round glasses and a butterfly net",
  },
  {
    slug: "biscuit",
    name: "Biscuit",
    description: "A small white dog with brown ears and a red bandana",
  },
];

const scenes = [
  {
    slug: "beach",
    title: "The Beach",
    description: "A hot day by the sea, with a pier, a lifeguard tower and a long queue for ice cream.",
    width: 2800,
    height: 1800,
    spots: {
      mabel: [1112, 1099, 43, 77],
      "captain-gull": [2317, 234, 26, 51],
      "professor-fern": [1634, 547, 44, 65],
      biscuit: [189, 1760, 37, 29],
    },
  },
  {
    slug: "park",
    title: "Park Fair",
    description: "Food stalls, a fountain, picnics on the grass and paddle boats on the pond.",
    width: 2800,
    height: 1800,
    spots: {
      mabel: [892, 488, 38, 66],
      "captain-gull": [1917, 757, 29, 58],
      "professor-fern": [543, 1258, 52, 76],
      biscuit: [1206, 1419, 35, 27],
    },
  },
  {
    slug: "winter",
    title: "Winter Market",
    description: "Wooden huts, a giant tree and an ice rink full of wobbly skaters.",
    width: 2800,
    height: 1800,
    spots: {
      mabel: [1814, 830, 41, 72],
      "captain-gull": [2569, 466, 28, 55],
      "professor-fern": [659, 1534, 55, 81],
      biscuit: [421, 637, 29, 23],
    },
  },
];

module.exports = { characters, scenes };
