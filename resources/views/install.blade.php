<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MyNotes Installer</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>

<body class="bg-gray-100 min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg">
        <div>
            <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
                Installation Setup
            </h2>
            <p class="mt-2 text-center text-sm text-gray-600">
                Configure your database connection
            </p>
        </div>
        <form class="mt-8 space-y-6" id="installForm">
            <div class="rounded-md shadow-sm -space-y-px">
                <div class="mb-4">
                    <label for="app_url" class="block text-sm font-medium text-gray-700 mb-1">App URL</label>
                    <input id="app_url" name="app_url" type="url" required
                        class="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="https://yourdomain.com" value="{{ url('/') }}">
                </div>

                <div class="mb-4">
                    <label for="db_host" class="block text-sm font-medium text-gray-700 mb-1">Database Host</label>
                    <input id="db_host" name="db_host" type="text" required
                        class="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="127.0.0.1" value="127.0.0.1">
                </div>

                <div class="mb-4">
                    <label for="db_port" class="block text-sm font-medium text-gray-700 mb-1">Database Port</label>
                    <input id="db_port" name="db_port" type="text" required
                        class="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="3306" value="3306">
                </div>

                <div class="mb-4">
                    <label for="db_name" class="block text-sm font-medium text-gray-700 mb-1">Database Name</label>
                    <input id="db_name" name="db_name" type="text" required
                        class="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="u12345_mynotes">
                </div>

                <div class="mb-4">
                    <label for="db_username" class="block text-sm font-medium text-gray-700 mb-1">Database
                        Username</label>
                    <input id="db_username" name="db_username" type="text" required
                        class="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="u12345_user">
                </div>

                <div class="mb-4">
                    <label for="db_password" class="block text-sm font-medium text-gray-700 mb-1">Database
                        Password</label>
                    <input id="db_password" name="db_password" type="password"
                        class="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="********">
                </div>
            </div>

            <div>
                <button type="submit" id="submitBtn"
                    class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                    Run Installer
                </button>
            </div>

            <div id="status" class="hidden mt-4 p-4 rounded-md"></div>
        </form>
    </div>

    <script>
        document.getElementById('installForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('submitBtn');
            const status = document.getElementById('status');
            const form = new FormData(e.target);
            const data = Object.fromEntries(form.entries());

            btn.disabled = true;
            btn.innerHTML = 'Installing... (Do not close)';
            status.className = 'hidden mt-4 p-4 rounded-md';

            try {
                const response = await fetch('/install/setup', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                status.classList.remove('hidden');
                if (response.ok) {
                    status.classList.add('bg-green-100', 'text-green-700');
                    status.innerHTML = '<strong>Success!</strong> Application installed. Redirecting...';
                    setTimeout(() => window.location.href = '/', 2000);
                } else {
                    status.classList.add('bg-red-100', 'text-red-700');
                    status.innerHTML = '<strong>Error:</strong> ' + (result.error || 'Unknown error');
                    btn.disabled = false;
                    btn.innerHTML = 'Run Installer';
                }
            } catch (error) {
                // If JSON parse fails, it might be a timeout or 500 error after migration succeeded.
                // We'll try to redirect anyway.
                console.error(error);
                status.classList.remove('hidden');
                status.classList.add('bg-yellow-100', 'text-yellow-700');
                status.innerHTML = '<strong>Installation finalized.</strong> Redirecting to home in 3 seconds...';
                
                setTimeout(() => window.location.href = '/', 3000);
            }
        });
    </script>
</body>

</html>