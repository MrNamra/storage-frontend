import {motion} from 'framer-motion';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Cloud, Mail, Lock} from 'lucide-react';
import {Link, useNavigate} from 'react-router-dom';

import * as Yup from 'yup';
import {useFormik} from 'formik';
import {fetchDataFromAPI} from '@/lib/api';
import {useEffect, useState} from 'react';
import constants, {saveUserLocally} from '@/lib/constants';

export default function Login() {
  const navigate = useNavigate();

  const [message, setMessage] = useState();
  const [loading, setLoading] = useState(false);

  const loginSchema = Yup.object().shape({
    email: Yup.string()
      .email('Wrong email format')
      .min(3, 'Minimum 3 characters')
      .max(50, 'Maximum 50 characters')
      .required('Email is required'),
    password: Yup.string()
      .matches(/^\S*$/, 'Space not valid in Password.')
      .min(3, 'Minimum 3 characters')
      .max(50, 'Maximum 50 characters')
      .required('Password is required'),
  });

  const initialValues = {
    email: '',
    password: '',
  };

  const formik = useFormik({
    initialValues,
    validationSchema: loginSchema,
    onSubmit: async (values) => {
      try {
        const body = {
          email: values?.email,
          password: values?.password,
        };
        setLoading(true);
        fetchDataFromAPI('login', 'post', body, '')
          .then((response:any) => {
            console.log('admin login response: ', response);
            saveUserLocally(JSON.stringify(response?.data?.token));
            setLoading(false);

            navigate('/dashboard');
          })
          .catch((error) => {
            setLoading(false);
            console.log('login error: ', error);
            setMessage(error?.response?.data?.message);
          });
      } catch (error) {
        console.log('catch error: ', error);
        setLoading(false);
      }
    },
  });

  useEffect(() => {
    const USER = localStorage.getItem(constants.USER);
    if (USER) {
      navigate('/dashboard');
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-purple-50 flex items-center justify-center p-4">
      <motion.div
        initial={{opacity: 0, y: 20}}
        animate={{opacity: 1, y: 0}}
        transition={{duration: 0.5}}
        className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center space-x-2">
              <Cloud className="h-8 w-8 text-teal-400" />
              <span className="font-poppins font-bold text-2xl">
                CloudVault
              </span>
            </Link>
            <h2 className="mt-6 text-3xl font-poppins font-bold text-gray-900">
              Welcome back
            </h2>
            <p className="mt-2 text-gray-600">
              Sign in to access your secure storage
            </p>
          </div>
          {message && (
            <div className="text-red-500 flex justify-center text-sm font-medium mt-1 items-center mb-1">
              <span role="alert">{message}</span>
            </div>
          )}

          <form className="space-y-6" onSubmit={formik.handleSubmit}>
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formik.values.email}
                  onChange={(e) => {
                    formik.setFieldValue('email', e.target.value?.trimStart());
                  }}
                  className="pl-10"
                />
              </div>
              {formik.touched.email && formik.errors.email && (
                <div className="text-red-500 text-sm font-medium mt-1">
                  <span role="alert">{formik.errors.email}</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label
                htmlFor="password"
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

            <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white">
              {loading ? (
                <span className="loader  h-4 w-4 border-2 border-t-transparent border-white rounded-full animate-spin"></span>
              ) : (
                <>Sign in</>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Link
                to="/signup"
                className="font-medium text-purple-600 hover:text-purple-500">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
