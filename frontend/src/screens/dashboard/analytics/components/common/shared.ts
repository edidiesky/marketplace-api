import { useState } from "react";

export default function useFilter(initial = "3-months") {
  return useState(initial);
}