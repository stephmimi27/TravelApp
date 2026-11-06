"use strict";

/* Offline destination suggestions and display labels. */

const sceneNames = {
  city: "City lights",
  japan: "Cherry blossom",
  mountains: "Alpine escape",
  montreal: "Old town",
  coast: "By the sea",
};
const places = {
  "hong kong": { country: "China", lat: 22.32, lon: 114.17, scene: "city" },
  montréal: { country: "Canada", lat: 45.5, lon: -73.57, scene: "montreal" },
  montreal: { country: "Canada", lat: 45.5, lon: -73.57, scene: "montreal" },
  banff: { country: "Canada", lat: 51.18, lon: -115.57, scene: "mountains" },
  vancouver: {
    country: "Canada",
    lat: 49.28,
    lon: -123.12,
    scene: "mountains",
  },
  toronto: { country: "Canada", lat: 43.65, lon: -79.38, scene: "city" },
  "quebec city": {
    country: "Canada",
    lat: 46.81,
    lon: -71.21,
    scene: "montreal",
  },
  tokyo: { country: "Japan", lat: 35.68, lon: 139.69, scene: "japan" },
  kyoto: { country: "Japan", lat: 35.01, lon: 135.77, scene: "japan" },
  osaka: { country: "Japan", lat: 34.69, lon: 135.5, scene: "japan" },
  seoul: { country: "South Korea", lat: 37.57, lon: 126.98, scene: "city" },
  taipei: { country: "Taiwan", lat: 25.03, lon: 121.57, scene: "city" },
  singapore: { country: "Singapore", lat: 1.35, lon: 103.82, scene: "city" },
  bangkok: { country: "Thailand", lat: 13.76, lon: 100.5, scene: "city" },
  bali: { country: "Indonesia", lat: -8.34, lon: 115.09, scene: "coast" },
  sydney: { country: "Australia", lat: -33.87, lon: 151.21, scene: "coast" },
  paris: { country: "France", lat: 48.86, lon: 2.35, scene: "montreal" },
  london: { country: "United Kingdom", lat: 51.51, lon: -0.13, scene: "city" },
  rome: { country: "Italy", lat: 41.9, lon: 12.5, scene: "montreal" },
  barcelona: { country: "Spain", lat: 41.39, lon: 2.17, scene: "coast" },
  lisbon: { country: "Portugal", lat: 38.72, lon: -9.14, scene: "coast" },
  amsterdam: {
    country: "Netherlands",
    lat: 52.37,
    lon: 4.9,
    scene: "montreal",
  },
  "new york": {
    country: "United States",
    lat: 40.71,
    lon: -74.01,
    scene: "city",
  },
  "san francisco": {
    country: "United States",
    lat: 37.77,
    lon: -122.42,
    scene: "city",
  },
  "los angeles": {
    country: "United States",
    lat: 34.05,
    lon: -118.24,
    scene: "coast",
  },
  honolulu: {
    country: "United States",
    lat: 21.31,
    lon: -157.86,
    scene: "coast",
  },
  cancun: { country: "Mexico", lat: 21.16, lon: -86.85, scene: "coast" },
  "mexico city": { country: "Mexico", lat: 19.43, lon: -99.13, scene: "city" },
  reykjavik: {
    country: "Iceland",
    lat: 64.15,
    lon: -21.94,
    scene: "mountains",
  },
  zurich: { country: "Switzerland", lat: 47.38, lon: 8.54, scene: "mountains" },
  beijing: { country: "China", lat: 39.9, lon: 116.4, scene: "city" },
  shanghai: { country: "China", lat: 31.23, lon: 121.47, scene: "city" },
};
const feelingLabel = (v) =>
  ({
    "Little joys": "Happy",
    "In awe": "Impressed",
    "At peace": "Relaxed",
    "Feeling free": "Relaxed",
    "Full of wonder": "Curious",
    "A little nostalgic": "Nostalgic",
    "With my people": "With friends",
  })[v] || v;
