// Runtime-local assets: Metro resolves these static require calls into the app bundle.
export const mediaFallbacks = {
  drop: require("../../assets/drop-default.png"),
  restaurantCover: require("../../assets/restaurant-cover-default.png"),
} as const;
