require('dotenv').config();
const sdk = require('microsoft-cognitiveservices-speech-sdk');
const fs = require('fs');

console.log('Testing Azure TTS credentials...');
console.log('Key (first 10 chars):', process.env.AZURE_SPEECH_KEY?.substring(0, 10) + '...');
console.log('Region:', process.env.AZURE_SPEECH_REGION);

const speechConfig = sdk.SpeechConfig.fromSubscription(
  process.env.AZURE_SPEECH_KEY,
  process.env.AZURE_SPEECH_REGION
);

speechConfig.speechSynthesisVoiceName = 'en-US-JennyNeural';

const audioConfig = sdk.AudioConfig.fromAudioFileOutput('/tmp/test-tts-output.mp3');
const synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);

const text = 'Hello, this is a test of Azure Text to Speech from Ridecast.';

console.log('\nConverting text to speech...');
console.log('Text:', text);

synthesizer.speakTextAsync(
  text,
  result => {
    if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
      console.log('\n✅ Azure TTS Success!');
      console.log('Audio duration:', result.audioDuration / 10000000, 'seconds');
      console.log('Audio saved to: /tmp/test-tts-output.mp3');
      
      const stats = fs.statSync('/tmp/test-tts-output.mp3');
      console.log('File size:', stats.size, 'bytes');
      
      synthesizer.close();
      process.exit(0);
    } else {
      console.error('\n❌ Azure TTS Failed');
      console.error('Reason:', sdk.ResultReason[result.reason]);
      console.error('Error details:', result.errorDetails);
      
      synthesizer.close();
      process.exit(1);
    }
  },
  error => {
    console.error('\n❌ Azure TTS Error:', error);
    synthesizer.close();
    process.exit(1);
  }
);
