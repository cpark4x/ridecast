import React from "react";
import { View } from "react-native";
import ShimmerCard from "./ShimmerCard";

interface SkeletonListProps {
  count?: number;
}

export default function SkeletonList({ count = 5 }: SkeletonListProps) {
  return (
    <View style={{ paddingTop: 4 }}>
      {Array.from({ length: count }).map((_, i) => (
        <ShimmerCard key={i} />
      ))}
    </View>
  );
}