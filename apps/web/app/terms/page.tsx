export default function TermsPage() {
  return (
    <div className="flex flex-col bg-gray-50">
      {/* Hero Section */}
      <section className="pt-12 pb-12 sm:pt-20 sm:pb-16 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="text-4xl sm:text-5xl font-bold text-teal-900 mb-6">
              Terms of Service
            </h1>
            <p className="text-lg text-gray-700">
              Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </p>
          </div>
        </div>
      </section>

      {/* Terms Content */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <div className="rounded-xl border border-gray-200 bg-white p-8 sm:p-12 shadow-sm">
              <div className="prose prose-lg max-w-none">
                <p className="text-gray-700 leading-relaxed mb-6">
                  Welcome to Savr. By accessing or using our meal planning platform, you agree to be bound by
                  these Terms of Service. Please read them carefully.
                </p>

                <h2 className="text-2xl font-bold text-teal-900 mt-8 mb-4">1. Acceptance of Terms</h2>
                <p className="text-gray-700 leading-relaxed mb-6">
                  By creating an account or using Savr's services, you agree to these Terms of Service and our
                  Privacy Policy. If you do not agree, please do not use our services.
                </p>

                <h2 className="text-2xl font-bold text-teal-900 mt-8 mb-4">2. Description of Service</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  Savr provides an AI-powered meal planning platform that includes:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-6">
                  <li>Personalized meal plan generation</li>
                  <li>Recipe recommendations and storage</li>
                  <li>Pantry inventory management</li>
                  <li>Grocery list creation and tracking</li>
                  <li>Nutritional information and tracking</li>
                  <li>AI chat assistant for meal planning support</li>
                </ul>

                <h2 className="text-2xl font-bold text-teal-900 mt-8 mb-4">3. User Accounts</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  To use certain features of Savr, you must create an account. You agree to:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-6">
                  <li>Provide accurate, current, and complete information</li>
                  <li>Maintain and update your account information</li>
                  <li>Keep your password secure and confidential</li>
                  <li>Notify us immediately of any unauthorized access</li>
                  <li>Be responsible for all activities under your account</li>
                </ul>

                <h2 className="text-2xl font-bold text-teal-900 mt-8 mb-4">4. Subscription and Billing</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  Savr offers both free and paid subscription plans:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-6">
                  <li>Free plans provide limited access to features</li>
                  <li>Premium subscriptions are billed monthly or annually</li>
                  <li>Subscriptions automatically renew unless cancelled</li>
                  <li>Refunds are provided according to our refund policy</li>
                  <li>We reserve the right to change pricing with 30 days notice</li>
                </ul>

                <h2 className="text-2xl font-bold text-teal-900 mt-8 mb-4">5. User Content and Conduct</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  You retain ownership of content you submit to Savr. However, you grant us a license to use,
                  store, and display your content to provide our services. You agree not to:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-6">
                  <li>Violate any laws or regulations</li>
                  <li>Infringe on intellectual property rights</li>
                  <li>Upload malicious code or viruses</li>
                  <li>Attempt to gain unauthorized access to our systems</li>
                  <li>Harass, abuse, or harm other users</li>
                  <li>Use our service for any illegal or unauthorized purpose</li>
                </ul>

                <h2 className="text-2xl font-bold text-teal-900 mt-8 mb-4">6. Intellectual Property</h2>
                <p className="text-gray-700 leading-relaxed mb-6">
                  All content, features, and functionality of Savr, including but not limited to text, graphics,
                  logos, icons, images, and software, are owned by Savr and protected by copyright, trademark,
                  and other intellectual property laws.
                </p>

                <h2 className="text-2xl font-bold text-teal-900 mt-8 mb-4">7. Health and Nutrition Disclaimer</h2>
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-6 mb-6">
                  <p className="text-amber-900 font-semibold mb-2">Important Notice</p>
                  <p className="text-amber-900 text-sm leading-relaxed">
                    Savr provides general meal planning and nutritional information for educational purposes only.
                    Our service is not a substitute for professional medical advice, diagnosis, or treatment.
                    Always consult with a qualified healthcare provider before making significant dietary changes,
                    especially if you have medical conditions or dietary restrictions.
                  </p>
                </div>

                <h2 className="text-2xl font-bold text-teal-900 mt-8 mb-4">8. Disclaimers and Limitations of Liability</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  Savr is provided "as is" without warranties of any kind. We do not guarantee:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-6">
                  <li>Uninterrupted or error-free service</li>
                  <li>Accuracy or reliability of information</li>
                  <li>Specific results from using our service</li>
                  <li>That defects will be corrected</li>
                </ul>
                <p className="text-gray-700 leading-relaxed mb-6">
                  To the fullest extent permitted by law, Savr shall not be liable for any indirect, incidental,
                  special, consequential, or punitive damages resulting from your use of our service.
                </p>

                <h2 className="text-2xl font-bold text-teal-900 mt-8 mb-4">9. Termination</h2>
                <p className="text-gray-700 leading-relaxed mb-6">
                  We reserve the right to suspend or terminate your account at any time for violations of these
                  Terms of Service. You may cancel your account at any time through your account settings.
                </p>

                <h2 className="text-2xl font-bold text-teal-900 mt-8 mb-4">10. Changes to Terms</h2>
                <p className="text-gray-700 leading-relaxed mb-6">
                  We may modify these Terms of Service at any time. We will notify you of material changes via
                  email or through our service. Continued use after changes constitutes acceptance of the new terms.
                </p>

                <h2 className="text-2xl font-bold text-teal-900 mt-8 mb-4">11. Governing Law</h2>
                <p className="text-gray-700 leading-relaxed mb-6">
                  These Terms of Service are governed by the laws of the State of California, without regard to
                  its conflict of law provisions.
                </p>

                <h2 className="text-2xl font-bold text-teal-900 mt-8 mb-4">12. Contact Information</h2>
                <p className="text-gray-700 leading-relaxed mb-6">
                  If you have questions about these Terms of Service, please contact us:
                </p>
                <div className="rounded-lg bg-brand-secondary/10 border border-brand-primary/20 p-6">
                  <p className="text-gray-700">
                    <strong>Email:</strong> legal@savr.com<br />
                    <strong>Mail:</strong> Savr Legal Department, 123 Main Street, San Francisco, CA 94105
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
