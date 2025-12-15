import React, {useEffect, useState} from 'react';
import {Cloud, Lock, Search, User} from 'lucide-react';
import {Input} from '@/components/ui/input';
import {Link, useNavigate} from 'react-router-dom';
import constants, {getUser} from '@/lib/constants';
import {Button} from '../ui/button';
import {fetchDataFromAPI} from '@/lib/api';
import * as Yup from 'yup';
import {useFormik} from 'formik';
export default function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [showModal, setShowModal] = useState(false); // State for modal visibility
  const [loading, setLoading] = useState(false);
  const [userID, setUserId] = useState('');
  const navigate = useNavigate();
  const user = JSON.parse(getUser());

  const toggleMenu = () => setShowMenu((prev) => !prev);
  const toggleModal = () => setShowModal((prev) => !prev);

  const handleLogout = () => {
    localStorage.removeItem(constants.USER);
    navigate('/');
    window.location.reload();
    setShowMenu(false);
  };

  const handleEditProfile = () => {
    setShowMenu(false);
    toggleModal(); // Open the modal
  };

  useEffect(() => {
    fetchDataFromAPI('users/profile', 'get', '', user)
      .then((res) => {
        console.log('res', res);
        setUserId(res.user?._id);
        formik.setFieldValue('name', res?.user?.name);
        formik.setFieldValue('email', res?.user?.email);
      })
      .catch((error) => {
        console.log('error', error);

        if (error?.status === 401) {
          // Perform logout
          localStorage.removeItem(constants.USER);
          navigate('/');
          window.location.reload();
        }
      });
  }, [showModal]);

  const loginSchema = Yup.object().shape({
    name: Yup.string().required('Name is required'),
    email: Yup.string()
      .email('Wrong email format')
      .min(3, 'Minimum 3 characters')
      .max(50, 'Maximum 50 characters')
      .required('Email is required'),
    password: Yup.string()
      .matches(/^\S*$/, 'Space not valid in Password.')
      .min(8, 'Minimum 8 characters')
      .max(32, 'Maximum 32 characters')
      .notRequired(''),
    conpassword: Yup.string()
      .oneOf([Yup.ref('password'), null], 'Passwords must match')
      .notRequired(''),
  });

  const initialValues = {
    name: '',
    email: '',
    password: '',
    conpassword: '',
  };

  const formik = useFormik({
    initialValues,
    validationSchema: loginSchema,
    onSubmit: async (values) => {
      try {
        const body = {
          name: values.name,
          email: values?.email,
          password: values?.password,
          confirmPassword: values?.password,
        };

        setLoading(true);
        fetchDataFromAPI(`users/profile`, 'put', body, user)
          .then((response) => {
            console.log('admin login response: ', response);
            setLoading(false);
            toggleModal(); // Open the modal
            setShowMenu(false);
          })
          .catch((error) => {
            console.log('login error: ', error);
            setLoading(false);
          });
      } catch (error) {
        console.log('catch error: ', error);
        setLoading(false);
      }
    },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <nav className="bg-white shadow-sm fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/dashboard" className="flex items-center space-x-2">
              <Cloud className="h-8 w-8 text-teal-400" />
              <span className="font-poppins font-bold text-xl">CloudVault</span>
            </Link>

            {/* Search Bar */}
            
            {/* <div className="max-w-xl w-full mx-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  type="search"
                  placeholder="Search files and folders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-full"
                />
              </div>
            </div> */}

            {/* User Actions */}
            <div className="flex items-center space-x-4">
              <div className="relative">
                {/* Profile Button */}
            
                    <button
                    className="flex items-center space-x-3 focus:outline-none"
                    onClick={toggleMenu}>
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                      <User className="h-5 w-5 text-purple-600" />
                    </div>
                  </button>
                

                {/* Dropdown Menu */}
                {showMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                    <button
                      onClick={handleEditProfile}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 focus:outline-none">
                      Edit Profile
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 focus:outline-none">
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-16">
        <div className="max-w-7xl mx-auto px-4 py-8">{children}</div>
      </main>

      {/* Edit Profile Modal */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-96">
            <h2 className="text-xl font-semibold mb-4">Edit Profile</h2>
            <form onSubmit={formik.handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">
                  Name
                </label>
                <Input
                  type="text"
                  placeholder="Your Name"
                  className="w-full"
                  value={formik.values.name}
                  onChange={(e) => {
                    formik.setFieldValue('name', e.target.value?.trimStart());
                  }}
                />
              </div>
              {formik.touched.name && formik.errors.name && (
                <div className="text-red-500 text-sm font-medium mt-1">
                  <span role="alert">{formik.errors.name}</span>
                </div>
              )}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <Input
                  type="email"
                  placeholder="Your Email"
                  className="w-full"
                  value={formik.values.email}
                  onChange={(e) => {
                    formik.setFieldValue('email', e.target.value?.trimStart());
                  }}
                />
              </div>
              {formik.touched.email && formik.errors.email && (
                <div className="text-red-500 text-sm font-medium mt-1">
                  <span role="alert">{formik.errors.email}</span>
                </div>
              )}

              <div className="space-y-2">
                <label
                  htmlFor="confirm-password"
                  className="text-sm font-medium text-gray-700">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={formik.values.password}
                    onChange={(e) => {
                      formik.setFieldValue(
                        'password',
                        e.target.value?.trimStart(),
                      );
                    }}
                    className="pl-10"
                  />
                </div>
                {formik.touched.password && formik.errors.password && (
                  <div className="text-red-500 text-sm font-medium mt-1">
                    <span role="alert">{formik.errors.password}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="confirm-password"
                  className="text-sm font-medium text-gray-700">
                  Confirm password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="••••••••"
                    value={formik.values.conpassword}
                    onChange={(e) => {
                      formik.setFieldValue(
                        'conpassword',
                        e.target.value?.trimStart(),
                      );
                    }}
                    className="pl-10"
                  />
                </div>
                {formik.touched.conpassword && formik.errors.conpassword && (
                  <div className="text-red-500 text-sm font-medium mt-1">
                    <span role="alert">{formik.errors.conpassword}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-end mt-6 space-x-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    formik.resetForm(); // Resets the form to its initial values
                    toggleModal(); // Closes the modal
                  }}>
                  Cancel
                </Button>

                <Button
                  className="bg-purple-600 hover:bg-purple-700 flex items-center justify-center"
                  disabled={loading} // Disable button while loading
                >
                  {loading ? (
                    <span className="loader  h-4 w-4 border-2 border-t-transparent border-white rounded-full animate-spin"></span>
                  ) : (
                    'Edit'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
