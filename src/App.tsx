import {Route, Routes} from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Terms from './pages/Terms';
import Dashboard from './pages/Dashboard';
import BucketShare from './pages/BucketShare';
import MyBucket from './pages/MyBucket';
import NotFound from './pages/NotFound';
import Admin from './pages/Admin';
import { SharedUploadModal } from './components/dashboard/shared-upload-modal';
import { ImpersonationBanner } from './components/admin/ImpersonationBanner';
import { Toaster } from 'react-hot-toast';

const App = () => {
  return (
    <>
      <ImpersonationBanner />
      <Toaster position="top-right" />
      <SharedUploadModal onUploadSuccess={() => window.location.reload()} />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/bucket/:id" element={<BucketShare />} />
        <Route path="/shared-bucket/:id" element={<BucketShare />} />
        <Route path="/mybucket/:id" element={<MyBucket />} />
        <Route path="/terms-conditions" element={<Terms />} />
        <Route path="/404" element={<NotFound />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

export default App;
