import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { preloadRoutes } from "./lib/preloadRoutes";

createRoot(document.getElementById("root")!).render(<App />);

preloadRoutes();
