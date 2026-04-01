import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Providers } from "@/providers/Providers";
import { AuthGate } from "@/components/auth/AuthGate";
import { ProjectRedirect } from "@/components/auth/ProjectRedirect";
import { AppShell } from "@/components/layout/AppShell";
import { lazy, Suspense } from "react";
import { PageSkeleton } from "@/components/shared/PageSkeleton";
import { ErrorBoundary, DevConsoleOverlay } from "@/components/shared/DevErrorOverlay";

const AuthPage = lazy(() => import("@/pages/AuthPage"));
const OnboardingWizard = lazy(() => import("@/pages/OnboardingWizard"));
const ProjectList = lazy(() => import("@/pages/ProjectList"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Inbox = lazy(() => import("@/pages/Inbox"));
const HelpCenter = lazy(() => import("@/pages/HelpCenter"));
const Team = lazy(() => import("@/pages/Team"));
const TeamMemberDetail = lazy(() => import("@/pages/TeamMemberDetail"));
const Tasks = lazy(() => import("@/pages/Tasks"));
const TaskDetail = lazy(() => import("@/pages/TaskDetail"));
const Goals = lazy(() => import("@/pages/Goals"));
const Costs = lazy(() => import("@/pages/Costs"));
const Activity = lazy(() => import("@/pages/Activity"));
const OutputBrowser = lazy(() => import("@/pages/OutputBrowser"));
const WorkStyle = lazy(() => import("@/pages/WorkStyle"));
const AccountSettings = lazy(() => import("@/pages/AccountSettings"));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"));

export function App() {
  return (
    <ErrorBoundary>
    <BrowserRouter>
      <Providers>
        <DevConsoleOverlay />
        <Suspense fallback={<PageSkeleton variant="full" />}>
          <Routes>
            {/* Public pages */}
            <Route path="/auth" element={<AuthPage />} />

            {/* Authenticated routes */}
            <Route element={<AuthGate />}>
              <Route path="/" element={<ProjectRedirect />} />
              <Route path="/onboarding" element={<OnboardingWizard />} />
              <Route path="/projects" element={<ProjectList />} />
              {/* Project-scoped pages (AppShell layout) */}
              <Route path="/p/:projectId" element={<AppShell />}>
                <Route index element={<Navigate to="home" replace />} />
                <Route path="home" element={<Dashboard />} />
                <Route path="inbox" element={<Inbox />} />
                <Route path="help" element={<HelpCenter />} />
                <Route path="team" element={<Team />} />
                <Route path="team/:memberId" element={<TeamMemberDetail />} />
                <Route path="tasks" element={<Tasks />} />
                <Route path="tasks/:taskId" element={<TaskDetail />} />
                <Route path="goals" element={<Goals />} />
                <Route path="costs" element={<Costs />} />
                <Route path="activity" element={<Activity />} />
                <Route path="results/*" element={<OutputBrowser />} />
                <Route path="settings/style" element={<WorkStyle />} />
                <Route path="account" element={<AccountSettings />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Route>

            {/* 404 */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </Providers>
    </BrowserRouter>
    </ErrorBoundary>
  );
}
