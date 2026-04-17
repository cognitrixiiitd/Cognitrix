import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { GraduationCap } from "lucide-react";

export default function Login() {
  const { signIn, signUp } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      if (isSignUp) {
        await signUp(email, password, fullName);
        setMessage("Account created! Check your email to confirm, then sign in.");
        setIsSignUp(false);
      } else {
        await signIn(email, password);
      }
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#00a98d]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <GraduationCap className="w-8 h-8 text-[#00a98d]" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Cognitrix</h1>
          <p className="text-gray-500 mt-1">
            {isSignUp ? "Create your account" : "Sign in to your account"}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00a98d]/20 focus:border-[#00a98d]"
                  placeholder="John Doe"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00a98d]/20 focus:border-[#00a98d]"
                placeholder="you@university.edu"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00a98d]/20 focus:border-[#00a98d]"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-xl">
                {error}
              </div>
            )}
            {message && (
              <div className="text-sm text-green-600 bg-green-50 p-3 rounded-xl">
                {message}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#00a98d] hover:bg-[#008f77] text-white py-2.5 rounded-xl text-sm font-medium"
            >
              {loading ? "Please wait..." : isSignUp ? "Create Account" : "Sign In"}
            </Button>
          </form>

          <div className="mt-6 text-center space-y-2">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError("");
                setMessage("");
              }}
              className="text-sm text-[#00a98d] hover:underline block mx-auto"
            >
              {isSignUp
                ? "Already have an account? Sign in"
                : "Don't have an account? Sign up"}
            </button>
            {!isSignUp && (
              <Link
                to="/ProfessorSignUp"
                className="text-sm text-gray-500 hover:text-[#00a98d] hover:underline block transition-colors"
              >
                Apply as Professor →
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
