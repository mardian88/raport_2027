import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './hooks/useAuth';
import Layout from './components/layout/Layout';
import Settings from './pages/settings/Settings';
import Students from './pages/master/Students';
import Academic from './pages/master/Academic';
import SurahManagement from './pages/master/SurahManagement';
import HalaqahManagement from './pages/master/HalaqahManagement';
import TeacherManagement from './pages/master/TeacherManagement';
import TeacherAssignments from './pages/master/TeacherAssignments';
import StudentSurahManagement from './pages/master/StudentSurahManagement';
import RaportInput from './pages/raport/RaportInput';
import GuruInput from './pages/raport/GuruInput';
import LegerNilai from './pages/raport/LegerNilai';
import Peringkat from './pages/raport/Peringkat';
import RaportPrint from './pages/raport/RaportPrint';
import RaportPrintBlank from './pages/raport/RaportPrintBlank';

import Dashboard from './pages/dashboard/Dashboard';
import UserManagement from './pages/users/UserManagement';
import TahsinManagement from './pages/tahsin/TahsinManagement';
import Login from './pages/auth/Login';
import { Toaster } from './components/ui/toaster';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/print/blank" element={<RaportPrintBlank />} />
            <Route path="/print/:id" element={<RaportPrint />} />
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/users" element={<UserManagement />} />
              <Route path="/students" element={<Students />} />
              <Route path="/academic" element={<Academic />} />
              <Route path="/surah" element={<SurahManagement />} />
              <Route path="/halaqah" element={<HalaqahManagement />} />
              <Route path="/teachers" element={<TeacherManagement />} />
              <Route path="/teacher-assignments" element={<TeacherAssignments />} />
              <Route path="/tahsin" element={<TahsinManagement />} />
              <Route path="/student-surah" element={<StudentSurahManagement />} />
              <Route path="/raport/input" element={<RaportInput />} />
              <Route path="/guru/input" element={<GuruInput />} />
              <Route path="/raport/leger" element={<LegerNilai />} />
              <Route path="/raport/peringkat" element={<Peringkat />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Routes>
          <Toaster />
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
