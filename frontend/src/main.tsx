import {
  StrictMode,
} from "react"

import {
  createRoot,
} from "react-dom/client"

import "./index.css"

import App from "./App.tsx"

const rootElement =
  document.getElementById(
    "brand-compliance-ai-root",
  ) ??
  document.getElementById(
    "root",
  )

if (!rootElement) {
  throw new Error(
    "Brand Compliance AI root element was not found.",
  )
}

createRoot(
  rootElement,
).render(
  <StrictMode>
    <App />
  </StrictMode>,
)