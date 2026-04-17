import React, { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { GraduationCap, ArrowLeft, CheckCircle2 } from "lucide-react";

export default function ProfessorSignUp() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("");
  const [designation, setDesignation] = useState("");
  const [institution, setInstitution] = useState("");
  const [coursesPlan, setCoursesPlan] = useState("");
  const [reason, setReason] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { error: insertError } = await supabase
        .from("professor_applications")
        .insert({
          full_name: fullName.trim(),
          email: email.trim().toLowerCase(),
          department: department.trim(),
          designation: designation.trim(),
          institution: institution.trim(),
          courses_plan: coursesPlan.trim(),
          reason: reason.trim() || null,
          status: "pending",
        });

      if (insertError) throw insertError;
      setSubmitted(true);
    } catch (err) {
      console.error("[ProfessorSignUp] Submit error:", err);
      if (err.message?.includes("duplicate key") || err.code === "23505") {
        setError("An application with this email address already exists.");
      } else {
        setError(err.message || "Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10">
            <div className="w-16 h-16 bg-[#00a98d]/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-8 h-8 text-[#00a98d]" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Application Submitted
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed mb-2">
              Your application has been submitted successfully.
            </p>
            <p className="text-gray-600 text-sm leading-relaxed mb-6">
              Our team will review your request and get back to you within 1 business day.
            </p>
            <p className="text-gray-500 text-sm">
              For any queries, please write to us at{" "}
              <a
                href="mailto:cognitrix.iiitd@gmail.com"
                className="text-[#00a98d] hover:underline font-medium"
              >
                cognitrix.iiitd@gmail.com
              </a>
            </p>
            <Link
              to="/Login"
              className="inline-flex items-center gap-1.5 text-sm text-[#00a98d] hover:underline mt-8"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="mb-4">
          <Link
            to="/Login"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Sign In
          </Link>
        </div>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#00a98d]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <GraduationCap className="w-8 h-8 text-[#00a98d]" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Apply as Professor</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Submit your application to teach on Cognitrix
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00a98d]/20 focus:border-[#00a98d]"
                placeholder="Dr. Jane Smith"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00a98d]/20 focus:border-[#00a98d]"
                placeholder="jane.smith@university.edu"
              />
            </div>

            {/* Department */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Department <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00a98d]/20 focus:border-[#00a98d]"
                placeholder="Computer Science"
              />
            </div>

            {/* Designation */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Designation <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00a98d]/20 focus:border-[#00a98d]"
                placeholder="e.g. Assistant Professor, Associate Professor"
              />
            </div>

            {/* Institution */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Institution <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00a98d]/20 focus:border-[#00a98d]"
                placeholder="e.g. IIIT Delhi"
              />
            </div>

            {/* Courses Plan */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Courses You Plan to Teach <span className="text-red-400">*</span>
              </label>
              <textarea
                value={coursesPlan}
                onChange={(e) => setCoursesPlan(e.target.value)}
                required
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00a98d]/20 focus:border-[#00a98d] resize-none"
                placeholder="Describe the courses you plan to create and teach..."
              />
            </div>

            {/* Reason */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Why do you want to use Cognitrix?{" "}
                <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00a98d]/20 focus:border-[#00a98d] resize-none"
                placeholder="Tell us why you'd like to join the platform..."
              />
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-xl">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#00a98d] hover:bg-[#008f77] text-white py-2.5 rounded-xl text-sm font-medium"
            >
              {loading ? "Submitting..." : "Submit Application"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
