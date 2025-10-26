"use client";

import { useState } from "react";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");

    // Simulate form submission - replace with actual API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setStatus("success");

    // Reset form after 3 seconds
    setTimeout(() => {
      setFormData({ name: "", email: "", subject: "", message: "" });
      setStatus("idle");
    }, 3000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="flex flex-col bg-gray-50">
      {/* Hero Section */}
      <section className="pt-12 pb-12 sm:pt-20 sm:pb-16 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="text-4xl sm:text-5xl font-bold text-teal-900 mb-6">
              Get in Touch
            </h1>
            <p className="text-lg sm:text-xl text-gray-700 max-w-3xl mx-auto leading-relaxed">
              Have questions, feedback, or need help? We'd love to hear from you.
              Our team typically responds within 24 hours.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Form & Info Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="grid gap-12 lg:grid-cols-3">
              {/* Contact Form */}
              <div className="lg:col-span-2">
                <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
                  <h2 className="text-2xl font-bold text-teal-900 mb-6">Send us a message</h2>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
                        Name
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                        placeholder="Your name"
                      />
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                        placeholder="your@email.com"
                      />
                    </div>

                    <div>
                      <label htmlFor="subject" className="block text-sm font-semibold text-gray-700 mb-2">
                        Subject
                      </label>
                      <select
                        id="subject"
                        name="subject"
                        value={formData.subject}
                        onChange={handleChange}
                        required
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                      >
                        <option value="">Select a subject</option>
                        <option value="general">General Inquiry</option>
                        <option value="support">Technical Support</option>
                        <option value="feedback">Feedback</option>
                        <option value="business">Business/Partnership</option>
                        <option value="bug">Report a Bug</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="message" className="block text-sm font-semibold text-gray-700 mb-2">
                        Message
                      </label>
                      <textarea
                        id="message"
                        name="message"
                        value={formData.message}
                        onChange={handleChange}
                        required
                        rows={6}
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20 resize-none"
                        placeholder="Tell us what's on your mind..."
                      />
                    </div>

                    {status === "success" && (
                      <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-green-800">
                        <p className="font-semibold">Message sent successfully!</p>
                        <p className="text-sm mt-1">We'll get back to you soon.</p>
                      </div>
                    )}

                    {status === "error" && (
                      <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-800">
                        <p className="font-semibold">Something went wrong.</p>
                        <p className="text-sm mt-1">Please try again later.</p>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={status === "sending"}
                      className="w-full rounded-lg bg-gradient-to-r from-brand-primary to-brand-dark px-6 py-3 font-semibold text-white shadow-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      {status === "sending" ? "Sending..." : "Send Message"}
                    </button>
                  </form>
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-6">
                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="flex-shrink-0">
                      <svg className="h-6 w-6 text-brand-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-teal-900 mb-1">Email</h3>
                      <p className="text-gray-700 text-sm">support@savr.com</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="flex-shrink-0">
                      <svg className="h-6 w-6 text-brand-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-teal-900 mb-1">Response Time</h3>
                      <p className="text-gray-700 text-sm">Within 24 hours</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-brand-primary/30 bg-brand-secondary/10 p-6">
                  <h3 className="font-semibold text-teal-900 mb-2">Need immediate help?</h3>
                  <p className="text-gray-700 text-sm mb-4">
                    Check out our FAQ section for quick answers to common questions.
                  </p>
                  <a
                    href="#"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-brand-primary hover:underline"
                  >
                    Visit FAQ
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
