import {Route, Routes} from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Terms from './pages/Terms';
import Dashboard from './pages/Dashboard';
import BucketShare from './pages/BucketShare';
import MyBucket from './pages/MyBucket';

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/bucket/:id" element={<BucketShare />} />
      <Route path="/mybucket/:id" element={<MyBucket />} />

      <Route path="/terms-conditions" element={<Terms />} />
    </Routes>
  );
};

export default App;
