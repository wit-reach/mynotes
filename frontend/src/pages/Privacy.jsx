import { Link } from 'react-router-dom';

export default function Privacy() {
    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-sm p-8">
                <div className="mb-8">
                    <Link to="/" className="text-indigo-600 hover:text-indigo-800 font-medium">
                        ← Back to Home
                    </Link>
                </div>

                <h1 className="text-3xl font-bold text-gray-900 mb-8">Privacy Policy</h1>

                <div className="prose prose-indigo max-w-none text-gray-600 space-y-6">
                    <p>Last updated: February 4, 2026</p>

                    <h2 className="text-xl font-semibold text-gray-900">1. Information We Collect</h2>
                    <p>
                        We collect information you provide directly to us when you create an account, create content,
                        or communicate with us. This includes your name, email address, password, and any notes
                        or content you create within the application.
                    </p>

                    <h2 className="text-xl font-semibold text-gray-900">2. How We Use Your Information</h2>
                    <p>
                        We use the information we collect to provide, maintain, and improve our services,
                        to process your transactions, to send you related information, and to monitor
                        and analyze trends, usage, and activities in connection with our services.
                    </p>

                    <h2 className="text-xl font-semibold text-gray-900">3. Data Security</h2>
                    <p>
                        We take reasonable measures to help protect information about you from loss, theft,
                        misuse, and unauthorized access, disclosure, alteration, and destruction.
                    </p>

                    <h2 className="text-xl font-semibold text-gray-900">4. Contact Us</h2>
                    <p>
                        If you have any questions about this Privacy Policy, please contact us at support@witreach.com.
                    </p>
                </div>
            </div>
        </div>
    );
}
