const { execSync } = require('child_process');
const fs = require('fs');

// Set environment variables to suppress warnings
process.env.GENERATE_SOURCEMAP = 'false';
process.env.CI = 'false';

console.log('🚀 Starting clean production build...');

try {
  // Run the build command
  const buildOutput = execSync('react-scripts build', { 
    encoding: 'utf8',
    stdio: 'pipe'
  });
  
  // Filter out the specific source map warning
  const filteredOutput = buildOutput
    .split('\n')
    .filter(line => !line.includes('Failed to parse source map from') && 
                   !line.includes('es6-promise.map'))
    .join('\n');
  
  console.log(filteredOutput);
  console.log('\n✅ Build completed successfully!');
  console.log('📁 Build files are ready in the /build directory');
  
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}
