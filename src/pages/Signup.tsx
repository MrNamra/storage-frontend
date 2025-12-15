import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Cloud, User, Mail, Lock, ArrowRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { fetchDataFromAPI } from "@/lib/api";
import * as Yup from "yup";
import { useFormik } from "formik";
import { useState } from "react";

export default function SignUp() {
  const navigate = useNavigate();
    const [message, setMessage] = useState();
    const [loading, setLoading] = useState(false);
  

  const loginSchema = Yup.object().shape({
    name: Yup.string().required("Name is required"),
    email: Yup.string()
      .email("Wrong email format")
      .min(3, "Minimum 3 characters")
      .max(50, "Maximum 50 characters")
      .required("Email is required"),
    password: Yup.string()
      .matches(/^\S*$/, "Space not valid in Password.")
      .min(8, 'Minimum 8 characters')
      .max(32, 'Maximum 32 characters')
      .required("Password is required"),
    conpassword: Yup.string()
      .oneOf([Yup.ref("password"), null], "Passwords must match")
      .required("Confirm password is required"),
    terms: Yup.bool().oneOf([true], "You must accept the Terms of Service"),
  });

  const initialValues = {
    name: "",
    email: "",
    password: "",
    conpassword: "",
    terms: false,
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
        };

        setLoading(true);
        fetchDataFromAPI("users/register", "post", body, "")
          .then((response) => {
            console.log("admin login response: ", response);
            navigate("/login");
            setLoading(false);
          })
          .catch((error) => {
            console.log("login error: ", error);
            setMessage(error?.response?.data?.message);
            setLoading(false);


          });
      } catch (error) {
        console.log("catch error: ", error);
        setLoading(false);

      }
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-purple-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center space-x-2">
              <Cloud className="h-8 w-8 text-teal-400" />
              <span className="font-poppins font-bold text-2xl">
                CloudVault
              </span>
            </Link>
            <h2 className="mt-6 text-3xl font-poppins font-bold text-gray-900">
              Create your account
            </h2>
            <p className="mt-2 text-gray-600">
              Start storing your files securely today
            </p>
          </div>

          {message && (
            <div className="text-red-500 flex justify-center text-sm font-medium mt-1 items-center mb-1">
              <span role="alert">{message}</span>
            </div>
          )}

          <form onSubmit={formik.handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label
                htmlFor="name"
                className="text-sm font-medium text-gray-700"
              >
                Full name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={formik.values.name}
                  onChange={(e) => {
                    formik.setFieldValue("name", e.target.value?.trimStart());
                  }}
                  className="pl-10"
                />
              </div>
              {formik.touched.name && formik.errors.name && (
                <div className="text-red-500 text-sm font-medium mt-1">
                  <span role="alert">{formik.errors.name}</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-sm font-medium text-gray-700"
              >
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
                    formik.setFieldValue("email", e.target.value?.trimStart());
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
                className="text-sm font-medium text-gray-700"
              >
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
                      "password",
                      e.target.value?.trimStart()
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
                className="text-sm font-medium text-gray-700"
              >
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
                      "conpassword",
                      e.target.value?.trimStart()
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

            <div className="flex items-center">
              <input
                id="terms"
                name="terms"
                type="checkbox"
                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                checked={formik.values.terms}
                onChange={formik.handleChange}
              />
              <label
                htmlFor="terms"
                className="ml-2 block text-sm text-gray-700"
              >
                I agree to the{" "}
                <Link
                  to="/terms-conditions"
                  className="font-medium text-purple-600 hover:text-purple-500"
                >
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link
                  to="/privacy"
                  className="font-medium text-purple-600 hover:text-purple-500"
                >
                  Privacy Policy
                </Link>
              </label>
            </div>
            {formik.touched.terms && formik.errors.terms && (
              <div className="text-red-500 text-sm font-medium mt-1">
                <span role="alert">{formik.errors.terms}</span>
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
            >
               {loading ? (
                <span className="loader  h-4 w-4 border-2 border-t-transparent border-white rounded-full animate-spin"></span>
              ) : (
                <> Create account   <ArrowRight className="ml-2 h-5 w-5" /></>
              )}
             
            
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{" "}
              <Link
                to="/login"
                className="font-medium text-purple-600 hover:text-purple-500"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
