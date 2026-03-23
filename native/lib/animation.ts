import { Easing } from "react-native";

export const ANIMATION = {
  fast:   150,
  medium: 250,
  slow:   400,

  spring: {
    standard: { tension: 80,  friction: 12 },
    snappy:   { tension: 120, friction: 10 },
    gentle:   { tension: 50,  friction: 14 },
  },

  easing: {
    standard:   Easing.bezier(0.4, 0.0, 0.2, 1),
    decelerate: Easing.bezier(0.0, 0.0, 0.2, 1),
    accelerate: Easing.bezier(0.4, 0.0, 1,   1),
  },
} as const;
