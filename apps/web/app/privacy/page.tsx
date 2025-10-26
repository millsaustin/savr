export default function PrivacyPage() {
  return (
    <div className="flex flex-col bg-gray-50">
      {/* Hero Section */}
      <section className="pt-12 pb-12 sm:pt-20 sm:pb-16 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="text-4xl sm:text-5xl font-bold text-teal-900 mb-6">
              Privacy Policy
            </h1>
            <p className="text-lg text-gray-700">
              Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </p>
          </div>
        </div>
      </section>

      {/* Privacy Content */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <div className="rounded-xl border border-gray-200 bg-white p-8 sm:p-12 shadow-sm">
              <div className="prose prose-lg max-w-none">
                <p className="text-gray-700 leading-relaxed mb-6">
                  At Savr, we take your privacy seriously. This Privacy Policy explains how we collect, use,
                  disclose, and safeguard your information when you use our meal planning platform.
                </p>

                <h2 className="text-2xl font-bold text-teal-900 mt-8 mb-4">Information We Collect</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  We collect information that you provide directly to us, including:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-6">
                  <li>Account information (name, email address, password)</li>
                  <li>Dietary preferences and restrictions</li>
                  <li>Nutritional goals and health information</li>
                  <li>Pantry inventory and grocery lists</li>
                  <li>Recipe favorites and meal plans</li>
                  <li>Communications with our support team</li>
                </ul>

                <h2 className="text-2xl font-bold text-teal-900 mt-8 mb-4">How We Use Your Information</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  We use the information we collect to:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-6">
                  <li>Provide, maintain, and improve our services</li>
                  <li>Generate personalized meal plans and recipe recommendations</li>
                  <li>Send you updates, newsletters, and promotional materials (with your consent)</li>
                  <li>Respond to your comments, questions, and customer service requests</li>
                  <li>Monitor and analyze usage patterns and trends</li>
                  <li>Detect, prevent, and address technical issues and security threats</li>
                </ul>

                <h2 className="text-2xl font-bold text-teal-900 mt-8 mb-4">Information Sharing and Disclosure</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  We do not sell your personal information. We may share your information only in the following circumstances:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-6">
                  <li><strong>With your consent:</strong> We may share information when you give us permission</li>
                  <li><strong>Service providers:</strong> We may share information with third-party vendors who perform services on our behalf</li>
                  <li><strong>Legal requirements:</strong> We may disclose information if required by law or to protect our rights</li>
                  <li><strong>Business transfers:</strong> Information may be transferred in connection with a merger or acquisition</li>
                </ul>

                <h2 className="text-2xl font-bold text-teal-900 mt-8 mb-4">Data Security</h2>
                <p className="text-gray-700 leading-relaxed mb-6">
                  We implement appropriate technical and organizational measures to protect your personal information
                  against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission
                  over the Internet or electronic storage is 100% secure.
                </p>

                <h2 className="text-2xl font-bold text-teal-900 mt-8 mb-4">Your Rights and Choices</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  You have the following rights regarding your personal information:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-6">
                  <li><strong>Access:</strong> Request access to the personal information we hold about you</li>
                  <li><strong>Correction:</strong> Request correction of inaccurate or incomplete information</li>
                  <li><strong>Deletion:</strong> Request deletion of your personal information</li>
                  <li><strong>Opt-out:</strong> Unsubscribe from marketing communications at any time</li>
                  <li><strong>Data portability:</strong> Request a copy of your data in a machine-readable format</li>
                </ul>

                <h2 className="text-2xl font-bold text-teal-900 mt-8 mb-4">Cookies and Tracking Technologies</h2>
                <p className="text-gray-700 leading-relaxed mb-6">
                  We use cookies and similar tracking technologies to collect information about your browsing activities
                  and to improve your experience. You can control cookies through your browser settings.
                </p>

                <h2 className="text-2xl font-bold text-teal-900 mt-8 mb-4">Children's Privacy</h2>
                <p className="text-gray-700 leading-relaxed mb-6">
                  Our services are not intended for children under 13 years of age. We do not knowingly collect
                  personal information from children under 13.
                </p>

                <h2 className="text-2xl font-bold text-teal-900 mt-8 mb-4">Changes to This Policy</h2>
                <p className="text-gray-700 leading-relaxed mb-6">
                  We may update this Privacy Policy from time to time. We will notify you of any changes by posting
                  the new policy on this page and updating the "Last updated" date.
                </p>

                <h2 className="text-2xl font-bold text-teal-900 mt-8 mb-4">Contact Us</h2>
                <p className="text-gray-700 leading-relaxed mb-6">
                  If you have any questions about this Privacy Policy, please contact us at:
                </p>
                <div className="rounded-lg bg-brand-secondary/10 border border-brand-primary/20 p-6">
                  <p className="text-gray-700">
                    <strong>Email:</strong> privacy@savr.com<br />
                    <strong>Mail:</strong> Savr Privacy Team, 123 Main Street, San Francisco, CA 94105
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
