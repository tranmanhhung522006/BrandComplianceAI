import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom"

import {
  RequireAuth,
} from "@/components/auth/RequireAuth"

import {
  RequireRole,
} from "@/components/auth/RequireRole"

import {
  AppLayout,
} from "@/components/layout/AppLayout"

import {
  AuthProvider,
} from "@/context/AuthContext"

import {
  AdminReleasePage,
} from "@/pages/AdminReleasePage"

import {
  AssetDetailPage,
} from "@/pages/AssetDetailPage"

import {
  AssetsPage,
} from "@/pages/AssetsPage"

import {
  AuditLogPage,
} from "@/pages/AuditLogPage"

import {
  CampaignDetailPage,
} from "@/pages/CampaignDetailPage"

import {
  CampaignTeamPage,
} from "@/pages/CampaignTeamPage"

import {
  CampaignsPage,
} from "@/pages/CampaignsPage"

import {
  ComplianceDocumentsPage,
} from "@/pages/ComplianceDocumentsPage"

import {
  CreateAssetPage,
} from "@/pages/CreateAssetPage"

import {
  CreateCampaignPage,
} from "@/pages/CreateCampaignPage"

import {
  DashboardPage,
} from "@/pages/DashboardPage"

import {
  LoginPage,
} from "@/pages/LoginPage"

import {
  ReviewDetailPage,
} from "@/pages/ReviewDetailPage"

import {
  ReviewQueuePage,
} from "@/pages/ReviewQueuePage"

import {
  UploadAssetPage,
} from "@/pages/UploadAssetPage"

function getAppBasename() {
  const configuredBase =
    import.meta.env.VITE_APP_BASE?.trim() ||
    "/"

  if (
    configuredBase === "/"
  ) {
    return "/"
  }

  return `/${configuredBase
    .replace(
      /^\/+/,
      "",
    )
    .replace(
      /\/+$/,
      "",
    )}`
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <LoginPage />
        }
      />

      <Route
        element={
          <RequireAuth />
        }
      >
        <Route
          element={
            <AppLayout />
          }
        >
          <Route
            path="/"
            element={
              <DashboardPage />
            }
          />

          <Route
            path="/assets"
            element={
              <AssetsPage />
            }
          />

          <Route
            path="/assets/:assetId"
            element={
              <AssetDetailPage />
            }
          />

          <Route
            path="/campaigns"
            element={
              <CampaignsPage />
            }
          />

          <Route
            path="/campaigns/:campaignId"
            element={
              <CampaignDetailPage />
            }
          />

          <Route
            path="/campaigns/:campaignId/team"
            element={
              <CampaignTeamPage />
            }
          />

          <Route
            path="/campaigns/new"
            element={
              <CreateCampaignPage />
            }
          />

          <Route
            path="/admin/audit"
            element={
              <AuditLogPage />
            }
          />

          <Route
            element={
              <RequireRole
                allowed={[
                  "MAKER",
                ]}
              />
            }
          >
            <Route
              path="/assets/new"
              element={
                <CreateAssetPage />
              }
            />

            <Route
              path="/upload"
              element={
                <UploadAssetPage />
              }
            />
          </Route>

          <Route
            element={
              <RequireRole
                allowed={[
                  "CHECKER",
                ]}
              />
            }
          >
            <Route
              path="/reviews"
              element={
                <ReviewQueuePage />
              }
            />

            <Route
              path="/reviews/:versionId"
              element={
                <ReviewDetailPage />
              }
            />
          </Route>

          <Route
            element={
              <RequireRole
                allowed={[
                  "ADMIN",
                ]}
              />
            }
          >
            <Route
              path="/admin/releases"
              element={
                <AdminReleasePage />
              }
            />

            <Route
              path="/admin/compliance"
              element={
                <ComplianceDocumentsPage />
              }
            />
          </Route>

          <Route
            path="*"
            element={
              <Navigate
                to="/"
                replace
              />
            }
          />
        </Route>
      </Route>
    </Routes>
  )
}

function App() {
  const basename =
    getAppBasename()

  return (
    <BrowserRouter
      basename={basename}
    >
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App