export default function TestTailwind() {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
          Tailwind CSS Test
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Test Card 1 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Basic Styling
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              This card tests basic Tailwind classes like background colors, text colors, and spacing.
            </p>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
              Test Button
            </button>
          </div>

          {/* Test Card 2 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Colors & States
            </h2>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                <span className="text-red-600 dark:text-red-400">Red</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                <span className="text-green-600 dark:text-green-400">Green</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                <span className="text-blue-600 dark:text-blue-400">Blue</span>
              </div>
            </div>
          </div>

          {/* Test Card 3 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Responsive Design
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              This card should be responsive and adapt to different screen sizes.
            </p>
            <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              <p>Mobile: 1 column</p>
              <p>Tablet: 2 columns</p>
              <p>Desktop: 3 columns</p>
            </div>
          </div>
        </div>

        {/* Status Indicator */}
        <div className="mt-8 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-green-800 dark:text-green-200 font-medium">
              Tailwind CSS is working correctly!
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}