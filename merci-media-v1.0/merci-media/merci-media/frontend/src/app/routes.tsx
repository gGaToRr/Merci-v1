import { createBrowserRouter } from "react-router";
import { DashboardLayout } from "./components/DashboardLayout";
import { RequireAuth } from "./components/RequireAuth";
import { Login } from "./pages/Login";
import { Search } from "./pages/Search";
import { Video } from "./pages/Video";
import { TheGoodPlace } from "./pages/TheGoodPlace";
import { Queue } from "./pages/Queue";
import { Downloads } from "./pages/Downloads";
import { Profile } from "./pages/Profile";

function ProtectedLayout() {
  return (
    <RequireAuth>
      <DashboardLayout />
    </RequireAuth>
  );
}

export const router = createBrowserRouter([
  {
    path: "/login",
    Component: Login,
  },
  {
    path: "/",
    Component: ProtectedLayout,
    children: [
      { index: true, Component: Search },
      { path: "video", Component: Video },
      { path: "films", Component: TheGoodPlace },
      { path: "queue", Component: Queue },
      { path: "downloads", Component: Downloads },
      { path: "profile", Component: Profile },
    ],
  },
]);
