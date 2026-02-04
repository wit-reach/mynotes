import { Link } from 'react-router-dom';

export default function Terms() {
    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-sm p-8">
                <div className="mb-8">
                    <Link to="/" className="text-indigo-600 hover:text-indigo-800 font-medium">
                        ← Back to Home
                    </Link>
                </div>

                <h1 className="text-3xl font-bold text-gray-900 mb-8">Terms of Service</h1>

                <div className="prose prose-indigo max-w-none text-gray-600 space-y-6">
                    <p>Last updated: February 4, 2026</p>

                    <h2 className="text-xl font-semibold text-gray-900">1. Acceptance of Terms</h2>
                    <p>
                        By accessing or using our website and services, you agree to be bound by these Terms of Service.
                        If you do not agree to these terms, you may not access or use the services.
                    </p>

                    <h2 className="text-xl font-semibold text-gray-900">2. Account Responsibilities</h2>
                    <p>
                        You are responsible for maintaining the confidentiality of your account password and for all
                        activities that occur under your account. You agree to notify us immediately of any unauthorized
                        use of your account.
                    </p>

                    <h2 className="text-xl font-semibold text-gray-900">3. User Content</h2>
                    <p>
                        You retain ownership of any content you create or upload to the service. You grant us a license
                        to store, retrieve, backup, and display your content as necessary to provide the service.
                    </p>

                    <h2 className="text-xl font-semibold text-gray-900">4. Termination</h2>
                    <p>
                        We reserve the right to terminate or suspend your account and access to the services at our
                        sole discretion, without prior notice or liability, for any reason whatsoever.
                    </p>
                </div>
            </div>
        </div>
    );
}
