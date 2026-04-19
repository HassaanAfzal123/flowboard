import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Organizations from './pages/Organizations';
import OrganizationProjects from './pages/OrganizationProjects';
import OrganizationMembers from './pages/OrganizationMembers';
import OrganizationSettings from './pages/OrganizationSettings';
import ProjectDetail from './pages/ProjectDetail';
import TaskDetail from './pages/TaskDetail';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/organizations" element={<Organizations />} />
        <Route path="/organizations/:orgId/projects" element={<OrganizationProjects />} />
        <Route path="/organizations/:orgId/members" element={<OrganizationMembers />} />
        <Route path="/organizations/:orgId/settings" element={<OrganizationSettings />} />
        <Route path="/projects/:projectId" element={<ProjectDetail />} />
        <Route path="/tasks/:taskId" element={<TaskDetail />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
