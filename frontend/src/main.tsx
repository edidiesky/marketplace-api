import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import ProviderLayout from "./providers/StoreProvider";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ProviderLayout>
      <App />
    </ProviderLayout>
  </StrictMode>
);