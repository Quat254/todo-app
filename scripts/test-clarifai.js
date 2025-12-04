// Simple Clarifai API key test script.
// It calls the same face-detection model used in the app with a sample image URL.

const CLARIFAI_API_KEY = process.env.EXPO_PUBLIC_CLARIFAI_API_KEY;
const FACE_MODEL_VERSION_ID = '6dc7e46bc9124c5c8824be4822abe105';

async function main() {
  if (!CLARIFAI_API_KEY) {
    console.error(
      'EXPO_PUBLIC_CLARIFAI_API_KEY is not set. Please set it in your environment, e.g.:\n' +
        '  PowerShell: $env:EXPO_PUBLIC_CLARIFAI_API_KEY="your_key_here"; node scripts/test-clarifai.js'
    );
    process.exit(1);
  }

  try {
    const response = await fetch(
      `https://api.clarifai.com/v2/models/face-detection/versions/${FACE_MODEL_VERSION_ID}/outputs`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Key ${CLARIFAI_API_KEY}`,
        },
        body: JSON.stringify({
          inputs: [
            {
              data: {
                image: {
                  // Public Clarifai sample image with a face
                  url: 'https://samples.clarifai.com/face-det.jpg',
                },
              },
            },
          ],
        }),
      }
    );

    console.log('HTTP status:', response.status);

    const text = await response.text();

    if (!response.ok) {
      console.error('Clarifai error response:', text);
      process.exit(1);
    }

    let json;
    try {
      json = JSON.parse(text);
    } catch {
      console.error('Could not parse JSON from Clarifai response.');
      process.exit(1);
    }

    const regions = json?.outputs?.[0]?.data?.regions || [];
    console.log(`Clarifai request succeeded. Faces detected: ${regions.length}`);
    process.exit(0);
  } catch (err) {
    console.error('Network or runtime error while calling Clarifai:', err);
    process.exit(1);
  }
}

main();


